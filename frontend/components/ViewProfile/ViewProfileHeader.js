import { StyleSheet, View, Text, Dimensions } from "react-native";
import { Feather } from '@expo/vector-icons';
import { Send2 } from 'iconsax-react-native';
import RNBounceable from "@freakycoder/react-native-bounceable";
import theme from "../../theme/mfpDark";

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
                    <Feather name="chevron-left" size={scaleSize(22.5)} color={theme.textSecondary} />
                </RNBounceable>
            </View>

            <View style={styles.center}>
                <Text style={styles.handle_text} numberOfLines={1} ellipsizeMode="tail">{handle}</Text>
            </View>

            <View style={styles.sideRight}>
                <RNBounceable onPress={toMessages} hitSlop={10}>
                    <View style={styles.message_icon_btn}>
                        <Send2 size={scaleSize(18)} color={theme.textSecondary} variant="Linear" />
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
        paddingBottom: scaleSize(8),
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
        color: theme.textPrimary,
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
        width: scaleSize(24),
        height: scaleSize(24),
        borderRadius: scaleSize(6),
        backgroundColor: 'transparent',
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'transparent',
        elevation: 0,
    }
});
