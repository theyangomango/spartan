import { StyleSheet, View, Text } from "react-native";
import { ArrowDown2, ArrowLeft2, DirectInbox } from "iconsax-react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";
import { getUnifiedHeaderMetrics } from "../../theme/headerMetrics";

const METRICS = getUnifiedHeaderMetrics();
const ICON_SIZE = METRICS.iconSize;
const HEADER_HORIZONTAL_PADDING = Math.max(0, METRICS.paddingH - scaleSize(6));
const ICON_WRAPPER_SIZE = scaleSize(ICON_SIZE + 2);
const ICON_COLOR = "#CBD5E1";
const ICON_STROKE_WIDTH = 2.4;

export default function ViewProfileHeader({ handle, goBack, toMessages, onOpenOptions }) {
    return (
        <View style={styles.main_ctnr}>
            <RNBounceable onPress={withStrongPress(goBack)} hitSlop={10} style={styles.iconBtn}>
                <ArrowLeft2 size={ICON_SIZE} color={ICON_COLOR} strokeWidth={ICON_STROKE_WIDTH} />
            </RNBounceable>

            <RNBounceable onPress={withStrongPress(onOpenOptions)} hitSlop={10} style={styles.center}>
                <View style={styles.handleRow}>
                    <Text style={styles.handle_text} numberOfLines={1} ellipsizeMode="tail">
                        {handle}
                    </Text>
                    <ArrowDown2
                        size={scaleSize(18)}
                        color={theme.textSecondary}
                        strokeWidth={ICON_STROKE_WIDTH}
                        style={styles.centerChevron}
                    />
                </View>
            </RNBounceable>

            <RNBounceable onPress={withStrongPress(toMessages)} hitSlop={10} style={styles.iconBtn}>
                <DirectInbox size={ICON_SIZE} color={ICON_COLOR} strokeWidth={ICON_STROKE_WIDTH} />
            </RNBounceable>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: HEADER_HORIZONTAL_PADDING,
        paddingBottom: METRICS.paddingBottom,
        paddingTop: METRICS.paddingTop,
        marginTop: METRICS.marginTop,
        minHeight: METRICS.paddingTop + METRICS.paddingBottom + METRICS.centerH,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(6),
        height: METRICS.centerH,
        paddingBottom: scaleSize(3.5),
    },
    handleRow: {
        flexDirection: "row",
        alignItems: "center",
        maxWidth: "100%",
    },
    handle_text: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(17),
        color: theme.textPrimary,
        maxWidth: "100%",
        includeFontPadding: false,
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
