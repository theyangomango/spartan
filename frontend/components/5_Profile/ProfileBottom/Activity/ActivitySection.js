// ActivitySection.js
import React, { memo, useState } from "react";
import { StyleSheet, FlatList, View, Modal } from "react-native";
import ExerciseGraph from "./ExerciseGraph";
import SelectExerciseModal from "../../../2_Competition/SelectExercise/SelectExerciseModal";

const ActivitySection = ({ isVisible, isBottomSheetExpanded }) => {
    const [isSelectExerciseModalVisible, setIsSelectExerciseModalVisible] = useState(false);
    const closeSelectExerciseModal = () => {
        setSelectExerciseModalVisible(false);
    };

    const renderExerciseGraph = () => (
        <ExerciseGraph />
    );

    return (
        // ! Disabled for Beta
        <View style={{opacity: 0.5}}>
            <FlatList
                data={[{}, {}, {}]}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderExerciseGraph}
                contentContainerStyle={[styles.scrollable_ctnr, !isVisible && styles.hidden]}
                ListFooterComponent={<View style={{ height: isBottomSheetExpanded ? 100 : 400 }} />}
                initialNumToRender={1}
            />

            <Modal
                animationType="fade"
                transparent={true}
                visible={isSelectExerciseModalVisible}
                onRequestClose={closeSelectExerciseModal}
            >
                <SelectExerciseModal closeModal={closeSelectExerciseModal} />
            </Modal>
        </View>

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
