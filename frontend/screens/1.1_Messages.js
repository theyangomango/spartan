import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import MessageCard from "../components/1.1_Messages/MessageCard";
import MessagesHeader from "../components/1.1_Messages/MessagesHeader";
import CreateGroupChatBottomSheet from "../components/1.1_Messages/CreateGroupChatBottomSheet";
import createChat from "../../backend/messages/createChat";
import makeID from "../../backend/helper/makeID";
import arrayAppend from "../../backend/helper/firebase/arrayAppend";
import scaleSize from "../helper/scaleSize";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";

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
            // seed chats and hydrate from cache
            const enriched = incoming.map((chat) => ({
                ...chat,
                content: cachedLatestByCid[chat.cid] || cachedMessages.find((c) => c.cid === chat.cid)?.content || [],
            }));
            setChats(enriched);
            cachedMessages = enriched;
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

    const toFeedScreen = () => {
        if (route?.params?.returnTo === 'Workout') {
            // When opened from the Workout stack, simply go back to Workout
            navigation.goBack();
        } else {
            // Default behavior (opened from Feed stack): go back to Feed
            navigation.navigate("Feed", { messages: chats });
        }
    };

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

        arrayAppend("users", userData.uid, "messages", {
            mid: cid,
            otherUsers: usersExcludingSelf,
        });

        const newChat = await createChat(userData.uid, [...usersExcludingSelf, selfUser], cid);
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
        backgroundColor: "#F7F8FC",
        paddingTop: scaleSize(50),
    },
    cardsContainer: {
        flex: 1,
    },
    cardsScrollView: {
        paddingTop: scaleSize(4),
    },
    cardsContent: {
        paddingBottom: scaleSize(18),
    },
});
