import { StyleSheet, View, Text, Dimensions } from "react-native";
import { Feather, Ionicons } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375; // Base screen width assumed as 375

function scaleSize(size) {
    return Math.round(size * scale);
}

export default function ViewProfileHeader({ handle, goBack }) {
    return (
        <View style={styles.main_ctnr}>
            <RNBounceable style={styles.options_btn_ctnr} onPress={goBack}>
                <Feather name="chevron-left" size={scaleSize(27)} color={'#ccc'} style={{ marginLeft: scaleSize(-5) }} />
            </RNBounceable>
            <RNBounceable>
                <View style={styles.center}>
                    <Text style={styles.handle_text}>{handle}</Text>
                </View>
            </RNBounceable>
            <View style={styles.right}>
                <RNBounceable>
                    <View style={styles.options_btn_ctnr}>
                        <Ionicons name='menu' size={scaleSize(22.5)} color="#bbb" />
                    </View>
                </RNBounceable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        paddingTop: scaleSize(50),
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: scaleSize(17),
        paddingVertical: scaleSize(12),
    },
    center: {
        flexDirection: 'row',
    },
    handle_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
        padding: scaleSize(2),
        color: '#666',
    },
    right: {
        flexDirection: 'row',
    },
    options_btn_ctnr: {
        opacity: 0.5
    },
});
