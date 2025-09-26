import { StyleSheet, View, Text } from "react-native";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";
import { getUnifiedHeaderMetrics } from "../../theme/headerMetrics";

const METRICS = getUnifiedHeaderMetrics();
const ICON_SIZE = METRICS.iconSize;
const ICON_WRAPPER_SIZE = scaleSize(ICON_SIZE + 6);
const ICON_COLOR = "#CBD5E1";

export default function ViewProfileHeader({ handle, goBack, toMessages, onOpenOptions }) {
    return (
        <View style={styles.main_ctnr}>
            <RNBounceable onPress={withStrongPress(goBack)} hitSlop={10} style={styles.iconBtn}>
                <Ionicons name="chevron-back" size={ICON_SIZE} color={ICON_COLOR} />
            </RNBounceable>

            <RNBounceable onPress={withStrongPress(onOpenOptions)} hitSlop={10} style={styles.center}>
                <View style={styles.handleRow}>
                    <Text style={styles.handle_text} numberOfLines={1} ellipsizeMode="tail">
                        {handle}
                    </Text>
                    <Feather
                        name="chevron-down"
                        size={scaleSize(18)}
                        color={theme.textSecondary}
                        style={styles.centerChevron}
                    />
                </View>
            </RNBounceable>

            <RNBounceable onPress={withStrongPress(toMessages)} hitSlop={10} style={styles.iconBtn}>
                <MaterialIcons name="alternate-email" size={ICON_SIZE + 1.5} color={ICON_COLOR} />
            </RNBounceable>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: METRICS.paddingH,
        paddingBottom: METRICS.paddingBottom,
        paddingTop: METRICS.paddingTop,
        marginTop: METRICS.marginTop,
        minHeight: METRICS.paddingTop + METRICS.paddingBottom + METRICS.centerH,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(12),
    },
    handleRow: {
        flexDirection: "row",
        alignItems: "center",
        maxWidth: "100%",
    },
    handle_text: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(16),
        padding: scaleSize(2),
        color: theme.textPrimary,
        maxWidth: "100%",
    },
    centerChevron: {
        marginLeft: scaleSize(4),
    },
    iconBtn: {
        width: ICON_WRAPPER_SIZE,
        height: ICON_WRAPPER_SIZE,
        borderRadius: ICON_WRAPPER_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
    },
});
