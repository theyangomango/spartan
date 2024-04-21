import React, { useRef } from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import BottomSheet from "react-native-gesture-bottom-sheet";
import NewWorkout from "../modals/NewWorkout";
import Footer from "../components/Footer";
import TemplateCard from "../components/workout/TemplateCard";

export default function Workout({ navigation, route }) {
    const userData = route.params.userData;

    const bottomSheet = useRef();

    function startNewWorkout() {
        bottomSheet.current.show()
    }

    return (
        <View style={styles.main_ctnr}>
            <BottomSheet hasDraggableIcon ref={bottomSheet} height={800} sheetBackgroundColor={'#fff'}>
                <NewWorkout />
            </BottomSheet>


            <View style={styles.body}>
                <Text style={styles.title_text}>Workouts</Text>

                <View style={styles.top_btns_ctnr}>
                    <TouchableOpacity onPress={startNewWorkout} style={styles.start_new_workout_btn}>
                        <Text style={styles.start_new_workout_text}>Start New Workout</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.join_workout_btn}>
                        <Text style={styles.join_workout_text}>Join Workout</Text>
                    </TouchableOpacity>
                </View>


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
    },
    top_btns_ctnr: {
        // paddingHorizontal: 4
    },
    start_new_workout_btn: {
        width: '100%',
        height: 35,
        marginVertical: 6,
        borderRadius: 15,
        backgroundColor: '#51B8FF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    start_new_workout_text: {
        fontSize: 16,
        fontFamily: 'SourceSansPro_600SemiBold',
        color: 'white'
    },
    join_workout_btn: {
        width: '100%',
        height: 35,
        marginVertical: 6,
        borderRadius: 15,
        backgroundColor: '#EAC435',
        justifyContent: 'center',
        alignItems: 'center'
    },
    join_workout_text: {
        fontSize: 16,
        fontFamily: 'SourceSansPro_600SemiBold',
        color: 'white'
    },
    text: {
        color: "white",
        fontWeight: "600",
    },

    bottom_sheet: {
        backgroundColor: '#fff'
    }
});
