import { StyleSheet, View, Text, Dimensions } from "react-native";
import { Feather } from '@expo/vector-icons';
import RNBounceable from "@freakycoder/react-native-bounceable";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_HEIGHT / 844; // match Profile header baseline

function scaleSize(size) {
    return Math.round(size * scale);
}

export default function ViewProfileHeader({ handle, goBack, toMessages }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.sideLeft}>
                <RNBounceable onPress={goBack} hitSlop={10}>
                    <Feather name="chevron-left" size={scaleSize(26)} color={'#222'} />
                </RNBounceable>
            </View>

            <View style={styles.center}>
                <Text style={styles.handle_text} numberOfLines={1} ellipsizeMode="tail">{handle}</Text>
            </View>

            <View style={styles.sideRight}>
                <RNBounceable onPress={toMessages} hitSlop={10}>
                    <View style={styles.message_icon_btn}>
                        <Feather name="send" size={scaleSize(18)} color={'#3CA5FF'} />
                    </View>
                </RNBounceable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: scaleSize(22),
        paddingBottom: scaleSize(15),
        paddingTop: scaleSize(6),
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaleSize(8),
    },
    handle_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
        padding: scaleSize(2),
        color: '#666',
        maxWidth: '100%'
    },
    sideLeft: {
        width: scaleSize(56),
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    sideRight: {
        width: scaleSize(56),
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    message_icon_btn: {
        width: scaleSize(36),
        height: scaleSize(36),
        borderRadius: scaleSize(18),
        backgroundColor: '#E8F4FF',
        borderWidth: scaleSize(1),
        borderColor: 'rgba(60,165,255,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.07,
        shadowOffset: { width: 0, height: scaleSize(1) },
        shadowRadius: scaleSize(2),
        elevation: 2,
    }
});
