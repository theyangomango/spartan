// import React, { useRef } from 'react';
// import { Dimensions, StyleSheet, View } from 'react-native';
// import BottomSheet from 'reanimated-bottom-sheet';
import NewWorkoutModal from './new_workout/NewWorkoutModal';

// console.log(BottomSheet);

// const { height } = Dimensions.get('window');

// const NewWorkoutBottomSheet = ({ workout, setWorkout, cancelNewWorkout, updateNewWorkout, finishNewWorkout, isVisible, setIsVisible }) => {
//     const bottomSheetRef = useRef(null);

//     const renderContent = () => (
//         <View style={styles.contentContainer}>
//             {/* <NewWorkoutModal
//         workout={workout}
//         setWorkout={setWorkout}
//         closeModal={() => bottomSheetRef.current.snapTo(1)}
//         cancelWorkout={cancelNewWorkout}
//         updateWorkout={updateNewWorkout}
//         finishWorkout={finishNewWorkout}
//       /> */}
//         </View>
//     );

//     //   if (!isVisible) {
//     //     return null;
//     //   }

//     return (
//         // <BottomSheet
//         //     // ref={bottomSheetRef}
//         //     // snapPoints={[height * 0.85, 0]}
//         //     // initialSnap={0}
//         //     // borderRadius={10}
//         //     // renderContent={renderContent}
//         // //   onCloseEnd={() => setIsVisible(false)}
//         // />
//         <></>
//     );
// };

// const styles = StyleSheet.create({
//     contentContainer: {
//         height: height * 0.85,
//         backgroundColor: '#fff',
//         padding: 20,
//     },
// });

// export default NewWorkoutBottomSheet;

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";

const NewWorkoutBottomSheet = ({ workout, isVisible, setIsVisible, cancelNewWorkout, updateNewWorkout, finishNewWorkout, timer }) => {
    // ref
    const bottomSheetRef = useRef(null);

    // variables
    const snapPoints = useMemo(() => ["94%"], []);

    // callbacks
    const handleSheetChanges = useCallback((index) => {
        console.log("handleSheetChanges", index);
    }, []);

    // renders
    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                // enableTouchThrough
                opacity={0.6}
            />
        ),
        []
    );

    useEffect(() => {
        console.log(isVisible);
        if (isVisible) {
            bottomSheetRef.current.expand();
        }
    }, [isVisible]);


    // bottomSheetRef.current.expand();

    return (
        // <View style={styles.container}>
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            onChange={handleSheetChanges}
            enablePanDownToClose
            onClose={() => {
                console.log('hi')
                setIsVisible(false);
            }}
        >
            {workout &&
                <NewWorkoutModal
                    timer={timer}
                    workout={workout}
                    // setWorkout={setWorkout}
                    // closeModal={() => bottomSheetRef.current.snapTo(1)}
                    cancelWorkout={() => {
                        cancelNewWorkout();
                        bottomSheetRef.current.close();
                    }}
                    updateWorkout={(newWorkout) => {
                        updateNewWorkout(newWorkout);
                    }}
                    finishWorkout={() => {
                        finishNewWorkout();
                        bottomSheetRef.current.close();
                    }}
                />
            }
        </BottomSheet>
        // </View>
    );
};

const styles = StyleSheet.create({
    // container: {
    //     flex: 1,
    //     padding: 24,
    //     backgroundColor: "grey",
    // },
    contentContainer: {
        flex: 1,
        alignItems: "center",
    },
});

export default NewWorkoutBottomSheet;