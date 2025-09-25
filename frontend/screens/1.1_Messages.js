import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
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

// ✅ Soft global cache for in-memory persistence
let cachedMessages = [];
let cachedLatestByCid = Object.create(null); // { [cid]: [latestMessage] }

export default function Messages({ navigation, route }) {
    const userData = global.userData;
    const [chats, setChats] = useState(cachedMessages);
    const [latestByCid, setLatestByCid] = useState(cachedLatestByCid);
    const [scope, setScope] = useState("All");
    const [isCreateGroupChatBottomSheetVisible, setIsCreateGroupChatBottomSheetVisible] = useState(false);

    // Load from route.params once (initial chat metadata)
    useEffect(() => {
        const incoming = route?.params?.messages;
        if (Array.isArray(incoming)) {
            // Seed chats using whatever latest content we've already fetched.
            // If neither cache has a hit, fall back to the payload's own content
            // so the preview renders immediately instead of waiting for listeners.
            const enriched = incoming.map((chat) => {
                const cachedLatest = cachedLatestByCid[chat.cid];
                const cachedChat = cachedMessages.find((c) => c.cid === chat.cid);
                const payloadContent = Array.isArray(chat?.content) ? chat.content : [];
                const cachedContent = Array.isArray(cachedChat?.content) ? cachedChat.content : [];

                const resolvedContent = Array.isArray(cachedLatest) && cachedLatest.length > 0
                    ? cachedLatest
                    : (payloadContent.length > 0 ? payloadContent : cachedContent);

                return {
                    ...chat,
                    content: resolvedContent,
                };
            });
            setChats(enriched);
            cachedMessages = enriched;

            // Prime the latest-by-cid cache so subsequent renders keep showing
            // the preloaded preview until Firestore listeners deliver updates.
            const nextLatest = { ...cachedLatestByCid };
            let didChange = false;
            enriched.forEach((chat) => {
                const existing = nextLatest[chat.cid];
                if (!Array.isArray(existing) || existing.length === 0) {
                    if (Array.isArray(chat.content) && chat.content.length > 0) {
                        nextLatest[chat.cid] = chat.content;
                        didChange = true;
                    }
                }
            });
            if (didChange) {
                cachedLatestByCid = nextLatest;
                setLatestByCid(nextLatest);
            }
        }
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
            setLatestByCid((prev) => {
                const next = { ...prev, ...bufferRef.updates };
                cachedLatestByCid = next;
                return next;
            });
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
                        setChats([]);
                        cachedMessages = [];
                        return;
                    }

                    // Get chat docs for each mid; skip ones we already have
                    const mids = Array.from(new Set(arr.map((m) => m?.mid).filter(Boolean)));
                    const have = new Set((cachedMessages || []).map((c) => c?.cid));
                    const need = mids.filter((mid) => !have.has(mid));

                    const fetched = await Promise.all(
                        need.map(async (mid) => {
                            try {
                                const cRef = doc(db, 'messages', mid);
                                const d = await getDoc(cRef);
                                return d.exists() ? { ...d.data(), content: [] } : null;
                            } catch {
                                return null;
                            }
                        })
                    );

                    // Merge with any existing cached chats and keep order based on mids
                    const byCid = new Map((cachedMessages || []).map((c) => [c.cid, c]));
                    fetched.filter(Boolean).forEach((c) => byCid.set(c.cid, c));
                    const merged = mids.map((mid) => byCid.get(mid)).filter(Boolean);
                    setChats(merged);
                    cachedMessages = merged;
                });
            } catch {}
        };

        // If already seeded via route or cache, skip baseline attach
        if (Array.isArray(route?.params?.messages) || (cachedMessages && cachedMessages.length > 0)) {
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
        const dest = hint === 'Workout' ? 'Workout' : 'Feed';
        navigation.navigate(dest, dest === 'Feed' ? { messages: chats } : undefined);
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

        const cid = makeID();

        // Append this chat reference to every participant's user doc so it shows up for all
        const allParticipants = [...usersExcludingSelf, selfUser];
        await Promise.all(
            allParticipants.map((u) => {
                const otherUsers = allParticipants.filter((x) => x.uid !== u.uid);
                return arrayAppend("users", u.uid, "messages", { mid: cid, otherUsers });
            })
        );

        const newChat = await createChat(userData.uid, allParticipants, cid);
        const chatObj = { ...newChat, content: [] };

        setChats((prev) => {
            const updated = [...prev, chatObj];
            cachedMessages = updated;
            return updated;
        });
        setLatestByCid((prev) => ({ ...prev, [cid]: [] }));

        setIsCreateGroupChatBottomSheetVisible(false);
        navigation.navigate("Chat", { data: chatObj, usersExcludingSelf });
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

    return (
        <View style={styles.mainContainer}>
            <MessagesHeader
                handle={userData.handle}
                toFeedScreen={toFeedScreen}
                setScope={setScope}
                openCreateGroupChatBottomSheet={openCreateGroupChatBottomSheet}
            />

            <View style={styles.cardsContainer}>
                <ScrollView
                    style={styles.cardsScrollView}
                    contentContainerStyle={styles.cardsContent}
                    showsVerticalScrollIndicator={false}
                >
                    {sortedMessages.map((msg, _sortedIndex) => {
                        if (scope === "Group" && !msg.isGroup) return null;

                        const originalIndex = chats.findIndex((m) => m.cid === msg.cid);
                        const usersExcludingSelf = msg.users.filter((u) => u.uid !== userData.uid);
                        const lastMsg = msg.content?.[0];

                        return (
                            <MessageCard
                                key={`${msg.cid}-${originalIndex}`}
                                usersExcludingSelf={usersExcludingSelf}
                                content={lastMsg?.text || ""}
                                timestamp={lastMsg?.timestamp || null}
                                toChat={toChat}
                                index={originalIndex} // preserve original index for navigation/state
                            />
                        );
                    })}
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
        paddingTop: scaleSize(36),
    },
    cardsContainer: {
        flex: 1,
    },
    cardsScrollView: {
        paddingTop: scaleSize(10),
    },
    cardsContent: {
        paddingHorizontal: scaleSize(4),
        paddingBottom: scaleSize(18),
    },
});
