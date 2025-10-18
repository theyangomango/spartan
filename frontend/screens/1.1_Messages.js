import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MessageCard from "../components/1.1_Messages/MessageCard";
import MessagesHeader from "../components/1.1_Messages/MessagesHeader";
import CreateGroupChatBottomSheet from "../components/1.1_Messages/CreateGroupChatBottomSheet";
import createChat from "../../backend/messages/createChat";
import makeID from "../../backend/helper/makeID";
import arrayAppend from "../../backend/helper/firebase/arrayAppend";
import scaleSize from "../helper/scaleSize";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { useFocusEffect } from '@react-navigation/native';
import updateDocMerge from "../../backend/helper/firebase/updateDoc";
import theme from "../theme/mfpDark";
import {
    getMessagesCache,
    getLatestByCidCache,
    hydrateMessagesCache,
    mergeLatestBatchIntoCache,
    subscribeMessagesCache,
} from "../state/messagesCache";
import { ensureMessageListener, syncMessageListeners } from "../logic/messagesPreloader";
import { openActiveWorkout } from "../workout/workoutActions";

export default function Messages({ navigation, route }) {
    const userData = global.userData;
    const insets = useSafeAreaInsets();
    const [chats, setChats] = useState(() => getMessagesCache());
    const [latestByCid, setLatestByCid] = useState(() => getLatestByCidCache());
    const [scope, setScope] = useState("All");
    const [isCreateGroupChatBottomSheetVisible, setIsCreateGroupChatBottomSheetVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeMessagesCache((messages, latest) => {
            setChats(messages);
            setLatestByCid(latest);
        });
        return unsubscribe;
    }, []);

    // Load from route.params once (initial chat metadata)
    useEffect(() => {
        const incoming = route?.params?.messages;
        if (!Array.isArray(incoming)) return;

        const existingMessages = getMessagesCache();
        const existingLatest = getLatestByCidCache();

        const enriched = incoming
            .map((chat) => {
                if (!chat || typeof chat !== 'object') return null;
                const cid = String(chat.cid || chat.mid || chat.id || '');
                if (!cid) return null;

                const cachedLatest = Array.isArray(existingLatest[cid]) ? existingLatest[cid] : [];
                const cachedChat = existingMessages.find((c) => c.cid === cid);
                const payloadContent = Array.isArray(chat.content) ? chat.content : [];
                const cachedContent = Array.isArray(cachedChat?.content) ? cachedChat.content : [];

                const resolvedContent = cachedLatest.length > 0
                    ? cachedLatest
                    : (payloadContent.length > 0 ? payloadContent : cachedContent);

                return {
                    ...chat,
                    cid,
                    content: resolvedContent,
                };
            })
            .filter(Boolean);

        const normalized = hydrateMessagesCache(enriched);
        syncMessageListeners(normalized.map((chat) => chat.cid));
        setChats(normalized);
        setLatestByCid(getLatestByCidCache());
    }, [route?.params?.messages]);

    // Live snapshot: Listen for latest message in each chat
    // Live snapshot: listen for latest message per chat, but update by cid (not index) and batch updates
    useEffect(() => {
        if (!Array.isArray(chats) || chats.length === 0) return;
        const unsubscribes = [];
        const bufferRef = { updates: Object.create(null) };
        let raf = null;

        const flush = () => {
            raf = null;
            if (Object.keys(bufferRef.updates).length === 0) return;
            mergeLatestBatchIntoCache(bufferRef.updates);
            bufferRef.updates = Object.create(null);
        };

        chats.forEach((chat) => {
            const contentRef = collection(db, "messages", chat.cid, "content");
            const q = query(contentRef, orderBy("timestamp", "desc"));
            const unsub = onSnapshot(q, (snapshot) => {
                const latestMessage = snapshot.docs[0]?.data() || null;
                bufferRef.updates[chat.cid] = latestMessage ? [latestMessage] : [];
                if (!raf) raf = requestAnimationFrame(flush);
            });
            unsubscribes.push(unsub);
        });

        return () => {
            if (raf) cancelAnimationFrame(raf);
            unsubscribes.forEach((u) => u && u());
        };
    }, [chats.map((c) => c.cid).join("|")]);

    // Baseline protection: if navigated before feed seeds messages,
    // hydrate the chat list directly from the user's doc once available.
    useEffect(() => {
        let unsubUser = null;
        let pollId = null;
        let cancelled = false;

        const attach = (uid) => {
            try {
                const userRef = doc(db, 'users', uid);
                unsubUser = onSnapshot(userRef, async (snap) => {
                    if (cancelled) return;
                    const data = snap.data() || {};
                    const arr = Array.isArray(data.messages) ? data.messages : [];
                    if (!arr.length) {
                        const cleared = hydrateMessagesCache([]);
                        syncMessageListeners([]);
                        setChats(cleared);
                        setLatestByCid(getLatestByCidCache());
                        return;
                    }

                    // Get chat docs for each mid; skip ones we already have
                    const mids = Array.from(new Set(arr.map((m) => m?.mid).filter(Boolean))).map((mid) => String(mid));
                    const cached = getMessagesCache();
                    const have = new Set(cached.map((c) => c?.cid).filter(Boolean));
                    const need = mids.filter((mid) => !have.has(mid));

                    const fetched = await Promise.all(
                        need.map(async (mid) => {
                            try {
                                const cRef = doc(db, 'messages', mid);
                                const d = await getDoc(cRef);
                                if (!d.exists()) return null;
                                const docData = d.data() || {};
                                return {
                                    ...docData,
                                    cid: docData?.cid || mid,
                                    content: Array.isArray(docData?.content) ? docData.content : [],
                                };
                            } catch {
                                return null;
                            }
                        })
                    );

                    // Merge with any existing cached chats and keep order based on mids
                    const byCid = new Map(cached.map((c) => [c.cid, c]));
                    fetched.filter(Boolean).forEach((chat) => {
                        const cid = String(chat?.cid || '');
                        if (!cid) return;
                        const content = Array.isArray(chat.content) ? chat.content : [];
                        byCid.set(cid, { ...chat, cid, content });
                    });
                    const merged = mids
                        .map((mid) => {
                            const cid = String(mid || '');
                            const entry = byCid.get(cid);
                            if (!entry) return null;
                            const content = Array.isArray(entry.content) ? entry.content : [];
                            return { ...entry, cid, content };
                        })
                        .filter(Boolean);

                    const normalized = hydrateMessagesCache(merged);
                    syncMessageListeners(normalized.map((chat) => chat.cid));
                    setChats(normalized);
                    setLatestByCid(getLatestByCidCache());
                });
            } catch {}
        };

        // If already seeded via route or cache, skip baseline attach
        if (Array.isArray(route?.params?.messages) || getMessagesCache().length > 0) {
            return () => {};
        }

        const uidNow = global?.userData?.uid;
        if (uidNow) {
            attach(uidNow);
        } else {
            // Poll briefly until uid becomes available (app hydration)
            let tries = 0;
            pollId = setInterval(() => {
                const uid = global?.userData?.uid;
                if (uid) {
                    clearInterval(pollId);
                    pollId = null;
                    attach(uid);
                } else if (++tries > 50) { // ~5s
                    clearInterval(pollId);
                    pollId = null;
                }
            }, 100);
        }

        return () => {
            cancelled = true;
            try { if (unsubUser) unsubUser(); } catch {}
            if (pollId) { try { clearInterval(pollId); } catch {} }
        };
    }, [route?.params?.messages]);

    const toFeedScreen = () => {
        // Prefer a real back action so we return to the exact previous screen
        // (Workout or Feed, depending on where Messages was opened from)
        try {
            if (navigation.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
                return;
            }
        } catch {}

        // Fallback: navigate explicitly based on hint or default to Feed
        const hint = route?.params?.returnTo;
        if (hint === 'Workout') {
            openActiveWorkout();
            return;
        }
        navigation.navigate('Feed', { messages: chats });
    };

    // Reset unread messages aggregate when viewing Messages
    useFocusEffect(
        useCallback(() => {
            const uid = global?.userData?.uid;
            if (!uid) return;
            try { updateDocMerge('users', uid, { unreadMessagesCount: 0 }); } catch {}
            return () => {};
        }, [])
    );

    const toChat = (key, usersExcludingSelf) => {
        navigation.navigate("Chat", {
            data: chats[key],
            index: key,
            usersExcludingSelf,
        });
    };

    const openCreateGroupChatBottomSheet = () => {
        setIsCreateGroupChatBottomSheetVisible(true);
    };

    const initChat = async (usersExcludingSelf) => {
        const selfUser = {
            uid: userData.uid,
            handle: userData.handle,
            pfp: userData.image,
            name: userData.name,
        };

        // Deduplicate and sanitize selected users (ignore entries without a uid)
        const dedupedUsers = [];
        const seen = new Set();
        (Array.isArray(usersExcludingSelf) ? usersExcludingSelf : []).forEach((user) => {
            const uid = String(user?.uid || "");
            if (!uid || seen.has(uid)) return;
            seen.add(uid);
            dedupedUsers.push(user);
        });

        if (!selfUser.uid || dedupedUsers.length === 0) return;

        const buildParticipantKey = (uids) => (
            Array.from(new Set((uids || []).map((id) => String(id || "")).filter(Boolean)))
                .sort()
                .join("|")
        );

        const targetKey = buildParticipantKey([...dedupedUsers.map((u) => u.uid), selfUser.uid]);
        if (!targetKey) return;

        const usersMatchKey = (candidate) => {
            const memberUids = Array.isArray(candidate?.memberUids) && candidate.memberUids.length
                ? candidate.memberUids
                : Array.isArray(candidate?.users)
                    ? candidate.users.map((u) => u?.uid)
                    : [];
            return buildParticipantKey(memberUids) === targetKey;
        };

        const ensureChatCached = (chatData) => {
            if (!chatData || typeof chatData !== 'object') return chatData;
            const cid = String(chatData.cid || chatData.mid || '');
            if (!cid) return chatData;
            const safeContent = Array.isArray(chatData.content) ? chatData.content : [];

            const snapshot = getMessagesCache();
            const existing = snapshot.find((c) => c.cid === cid);
            if (existing) {
                if (!Array.isArray(existing.content) || existing.content.length === 0) {
                    mergeLatestBatchIntoCache({ [cid]: safeContent });
                }
                return existing;
            }

            const augmented = { ...chatData, cid, content: safeContent };
            const normalized = hydrateMessagesCache([...snapshot, augmented]);
            setChats(normalized);
            mergeLatestBatchIntoCache({ [cid]: safeContent });
            ensureMessageListener(cid);
            setLatestByCid(getLatestByCidCache());

            return normalized.find((c) => c.cid === cid) || augmented;
        };

        // 1) Check existing chats already loaded in state
        const existingLoaded = (Array.isArray(chats) ? chats : []).find(usersMatchKey);
        if (existingLoaded) {
            const participants = Array.isArray(existingLoaded.users)
                ? existingLoaded.users.filter((u) => String(u?.uid || "") !== String(selfUser.uid))
                : dedupedUsers;
            setIsCreateGroupChatBottomSheetVisible(false);
            navigation.navigate("Chat", { data: existingLoaded, usersExcludingSelf: participants });
            return;
        }

        // 2) Check cached message refs on the user doc (in case chat exists but not yet hydrated)
        const userMessages = Array.isArray(global?.userData?.messages) ? global.userData.messages : [];
        const existingEntry = userMessages.find((entry) => {
            const otherUsers = Array.isArray(entry?.otherUsers) ? entry.otherUsers : [];
            const key = buildParticipantKey([selfUser.uid, ...otherUsers.map((u) => u?.uid)]);
            return key === targetKey;
        });

        if (existingEntry?.mid) {
            try {
                const docRef = doc(db, "messages", existingEntry.mid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const fetched = ensureChatCached({ cid: existingEntry.mid, ...docSnap.data(), content: [] });
                    const participants = Array.isArray(fetched?.users)
                        ? fetched.users.filter((u) => String(u?.uid || "") !== String(selfUser.uid))
                        : (Array.isArray(existingEntry.otherUsers) ? existingEntry.otherUsers : dedupedUsers);
                    setIsCreateGroupChatBottomSheetVisible(false);
                    navigation.navigate("Chat", { data: fetched, usersExcludingSelf: participants });
                    return;
                }
            } catch (err) {
                console.log("initChat existing fetch error", err);
            }
        }

        const cid = makeID();

        // Append this chat reference to every participant's user doc so it shows up for all
        const allParticipants = [...dedupedUsers, selfUser];
        await Promise.all(
            allParticipants.map((u) => {
                const otherUsers = allParticipants.filter((x) => x.uid !== u.uid);
                return arrayAppend("users", u.uid, "messages", { mid: cid, otherUsers });
            })
        );

        const newChat = await createChat(userData.uid, allParticipants, cid);
        const chatObj = ensureChatCached({ ...newChat, content: [] });

        setIsCreateGroupChatBottomSheetVisible(false);
        navigation.navigate("Chat", { data: chatObj, usersExcludingSelf: dedupedUsers });
    };

    if (!userData || !chats) return null;

    // ---- Sort newest first (by latest message timestamp) ----
    const getEpoch = (chat) => {
        const t = chat?.content?.[0]?.timestamp;
        if (!t) return 0;
        if (typeof t === "number") return t;
        if (typeof t === "string") return Date.parse(t) || 0;
        if (typeof t?.toMillis === "function") return t.toMillis();
        if (typeof t?.seconds === "number") return t.seconds * 1000;
        try {
            return new Date(t).getTime() || 0;
        } catch {
            return 0;
        }
    };

    const sortedMessages = useMemo(() => {
        const merged = chats.map((c) => ({ ...c, content: latestByCid[c.cid] ?? c.content ?? [] }));
        merged.sort((a, b) => getEpoch(b) - getEpoch(a));
        return merged;
    }, [chats, latestByCid]);

    const filteredMessages = useMemo(() => {
        if (scope === "Group") {
            return sortedMessages.filter((message) => message.isGroup);
        }
        return sortedMessages;
    }, [sortedMessages, scope]);

    const topInset = Math.max(insets?.top || 0, 0);
    const cardsBottomPadding = scaleSize(18) + (insets?.bottom ?? 0);

    return (
        <View style={styles.mainContainer}>
            <MessagesHeader
                handle={userData.handle}
                toFeedScreen={toFeedScreen}
                setScope={setScope}
                openCreateGroupChatBottomSheet={openCreateGroupChatBottomSheet}
                topInset={topInset}
            />

            <View style={styles.cardsContainer}>
                <ScrollView
                    style={styles.cardsScrollView}
                    contentContainerStyle={[styles.cardsContent, { paddingBottom: cardsBottomPadding }]}
                    showsVerticalScrollIndicator={false}
                >
                    {filteredMessages.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                            <Text style={styles.emptyStateTitle}>No messages yet</Text>
                            <Text style={styles.emptyStateSubtitle}>
                                Send a DM to connect with your friends.
                            </Text>
                        </View>
                    ) : (
                        filteredMessages.map((msg, listIndex) => {
                            const originalIndex = chats.findIndex((m) => m.cid === msg.cid);
                            const usersExcludingSelf = Array.isArray(msg.users)
                                ? msg.users.filter((u) => u.uid !== userData.uid)
                                : [];
                            const lastMsg = msg.content?.[0];
                            const isFirst = listIndex === 0;
                            const isLast = listIndex === filteredMessages.length - 1;

                            return (
                                <MessageCard
                                    key={`${msg.cid}-${originalIndex}`}
                                    usersExcludingSelf={usersExcludingSelf}
                                    content={lastMsg?.text || ""}
                                    timestamp={lastMsg?.timestamp || null}
                                    toChat={toChat}
                                    index={originalIndex} // preserve original index for navigation/state
                                    isFirst={isFirst}
                                    isLast={isLast}
                                />
                            );
                        })
                    )}
                </ScrollView>
            </View>

            <CreateGroupChatBottomSheet
                isVisible={isCreateGroupChatBottomSheetVisible}
                setIsVisible={setIsCreateGroupChatBottomSheetVisible}
                initChat={initChat}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    cardsContainer: {
        flex: 1,
    },
    cardsScrollView: {
        marginTop: scaleSize(6),
    },
    cardsContent: {
        paddingBottom: scaleSize(18),
    },
    emptyStateContainer: {
        paddingVertical: scaleSize(60),
        paddingHorizontal: scaleSize(24),
        alignItems: "center",
    },
    emptyStateTitle: {
        color: theme.textPrimary,
        fontSize: scaleSize(18),
        fontFamily: "Outfit_600SemiBold",
        marginBottom: scaleSize(8),
        textAlign: "center",
    },
    emptyStateSubtitle: {
        color: theme.textSecondary,
        fontSize: scaleSize(14),
        fontFamily: "Outfit_400Regular",
        textAlign: "center",
    },
});
