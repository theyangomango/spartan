import { StyleSheet, View, Text } from "react-native";
import { ArrowDown2, Send2 } from "iconsax-react-native";
import { Ionicons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";
import { getUnifiedHeaderMetrics } from "../../theme/headerMetrics";
import VerifiedHandle from "../common/VerifiedHandle";
import { RANK_TIER_THEMES } from "../1_Feed/FeedSnapshotCard";
import resolveRankTierKey, { resolveRankLabel } from "../../utils/resolveRankTierKey";
import resolveHandleColor from "../../utils/resolveHandleColor";

const METRICS = getUnifiedHeaderMetrics();
const ICON_SIZE = METRICS.iconSize;
const HEADER_HORIZONTAL_PADDING = Math.max(0, METRICS.paddingH - scaleSize(6));
const ICON_WRAPPER_SIZE = scaleSize(ICON_SIZE + 2);
const ICON_COLOR = "#CBD5E1";
const ICON_STROKE_WIDTH = 2.4;
const CENTER_MAX_WIDTH = 0.72;

export default function ViewProfileHeader({ handle, goBack, toMessages, onOpenOptions, isVerified = false, user = null }) {
    const rankTierKey = resolveRankTierKey(user);
    const rankTheme = (() => {
        const key = rankTierKey || "bronze";
        return RANK_TIER_THEMES[key] || RANK_TIER_THEMES.bronze;
    })();
    const handleColor = resolveHandleColor(user, { rankTierKey, rankTheme });
    const rankLabel = resolveRankLabel(user, rankTierKey, rankTheme) || rankTheme?.displayName || null;
    const rankTextColor = handleColor;

    return (
        <View style={styles.main_ctnr}>
            <RNBounceable onPress={withStrongPress(goBack)} hitSlop={10} style={styles.iconBtn}>
                <Ionicons name="chevron-back" size={ICON_SIZE} color={theme.textSecondary} />
            </RNBounceable>

            <RNBounceable style={styles.center} onPress={withStrongPress(onOpenOptions)}>
                <View style={styles.handleRow}>
                    <VerifiedHandle
                        handle={handle}
                        isVerified={isVerified}
                        textStyle={[styles.handle_text, { color: handleColor }]}
                        numberOfLines={1}
                        containerStyle={styles.handleInner}
                        iconSize={scaleSize(18)}
                        iconStyle={{ marginTop: -Math.round((Number(styles.handle_text.fontSize) || scaleSize(17)) * 0.14) }}
                    />
                    {/* <ArrowDown2
                        size={scaleSize(18)}
                        color={theme.textSecondary}
                        strokeWidth={ICON_STROKE_WIDTH}
                        style={styles.centerChevron}
                    /> */}
                </View>
                {rankLabel ? (
                    <Text
                        style={[styles.rank_text, { color: rankTextColor }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {rankLabel}
                    </Text>
                ) : null}
            </RNBounceable>

            <RNBounceable onPress={withStrongPress(toMessages)} hitSlop={10} style={styles.iconBtn}>
                <Send2 size={ICON_SIZE} color={ICON_COLOR} strokeWidth={ICON_STROKE_WIDTH} variant="Linear" />
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
        marginBottom: scaleSize(8),
        overflow: "visible",
    },
    center: {
        alignItems: "center",
        paddingTop: scaleSize(4),
        paddingBottom: scaleSize(2),
        justifyContent: "center",
        paddingHorizontal: scaleSize(6),
        maxWidth: `${CENTER_MAX_WIDTH * 100}%`,
        flexShrink: 1,
        height: METRICS.centerH,
    },
    handleRow: {
        flexDirection: "row",
        alignItems: "center",
        maxWidth: "100%",
        flexShrink: 1,
    },
    handleInner: {
        maxWidth: "100%",
        flexShrink: 1,
    },
    handle_text: {
        fontFamily: "Poppins_700Bold",
        fontSize: scaleSize(15),
        color: theme.textPrimary,
        maxWidth: "100%",
        flexShrink: 1,
        includeFontPadding: false,
    },
    rank_text: {
        fontFamily: "Poppins_600SemiBold",
        fontSize: scaleSize(11),
        marginTop: scaleSize(2),
        maxWidth: "100%",
        flexShrink: 1,
        includeFontPadding: false,
    },
    centerChevron: {
        marginLeft: scaleSize(6),
    },
    iconBtn: {
        width: ICON_WRAPPER_SIZE,
        height: ICON_WRAPPER_SIZE,
        borderRadius: ICON_WRAPPER_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
    },
});
