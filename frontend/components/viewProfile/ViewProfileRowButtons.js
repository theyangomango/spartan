import RNBounceable from "@freakycoder/react-native-bounceable";
import { StyleSheet, View, Text } from "react-native";

export default function ViewProfileRowButtons({ toMessages }) {
    return (
        <View style={styles.row}>
            <RNBounceable style={styles.flex} onPress={toMessages}>
                <View style={[styles.message_button, styles.flex]}>
                    <Text style={styles.message_text}>Message</Text>
                </View>
            </RNBounceable>
            <RNBounceable style={styles.flex}>
                <View style={[styles.view_stats_button, styles.flex]}>
                    <Text style={styles.view_stats_text}>View Stats</Text>
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
    message_button: {
        paddingHorizontal: 20,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: '#3CA5FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 3,
    },
    view_stats_button: {
        paddingHorizontal: 20,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: '#f2f2f2',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 3,
    },
    message_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12.5,
        color: '#fff'
    },
    view_stats_text: {
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 12.5,
    },
});
