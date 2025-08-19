import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import { db } from "../../../../firebase.config";
import ButtonRow from "./ButtonRow";
import NotificationCard from "./NotificationCard";
import scaleSize from "../../../helper/scaleSize";

const PAGE_SIZE = 20;

export default function NotificationsModal({ visible }) {
    const [selectedButton, setSelectedButton] = useState("All Activity");
    const [events, setEvents] = useState([]);
    const [newLikes, setNewLikes] = useState(0);
    const [newComments, setNewComments] = useState(0);

    useEffect(() => {
        if (!visible) return;
        const uid = global.userData?.uid;
        if (!uid) return;

        const notifRef = collection(db, "users", uid, "notifications");
        const notifQuery = query(notifRef, orderBy("timestamp", 'desc'), limit(PAGE_SIZE));

        return onSnapshot(notifQuery, (snapshot) => {
            const docs = snapshot.docs.map((doc) => doc.data());
            setEvents(docs);

            // Count unread likes/comments until first read
            let likes = 0;
            let comments = 0;
            for (const doc of docs) {
                if (doc.read) break;
                if (doc.type?.startsWith("liked")) likes++;
                if (["comment", "replied-comment"].includes(doc.type)) comments++;
            }

            setNewLikes(likes);
            setNewComments(comments);
        });
    }, [visible]);

    const filteredEvents = useMemo(() => {
        return events.filter((event) => {
            switch (selectedButton) {
                case "Likes":
                    return ["liked-post", "liked-story", "liked-comment"].includes(event.type);
                case "Comments":
                    return ["comment", "replied-comment"].includes(event.type);
                case "Mentions":
                    return event.type === "mention";
                default:
                    return true;
            }
        });
    }, [selectedButton, events]);

    return (
        <View style={styles.container}>
            <ButtonRow
                buttons={["All Activity", "Likes", "Comments", "Mentions"]}
                selectedButton={selectedButton}
                setSelectedButton={setSelectedButton}
                newLikes={newLikes}
                newComments={newComments}
            />
            <FlatList
                data={filteredEvents}
                renderItem={({ item }) => <MemoNotificationCard item={item} />}
                keyExtractor={(item, index) => `${item.type}-${item.timestamp}-${index}`}
                style={styles.flatList}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                windowSize={7}
                removeClippedSubviews
            />
        </View>
    );
}

const MemoNotificationCard = React.memo(NotificationCard);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f6fa",
        borderTopLeftRadius: scaleSize(25),
        borderTopRightRadius: scaleSize(25),
    },
    flatList: {
        paddingHorizontal: scaleSize(12),
    },
});
