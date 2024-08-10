// HistorySection.js
import React, { memo } from "react";
import { StyleSheet, FlatList, View } from "react-native";
import PastWorkoutCard from "./PastWorkoutCard";

const lastUsedDate = "July 6th";
const exercises = [
    { name: "3 x Incline Bench (Barbell)", muscle: "Chest" },
    { name: "3 x Decline Bench (Barbell)", muscle: "Chest" },
    { name: "3 x Chest Flys", muscle: "Chest" },
    { name: "5 x Pull Ups", muscle: "Back" },
    { name: "3 x Bicep Curls (Dumbell)", muscle: "Biceps" },
    { name: "3 x Lateral Raises", muscle: "Shoulders" },
    { name: "3 x Shoulder Press (Dumbell)", muscle: "Shoulders" },
    { name: "5 x Reverse Curls (Barbell)", muscle: "Biceps" }
];

const HistorySection = ({ isVisible, isBottomSheetExpanded }) => {
    const renderWorkout = ({ item }) => (
        <PastWorkoutCard lastUsedDate={item.lastUsedDate} exercises={item.exercises} name={item.name} />
    );

    return (
        <FlatList
            data={[
                { lastUsedDate, exercises, name: 'Chest & Back' },
                { lastUsedDate, exercises, name: 'Full Upper Body' },
                { lastUsedDate, exercises, name: 'Leg Day!!!' },
                { lastUsedDate, exercises, name: 'Full Body' },
                { lastUsedDate, exercises, name: 'Cardio' },
                { lastUsedDate, exercises, name: 'Full Upper Body' }
            ]}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderWorkout}
            contentContainerStyle={[styles.scrollable_ctnr, !isVisible && styles.hidden]}
            ListFooterComponent={<View style={{ height: isBottomSheetExpanded ? 100 : 400 }} />}
            initialNumToRender={1}
        />
    );
};

const styles = StyleSheet.create({
    scrollable_ctnr: {
        marginTop: 5,
        flexGrow: 1,
    },
    hidden: {
        display: 'none',
    }
});

export default memo(HistorySection);
