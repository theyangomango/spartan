import { StyleSheet, View } from "react-native";
import { ArrowDown2, Send2 } from "iconsax-react-native";
import { Ionicons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";
import { getUnifiedHeaderMetrics } from "../../theme/headerMetrics";
import VerifiedHandle from "../common/VerifiedHandle";
import { RANK_TIER_THEMES } from "../1_Feed/FeedSnapshotCard";

const METRICS = getUnifiedHeaderMetrics();
const ICON_SIZE = METRICS.iconSize;
const HEADER_HORIZONTAL_PADDING = Math.max(0, METRICS.paddingH - scaleSize(6));
const ICON_WRAPPER_SIZE = scaleSize(ICON_SIZE + 2);
const ICON_COLOR = "#CBD5E1";
const ICON_STROKE_WIDTH = 2.4;

export default function ViewProfileHeader({ handle, goBack, toMessages, onOpenOptions, isVerified = false, user = null }) {
    const rankTierKey = (() => {
        const candidates = [
            user?.rankTier,
            user?.currentRank?.tier,
            user?.currentRank?.rankTier,
            user?.rank?.tier,
            user?.rank?.rankTier,
        ];
        for (const val of candidates) {
            if (typeof val === "string" && val.trim()) return val.trim().toLowerCase();
        }
        return null;
    })();
    const rankTheme = (() => {
        const key = rankTierKey || "gold";
        return RANK_TIER_THEMES[key] || RANK_TIER_THEMES.gold;
    })();
    const handleColor = (() => {
        const bronzeAccent =
            rankTierKey === "bronze"
                ? (Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[1] : "#b94f1f")
                : null;
        const candidates = [
            bronzeAccent,
            Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[1] : null,
            Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[2] : null,
            rankTheme?.borderColor,
            rankTheme?.titleSecondaryColor,
        ];
        for (const c of candidates) {
            if (typeof c === "string" && c.trim()) return c;
        }
        return theme.textPrimary;
    })();

    return (
        <View style={styles.main_ctnr}>
            <RNBounceable onPress={withStrongPress(goBack)} hitSlop={10} style={styles.iconBtn}>
                <Ionicons name="chevron-back" size={ICON_SIZE} color={theme.textSecondary} />
            </RNBounceable>

            <RNBounceable onPress={withStrongPress(onOpenOptions)} hitSlop={10} style={styles.center}>
                <View style={styles.handleRow}>
                    <VerifiedHandle
                        handle={handle}
                        isVerified={isVerified}
                        textStyle={[styles.handle_text, { color: handleColor }]}
                        numberOfLines={1}
                        containerStyle={styles.handleInner}
                        iconSize={scaleSize(18)}
                        iconStyle={{ marginTop: -Math.round(scaleSize(17) * 0.14) }}
                    />
                    {/* <ArrowDown2
                        size={scaleSize(18)}
                        color={theme.textSecondary}
                        strokeWidth={ICON_STROKE_WIDTH}
                        style={styles.centerChevron}
                    /> */}
                </View>
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
    },
    center: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(6),
        height: METRICS.centerH,
        paddingBottom: scaleSize(3.5),
        flexShrink: 1,
        flexGrow: 0,
        maxWidth: "65%",
        alignSelf: "center",
    },
    handleRow: {
        flexDirection: "row",
        alignItems: "center",
        maxWidth: "100%",
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
