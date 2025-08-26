import React, { useEffect, useMemo, useState } from "react";
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

export default function Messages({ navigation, route }) {
    const userData = global.userData;
    const [messages, setMessages] = useState(cachedMessages);
    const [scope, setScope] = useState("All");
    const [isCreateGroupChatBottomSheetVisible, setIsCreateGroupChatBottomSheetVisible] = useState(false);

    // Load from route.params once (initial chat metadata)
    useEffect(() => {
        if ("messages" in route.params) {
            const enriched = route.params.messages.map((chat) => ({
                ...chat,
                content: cachedMessages.find((c) => c.cid === chat.cid)?.content || [],
            }));
            setMessages(enriched);
            cachedMessages = enriched;
        }
    }, [route.params.messages]);

    // Live snapshot: Listen for latest message in each chat
    useEffect(() => {
        const unsubscribes = messages.map((msg, index) => {
            const contentRef = collection(db, "messages", msg.cid, "content");
            const q = query(contentRef, orderBy("timestamp", "desc"));
            return onSnapshot(q, (snapshot) => {
                const latestMessage = snapshot.docs[0]?.data();
                setMessages((prev) => {
                    const updated = [...prev];
                    if (updated[index]) {
                        updated[index] = {
                            ...updated[index],
                            content: latestMessage ? [latestMessage] : [],
                        };
                        cachedMessages = updated;
                    }
                    return updated;
                });
            });
        });

        return () => unsubscribes.forEach((unsub) => unsub());
    }, [messages.length]);

    const toFeedScreen = () => {
        navigation.navigate("Feed", { messages });
    };

    const toChat = (key, usersExcludingSelf) => {
        navigation.navigate("Chat", {
            data: messages[key],
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

        setMessages((prev) => {
            const updated = [...prev, chatObj];
            cachedMessages = updated;
            return updated;
        });

        setIsCreateGroupChatBottomSheetVisible(false);
        navigation.navigate("Chat", { data: chatObj, usersExcludingSelf });
    };

    if (!userData || !messages) return null;

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
        const copy = [...messages];
        copy.sort((a, b) => getEpoch(b) - getEpoch(a));
        return copy;
    }, [messages]);

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

                        const originalIndex = messages.findIndex((m) => m.cid === msg.cid);
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
