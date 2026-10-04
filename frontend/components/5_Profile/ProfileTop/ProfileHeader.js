import React from "react";
import { StyleSheet, View } from "react-native";
import { Setting2 } from "iconsax-react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";
import { withStrongPress } from "../../../utils/haptics";
import { getUnifiedHeaderMetrics } from "../../../theme/headerMetrics";
import VerifiedHandle from "../../common/VerifiedHandle";
import { RANK_BADGE_ASPECT_RATIO } from "../../2_Competition/RankBadgeEmblem";
import ProfileRankBadge from "./ProfileRankBadge";

const METRICS = getUnifiedHeaderMetrics();
const ICON_SIZE = METRICS.iconSize;
const HEADER_HORIZONTAL_PADDING = Math.max(0, METRICS.paddingH - scaleSize(6));
const ICON_WRAPPER_SIZE = scaleSize(ICON_SIZE + 2);
const ICON_COLOR = "#CBD5E1";
const ICON_STROKE_WIDTH = 2.4;
const RANK_BADGE_SIZE = scaleSize(40);
// The emblem's box leaves room around the medal for its glow and wings, so it overhangs the
// icon column to keep the medal itself lined up with the settings icon opposite.
const RANK_BADGE_OVERHANG = scaleSize(13);
// Both sides take the same width so the handle stays centred.
const SIDE_SLOT_WIDTH = RANK_BADGE_SIZE * RANK_BADGE_ASPECT_RATIO - RANK_BADGE_OVERHANG;

export default function ProfileHeader({ userData, onPressSettings }) {
    const handle = typeof userData?.handle === 'string' ? userData.handle : (global?.userData?.handle || '');
    const isVerified = Boolean(
        userData?.isVerified ??
        userData?.verified ??
        global?.userData?.isVerified ??
        global?.userData?.verified ??
        false
    );

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.side}>
                <RNBounceable style={styles.iconBtn} onPress={withStrongPress(onPressSettings)}>
                    <Setting2 size={ICON_SIZE} color={ICON_COLOR} variant="Linear" strokeWidth={ICON_STROKE_WIDTH} />
                </RNBounceable>
            </View>
            <RNBounceable>
                <View style={styles.center}>
                    <VerifiedHandle
                        handle={handle}
                        isVerified={isVerified}
                        textStyle={styles.handle_text}
                        numberOfLines={1}
                        containerStyle={styles.handleRow}
                        iconSize={scaleSize(18)}
                        iconStyle={{ marginTop: -Math.round((Number(styles.handle_text.fontSize) || scaleSize(17)) * 0.14) }}
                    />
                </View>
            </RNBounceable>
            <View style={[styles.side, styles.sideRight]}>
                <ProfileRankBadge user={userData} size={RANK_BADGE_SIZE} style={styles.rankBadge} />
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
        marginBottom: scaleSize(8),
        overflow: 'visible',
    },
    center: {
        alignItems: 'center',
        paddingTop: scaleSize(4),
        paddingBottom: scaleSize(2),
        justifyContent: 'center',
        paddingHorizontal: scaleSize(6),
        maxWidth: '100%',
        flexShrink: 1,
        flexGrow: 1,
        minWidth: 0,
        height: METRICS.centerH,
    },
    handleRow: {
        flexShrink: 1,
        flexGrow: 1,
        maxWidth: '100%',
        alignItems: 'center',
        minWidth: 0,
    },
    handle_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(17),
        color: theme.textPrimary,
        flexShrink: 1,
        flexGrow: 1,
        minWidth: 0,
        includeFontPadding: false,
    },
    side: {
        width: SIDE_SLOT_WIDTH,
        flexDirection: 'row',
        alignItems: 'center',
    },
    sideRight: {
        justifyContent: 'flex-end',
    },
    rankBadge: {
        marginRight: -RANK_BADGE_OVERHANG,
    },
    iconBtn: {
        width: ICON_WRAPPER_SIZE,
        height: ICON_WRAPPER_SIZE,
        borderRadius: ICON_WRAPPER_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
