import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../../../firebase.config";
import ButtonRow from "./ButtonRow";
import NotificationCard from "./NotificationCard";
import scaleSize from "../../../helper/scaleSize";

const PAGE_SIZE = 20;

export default function NotificationsModal({ visible, uid }) {
    const [selectedButton, setSelectedButton] = useState("All Activity");
    const [events, setEvents] = useState([]);
    const [refreshTick, setRefreshTick] = useState(0);
    const listRef = useRef(null);
    const [newLikes, setNewLikes] = useState(0);
    const [newComments, setNewComments] = useState(0);

    useEffect(() => {
        if (!visible) return;
        const effUid = uid || global.userData?.uid;
        if (!effUid) return;

        const notifRef = collection(db, "users", effUid, "notifications");
        const notifQuery = query(notifRef, orderBy("timestamp", "desc"), limit(PAGE_SIZE));
        return onSnapshot(notifQuery, (snapshot) => {
            const docs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
            setEvents(docs);
            setRefreshTick((t) => t + 1);
            // ensure the list re-measures and stays at top on first load
            try { listRef.current?.scrollToOffset?.({ offset: 0, animated: false }); } catch {}

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
    }, [visible, uid]);

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
                ref={listRef}
                data={filteredEvents}
                renderItem={({ item }) => <MemoNotificationCard item={item} />}
                keyExtractor={(item, index) => {
                    const ts = item?.timestamp;
                    const ms = (typeof ts === 'number')
                        ? ts
                        : (ts?.toMillis?.() || (typeof ts?.seconds === 'number' ? ts.seconds * 1000 : (Date.parse(ts) || 0)));
                    return `${item?.id || ''}-${item?.type || 'evt'}-${ms || index}-${index}`;
                }}
                style={styles.flatList}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                windowSize={7}
                removeClippedSubviews={false}
                extraData={refreshTick}
                ListEmptyComponent={visible ? <View style={styles.emptyWrap} /> : null}
            />
        </View>
    );
}

const MemoNotificationCard = React.memo(NotificationCard);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F7F8FC",
        borderTopLeftRadius: scaleSize(26),
        borderTopRightRadius: scaleSize(26),
    },
    flatList: {
        paddingHorizontal: scaleSize(12),
    },
    listContent: {
        paddingBottom: scaleSize(18),
    },
    emptyWrap: { height: scaleSize(60) },
});
