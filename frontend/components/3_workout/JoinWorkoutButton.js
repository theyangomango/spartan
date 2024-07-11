import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { AntDesign, SimpleLineIcons } from '@expo/vector-icons'
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function JoinWorkoutButton({ joinWorkout }) {
    return (
        <RNBounceable onPress={joinWorkout} style={styles.main_ctnr}>
            <Text style={styles.text}>Log Past Workout</Text>
            {/* <AntDesign name="addusergroup" size={24} color={'#fff'} /> */}
            {/* <AntDesign name="book" size={23.5} color={'#fff'} /> */}
            <SimpleLineIcons name="notebook" size={21} color={'#fff'} style={{ paddingRight: 1 }} />


        </RNBounceable>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        // height: 35,
        height: 43,
        marginVertical: 4,
        borderRadius: 15,
        backgroundColor: '#FFC44D',
        justifyContent: 'center',
        // alignItems: 'center'
        paddingHorizontal: 28,
        marginHorizontal: 18,

        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    text: {
        fontSize: 18,
        fontFamily: 'SourceSansPro_600SemiBold',
        color: 'white',
        marginRight: 8
    },
});