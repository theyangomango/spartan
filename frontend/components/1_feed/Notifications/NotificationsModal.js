/**
 * Displays a list of user notifications with filtering options.
 * Allows users to filter notifications by activity type and view individual notifications.
 */

import React, { useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import ButtonRow from "./ButtonRow";
import NotificationCard from "./NotificationCard";
import getReverse from "../../../helper/getReverse";
import scaleSize from "../../../helper/scaleSize"; 

export default function NotificationsModal() {
    // State to manage the selected filter button
    const [selectedButton, setSelectedButton] = useState("All Activity");

    // Reverse the notifications to show the latest first
    const events = getReverse(global.userData.notificationEvents);

    // Extract new likes and comments counts
    const newLikes = global.userData.notificationNewLikes;
    const newComments = global.userData.notificationNewComments;

    // Filter events based on the selected button
    const filteredEvents = events.filter((event) => {
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
            case "All Activity":
            default:
                return true;
        }
    });

    return (
        <View style={styles.container}>
            {/* Filter Buttons */}
            <ButtonRow
                buttons={["All Activity", "Likes", "Comments", "Mentions"]}
                selectedButton={selectedButton}
                setSelectedButton={setSelectedButton}
                newLikes={newLikes}
                newComments={newComments}
            />

            {/* Notification List */}
            <FlatList
                showsVerticalScrollIndicator={false}
                data={filteredEvents}
                renderItem={({ item }) => <NotificationCard item={item} />}
                keyExtractor={(_, index) => index.toString()}
                style={styles.flatList}
            />
        </View>
    );
}

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
