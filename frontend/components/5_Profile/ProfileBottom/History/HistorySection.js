// HistorySection.js
import React, { memo } from "react";
import { StyleSheet, FlatList, View, Pressable } from "react-native";
import WorkoutHistoryCard from "./WorkoutHistoryCard";

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

const HistorySection = ({ isVisible, isBottomSheetExpanded, completedWorkouts, onOpenWorkout }) => {
    const renderWorkout = ({ item }) => (
        <Pressable onPress={() => onOpenWorkout && onOpenWorkout(item)}>
            <WorkoutHistoryCard workout={item} />
        </Pressable>
    );

    return (
        <View style={[styles.wrap, !isVisible && styles.hidden]}>
            <FlatList
                data={completedWorkouts}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderWorkout}
                contentContainerStyle={styles.scrollable_ctnr}
                ListFooterComponent={<View style={{ height: isBottomSheetExpanded ? 100 : 400 }} />}
                initialNumToRender={3}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {
        flex: 1,
    },
    scrollable_ctnr: {
        marginTop: 5,
        flexGrow: 1,
    },
    hidden: {
        display: 'none',
    }
});

export default memo(HistorySection);
