import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { AntDesign, SimpleLineIcons } from '@expo/vector-icons'
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function JoinWorkoutButton({ joinWorkout }) {
    return (
        <RNBounceable style={styles.main_ctnr}>
            <Text style={styles.text}>Log Past Workout</Text>
            {/* <AntDesign name="addusergroup" size={24} color={'#fff'} /> */}
            {/* <AntDesign name="book" size={23.5} color={'#fff'} /> */}
            <SimpleLineIcons name="notebook" size={20} color={'#fff'} style={{ paddingRight: 1 }} />


        </RNBounceable>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        // height: 35,
        opacity: 0.5,
        backgroundColor: '#c9c9c9',
        height: 42,
        paddingHorizontal: 28,
        marginVertical: 4,
        borderRadius: 15,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    text: {
        fontSize: 13,
        fontFamily: 'Poppins_600SemiBold',
        color: 'white',
    },
});