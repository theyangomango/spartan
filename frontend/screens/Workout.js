import React, { useRef, useState } from "react";
import { Text, StyleSheet, View } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import BottomSheet from "react-native-gesture-bottom-sheet";
import NewWorkoutModal from "../components/workout/NewWorkoutModal";
import Footer from "../components/Footer";
import TemplateCard from "../components/workout/TemplateCard";
import StartWorkoutButton from "../components/workout/StartWorkoutButton";
import JoinWorkoutButton from "../components/workout/JoinWorkoutButton";
import initWorkout from "../../backend/initWorkout";
import makeID from "../../backend/helper/makeID";

export default function Workout({ navigation, route }) {
    const userData = route.params.userData;
    const [bkgColor, setBkgColor] = useState('#000');
    const bottomSheet = useRef();
    const [wid, setWID] = useState(null);

    useFocusEffect(
        React.useCallback(() => {
            // Do something when the screen is focused
            const interval = setInterval(() => {
                let panY = parseInt(JSON.stringify(bottomSheet.current.state.pan.y));
                let animatedHeight = parseInt(JSON.stringify(bottomSheet.current.state.animatedHeight));
                let realHeight = Math.max(panY, 1100 - animatedHeight);
                setBkgColor(`rgba(0, 0, 0, ${0.7 - 0.75 * (realHeight / 800)})`)
            }, 50);

            return () => {
                // Do something when the screen is unfocused
                // Useful for cleanup functions
                clearInterval(interval);
            };
        }, [])
    );

    function startNewWorkout() {
        let wid = makeID();
        initWorkout(wid, userData.uid);
        setWID(wid);
        bottomSheet.current.show();
    }

    function closeNewWorkoutModal() {
        bottomSheet.current.close();
    }

    return (
        <View style={styles.main_ctnr}>
            <BottomSheet
                hasDraggableIcon
                ref={bottomSheet}
                height={800}
                sheetBackgroundColor={'#fff'}
                backgroundColor={bkgColor}
                // Todo edit draggable option to allow scrolling
                // draggable={false} 
            >
                <NewWorkoutModal wid={wid} closeModal={(closeNewWorkoutModal)} />
            </BottomSheet>


            <View style={styles.body}>
                <Text style={styles.title_text}>Workouts</Text>
                <StartWorkoutButton startWorkout={startNewWorkout} />
                <JoinWorkoutButton />

                <Text style={styles.subtitle_text}>Templates</Text>
                <TemplateCard />
            </View>



            <Footer navigation={navigation} currentScreenName={'Workout'} userData={userData} />
        </View>
    );
};

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    body: {
        flex: 1,
        paddingHorizontal: 18,
        marginTop: 60
    },
    title_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 22,
        paddingHorizontal: 4,
        paddingBottom: 6
    },
    subtitle_text: {
        marginTop: 24,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 18,
        paddingHorizontal: 4,
        paddingBottom: 6
    }
});
