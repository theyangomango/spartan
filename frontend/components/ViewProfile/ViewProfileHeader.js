import { StyleSheet, View } from "react-native";
import { Send2 } from "iconsax-react-native";
import { Ionicons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";
import { getUnifiedHeaderMetrics } from "../../theme/headerMetrics";
import VerifiedHandle from "../common/VerifiedHandle";
import { RANK_BADGE_ASPECT_RATIO } from "../2_Competition/RankBadgeEmblem";
import ProfileRankBadge from "../5_Profile/ProfileTop/ProfileRankBadge";

const METRICS = getUnifiedHeaderMetrics();
const ICON_SIZE = METRICS.iconSize;
const HEADER_HORIZONTAL_PADDING = Math.max(0, METRICS.paddingH - scaleSize(6));
const ICON_WRAPPER_SIZE = scaleSize(ICON_SIZE + 2);
const ICON_COLOR = "#CBD5E1";
const ICON_STROKE_WIDTH = 2.4;
const RANK_BADGE_SIZE = scaleSize(40);
const RANK_BADGE_GAP = scaleSize(2);
// Both sides take the same width so the handle stays centred.
const SIDE_SLOT_WIDTH = RANK_BADGE_SIZE * RANK_BADGE_ASPECT_RATIO + RANK_BADGE_GAP + ICON_WRAPPER_SIZE;

export default function ViewProfileHeader({ handle, goBack, toMessages, onOpenOptions, isVerified = false, user = null }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.side}>
                <RNBounceable onPress={withStrongPress(goBack)} hitSlop={10} style={styles.iconBtn}>
                    <Ionicons name="chevron-back" size={ICON_SIZE} color={theme.textSecondary} />
                </RNBounceable>
            </View>

            <RNBounceable style={styles.center} onPress={withStrongPress(onOpenOptions)}>
                <View style={styles.handleRow}>
                    <VerifiedHandle
                        handle={handle}
                        isVerified={isVerified}
                        textStyle={styles.handle_text}
                        numberOfLines={1}
                        containerStyle={styles.handleInner}
                        iconSize={scaleSize(18)}
                        iconStyle={{ marginTop: -Math.round((Number(styles.handle_text.fontSize) || scaleSize(17)) * 0.14) }}
                    />
                </View>
            </RNBounceable>

            <View style={[styles.side, styles.sideRight]}>
                <ProfileRankBadge user={user} size={RANK_BADGE_SIZE} style={styles.rankBadge} />
                <RNBounceable onPress={withStrongPress(toMessages)} hitSlop={10} style={styles.iconBtn}>
                    <Send2 size={ICON_SIZE} color={ICON_COLOR} strokeWidth={ICON_STROKE_WIDTH} variant="Linear" />
                </RNBounceable>
            </View>
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
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(17),
        color: theme.textPrimary,
        maxWidth: "100%",
        flexShrink: 1,
        includeFontPadding: false,
    },
    side: {
        width: SIDE_SLOT_WIDTH,
        flexDirection: "row",
        alignItems: "center",
    },
    sideRight: {
        justifyContent: "flex-end",
    },
    rankBadge: {
        marginRight: RANK_BADGE_GAP,
    },
    iconBtn: {
        width: ICON_WRAPPER_SIZE,
        height: ICON_WRAPPER_SIZE,
        borderRadius: ICON_WRAPPER_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
    },
});
