import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { AntDesign } from '@expo/vector-icons'
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function JoinWorkoutButton({ joinWorkout }) {
    return (
        <RNBounceable onPress={joinWorkout} style={styles.main_ctnr}>
            <Text style={styles.text}>Join Workout</Text>
            <AntDesign name="addusergroup" size={24} color={'#fff'} />

        </RNBounceable>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        // height: 35,
        height: 43,
        marginVertical: 4,
        borderRadius: 15,
        backgroundColor: '#FFC44D',
        justifyContent: 'center',
        // alignItems: 'center'
        paddingHorizontal: 28,

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