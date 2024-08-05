// ActivitySection.js
import React, { memo } from "react";
import { StyleSheet, FlatList, View } from "react-native";
import ExerciseGraph from "./ExerciseGraph";

const ActivitySection = ({ isVisible }) => {
    const renderExerciseGraph = () => (
        <ExerciseGraph />
    );

    return (
        <FlatList
            data={[{}, {}, {}]}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderExerciseGraph}
            contentContainerStyle={[styles.scrollable_ctnr, !isVisible && styles.hidden]}
            ListFooterComponent={<View style={{ height: 120 }} />}
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

export default memo(ActivitySection);
