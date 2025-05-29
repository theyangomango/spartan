/**
 * Modal that lists user notifications.
 * - Shows the newest first.
 * - Filters by activity type.
 * - Loads 20 cards at a time and appends more as you scroll.
 */

import React, { useState, useMemo, useEffect } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import ButtonRow from "./ButtonRow";
import NotificationCard from "./NotificationCard";
import getReverse from "../../../helper/getReverse";
import scaleSize from "../../../helper/scaleSize";

export default function NotificationsModal() {
    /* ---------------- constants ---------------- */
    const PAGE_SIZE = 20;                 // number of cards per "page"

    /* ---------------- state ---------------- */
    const [selectedButton, setSelectedButton] = useState("All Activity");
    const [page, setPage] = useState(1);  // how many pages have been loaded

    /* ---------------- source data ---------------- */
    const events = useMemo(
        () => getReverse(global.userData.notificationEvents),
        []
    );
    const newLikes = global.userData.notificationNewLikes;
    const newComments = global.userData.notificationNewComments;

    /* ---------------- filter logic ---------------- */
    const filteredEvents = useMemo(() => {
        return events.filter((event) => {
            switch (selectedButton) {
                case "Likes":
                    return (
                        event.type === "liked-post" ||
                        event.type === "liked-story" ||
                        event.type === "liked-comment"
                    );
                case "Comments":
                    return event.type === "comment" || event.type === "replied-comment";
                case "Mentions":
                    return event.type === "mention";
                default:
                    return true; // "All Activity"
            }
        });
    }, [selectedButton, events]);

    /* ---------------- slice by page ---------------- */
    const visibleEvents = useMemo(
        () => filteredEvents.slice(0, page * PAGE_SIZE),
        [filteredEvents, page]
    );

    /* ---------------- handlers ---------------- */
    const handleEndReached = () => {
        if (page * PAGE_SIZE < filteredEvents.length) {
            setPage((p) => p + 1);
        }
    };

    /* reset pagination whenever filter changes */
    useEffect(() => setPage(1), [selectedButton]);

    /* ---------------- render ---------------- */
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
                data={visibleEvents}
                renderItem={({ item }) => <MemoNotificationCard item={item} />}
                keyExtractor={(item) => `${item.type}-${item.timestamp}`}
                style={styles.flatList}
                showsVerticalScrollIndicator={false}
                onEndReachedThreshold={0.2}
                onEndReached={handleEndReached}
                initialNumToRender={10}
                windowSize={7}
                removeClippedSubviews
            />
        </View>
    );
}

/* -------- memoised card to avoid useless re-renders -------- */
const MemoNotificationCard = React.memo(NotificationCard);

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        borderTopLeftRadius: scaleSize(25),
        borderTopRightRadius: scaleSize(25),
    },
    flatList: {
        paddingHorizontal: scaleSize(12),
    },
});
