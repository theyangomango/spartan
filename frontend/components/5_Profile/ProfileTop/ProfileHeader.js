import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { Setting2, Add } from "iconsax-react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";
import { withStrongPress } from "../../../utils/haptics";
import { getUnifiedHeaderMetrics } from "../../../theme/headerMetrics";
import VerifiedHandle from "../../common/VerifiedHandle";
import { RANK_TIER_THEMES } from "../../1_Feed/FeedSnapshotCard";

const METRICS = getUnifiedHeaderMetrics();
const ICON_SIZE = METRICS.iconSize;
const HEADER_HORIZONTAL_PADDING = Math.max(0, METRICS.paddingH - scaleSize(6));
const ICON_WRAPPER_SIZE = scaleSize(ICON_SIZE + 2);
const ICON_COLOR = "#CBD5E1";
const ICON_STROKE_WIDTH = 2.4;
const CREATE_ICON_SIZE = ICON_SIZE + scaleSize(3.2);
const CREATE_ICON_STROKE_WIDTH = 3.25;

export default function ProfileHeader({ userData, onPressCreateBtn, onPressSettings }) {
    const handle = typeof userData?.handle === 'string' ? userData.handle : (global?.userData?.handle || '');
    const isVerified = Boolean(
        userData?.isVerified ??
        userData?.verified ??
        global?.userData?.isVerified ??
        global?.userData?.verified ??
        false
    );
    const rankTierKey = (() => {
        const candidates = [
            userData?.rankTier,
            userData?.currentRank?.tier,
            userData?.currentRank?.rankTier,
            userData?.rank?.tier,
            userData?.rank?.rankTier,
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
            <RNBounceable style={styles.iconBtn} onPress={withStrongPress(onPressSettings)}>
                <Setting2 size={ICON_SIZE} color={ICON_COLOR} variant="Linear" strokeWidth={ICON_STROKE_WIDTH} />
            </RNBounceable>
            <RNBounceable>
                <View style={styles.center}>
                    <VerifiedHandle
                        handle={handle}
                        isVerified={isVerified}
                        textStyle={[styles.handle_text, { color: handleColor }]}
                        numberOfLines={1}
                        containerStyle={styles.handleRow}
                        iconSize={scaleSize(18)}
                        iconStyle={{ marginTop: -Math.round((Number(styles.handle_text.fontSize) || scaleSize(17)) * 0.14) }}
                    />
                    {/* <View style={styles.down_arrow_ctnr}>
                        <Entypo name="chevron-down" size={scaleSize(18)} color="#A3A7B0" />
                    </View> */}
                </View>
            </RNBounceable>
            <View style={styles.right}>
                <RNBounceable style={styles.iconBtn} onPress={withStrongPress(onPressCreateBtn)}>
                    <Add size={CREATE_ICON_SIZE} color={ICON_COLOR} variant="Linear" strokeWidth={CREATE_ICON_STROKE_WIDTH} />
                </RNBounceable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: HEADER_HORIZONTAL_PADDING,
        paddingBottom: METRICS.paddingBottom,
        paddingTop: METRICS.paddingTop,
        marginTop: METRICS.marginTop,
        minHeight: METRICS.paddingTop + METRICS.paddingBottom + METRICS.centerH,
    },
    center: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: scaleSize(3.5),
    },
    handleRow: {
        flexShrink: 1,
    },
    handle_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaleSize(15),
        color: theme.textPrimary,
        flexShrink: 1,
        includeFontPadding: false,
    },
    down_arrow_ctnr: {
        justifyContent: 'center',
    },
    right: {
        flexDirection: 'row',
    },
    iconBtn: {
        width: ICON_WRAPPER_SIZE,
        height: ICON_WRAPPER_SIZE,
        borderRadius: ICON_WRAPPER_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
