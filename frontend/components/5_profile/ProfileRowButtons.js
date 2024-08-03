import RNBounceable from "@freakycoder/react-native-bounceable";
import { StyleSheet, View, Text } from "react-native";

export default function ProfileRowButtons() {
    return (
        <View style={styles.row}>
            <RNBounceable style={styles.flex}>
                <View style={[styles.button, styles.flex]}>
                    <Text style={styles.edit_profile_text}>Edit Profile</Text>
                </View>
            </RNBounceable>
            <RNBounceable style={styles.flex}>
                <View style={[styles.button, styles.flex]}>
                    <Text style={styles.edit_profile_text}>View Stats</Text>
                </View>
            </RNBounceable>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        marginHorizontal: 5,
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-around',
        height: 32,
    },
    flex: {
        flex: 1,
    },
    button: {
        paddingHorizontal: 20,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: '#f2f2f2',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 3,
    },
    edit_profile_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12.5,
    },
});
