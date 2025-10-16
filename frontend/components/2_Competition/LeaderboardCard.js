import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import { Entypo, FontAwesome } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';
import scaleSize from '../../helper/scaleSize';
import { withStrongPress } from '../../utils/haptics';
const ts = require('../../helper/scaleSize').ts;
import theme from '../../theme/mfpDark';

const { width } = Dimensions.get("window");

// Scaled sizes (baseline ~ iPhone 12/13: 390x844)
const CARD_HEIGHT = scaleSize(64);
const SELF_CARD_HEIGHT = scaleSize(86);
const PFP_SIZE = scaleSize(37);

const FONT_HANDLE = ts(13);
const FONT_NAME = ts(12.5);
const FONT_STAT = ts(13);
const FONT_HEX_STAT = ts(13);
const FONT_RANK = ts(12.5);
const FONT_BEST = ts(13);

const ICON_ARROW = scaleSize(20);
const ICON_MINUS = scaleSize(16);

/**
 * Props (new ones are optional & tribe-aware):
 * - pfp, handle, name, value, rank, lastRank, handlePress, userIsSelf, bestSet
 * - metric?: '1RM' | 'Volume' | 'Reps'            // default '1RM'
 * - exercise?: string                              // default 'Overall'
 * - normalizeByBodyweight?: boolean                // default false
 * - showBestSetWhenNotTribe?: boolean              // default true
 * - isTribeFocused?: boolean                       // default false (purely cosmetic fallback)
 */
export default function LeaderboardCard({
    pfp,
    handle,
    name,
    value,
    rank,
    lastRank,
    handlePress,
    userIsSelf = false,
    bestSet = { reps: 0, weight: 0 },

    // NEW (all optional)
    metric = '1RM',
    exercise = 'Overall',
    normalizeByBodyweight = false,
    showBestSetWhenNotTribe = true,
    isTribeFocused = false,
    missingWeightData = false,
    // Custom background color for the card (from Competition screen)
    bgColor,
}) {
    // Format the large stat and unit depending on metric & normalization
    const { statText, unitText } = formatStat(value, metric, normalizeByBodyweight);
    const isHexMetric = String(metric) === 'Hex';
    const statFontSize = scaleSize(isHexMetric ? FONT_HEX_STAT : FONT_STAT);

    // Subline: Only show best set when metric is '1RM'.
    // Otherwise, show nothing under the blue stat.
    const showBestSet = String(metric) === '1RM';
    const bestSetIsNA = !bestSet || (bestSet.reps === 0 && bestSet.weight === 0);

    const rankNumber = Number(rank);
    const lastRankNumber = Number(lastRank);
    const hasRank = Number.isFinite(rankNumber);
    const hasLastRank = Number.isFinite(lastRankNumber) && lastRankNumber > 0;

    let trendIcon = null;
    if (hasRank) {
        if (hasLastRank) {
            if (lastRankNumber > rankNumber) {
                trendIcon = <Entypo name='chevron-up' size={ICON_ARROW} color='#23B665' style={styles.arrow_icon} />;
            } else if (lastRankNumber < rankNumber) {
                trendIcon = <Entypo name='chevron-down' size={ICON_ARROW} color='red' style={styles.arrow_icon} />;
            } else {
                trendIcon = <FontAwesome name='minus' size={ICON_MINUS} color='#aaa' style={styles.minus_icon} />;
            }
        } else {
            trendIcon = <FontAwesome name='minus' size={ICON_MINUS} color='#aaa' style={styles.minus_icon} />;
        }
    }

    return (
        <RNBounceable
            onPress={withStrongPress(handlePress)}
            style={
                userIsSelf
                    ? [styles.self_card_ctnr, { height: SELF_CARD_HEIGHT, backgroundColor: bgColor || require("../../theme/mfpDark").default.bg }]
                    : [styles.card_ctnr, { height: CARD_HEIGHT, backgroundColor: bgColor || require("../../theme/mfpDark").default.bg }]
            }
        >
            <View style={styles.card_left}>
                <Text style={[styles.rank_text, { fontSize: scaleSize(FONT_RANK) }]}>{rank}</Text>
                {trendIcon}

                <View style={[styles.pfp_ctnr, { width: PFP_SIZE }]}>
                    <FastImage
                        source={{ uri: pfp }}
                        style={styles.pfp}
                        resizeMode={FastImage.resizeMode.cover}
                    />
                </View>
                <View>
                    <Text style={[styles.handle_text, { fontSize: scaleSize(FONT_HANDLE) }]} numberOfLines={1}>
                        {handle}
                    </Text>
                    <Text style={[styles.name_text, { fontSize: scaleSize(FONT_NAME) }]} numberOfLines={1}>
                        {name}
                    </Text>
                </View>
            </View>
            <View style={styles.card_right}>
                <View style={{ alignItems: 'flex-end' }}>
                    {missingWeightData ? (
                        <>
                            <Text style={[styles.stat_text, { fontSize: statFontSize }]}>—</Text>
                            <Text style={[styles.best_set_text, { fontSize: scaleSize(FONT_BEST) }]}>No Weight Data</Text>
                        </>
                    ) : (
                        <>
                            <Text style={[styles.stat_text, { fontSize: statFontSize }]}>
                                {unitText ? `${statText} ${unitText}` : statText}
                            </Text>
                            {showBestSet ? (
                                showBestSetWhenNotTribe ? (
                                    bestSetIsNA ? (
                                        // <Text style={[styles.best_set_text, { fontSize: scaleSize(FONT_BEST) }]}>N/A</Text>
                                        <></>
                                    ) : (
                                        <Text style={[styles.best_set_text, { fontSize: scaleSize(FONT_BEST) }]} numberOfLines={1}>
                                            {bestSet.reps} x {bestSet.weight} lbs
                                        </Text>
                                    )
                                ) : null
                            ) : null}
                        </>
                    )}
                </View>
            </View>
        </RNBounceable>
    );
}

/** Helpers */
function formatStat(value, metric, normalizeByBodyweight) {
    const v = Number(value) || 0;
    // Defaults (previous behavior): 1RM in lbs, no normalization.
    let statText = Math.round(v).toString();
    let unitText = 'lbs';

    if (metric === 'Hex') {
        statText = v.toFixed(1);
        unitText = null;
    } else if (metric === 'Reps') {
        if (normalizeByBodyweight) {
            statText = v.toFixed(2);
            unitText = 'reps/lb';
        } else {
            statText = Math.round(v).toString();
            unitText = 'reps';
        }
    } else if (metric === 'Volume') {
        if (normalizeByBodyweight) {
            statText = v.toFixed(2);
            unitText = 'lb/lb';
        } else {
            statText = Math.round(v).toString();
            unitText = 'lbs';
        }
    } else {
        // metric === '1RM'
        if (normalizeByBodyweight) {
            statText = v.toFixed(2);
            unitText = '× BW';
        } else {
            statText = Math.round(v).toString();
            unitText = 'lbs';
        }
    }

    return { statText, unitText };
}

const styles = StyleSheet.create({
    card_ctnr: {
        borderRadius: scaleSize(20),
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: scaleSize(10),
        paddingRight: scaleSize(14),
        marginBottom: scaleSize(12.5),
        // Match app background for unified canvas inside sheet
        backgroundColor: require("../../theme/mfpDark").default.bg,
    },
    self_card_ctnr: {
        borderRadius: scaleSize(20),
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: scaleSize(10),
        paddingRight: scaleSize(14),
        borderWidth: scaleSize(2.5),
        borderColor: '#57B2FF',
        backgroundColor: require("../../theme/mfpDark").default.bg,
    },
    card_left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pfp_ctnr: {
        aspectRatio: 1,
    },
    pfp: {
        flex: 1,
        borderRadius: scaleSize(100),
        backgroundColor: '#2D3441',
    },
    handle_text: {
        fontFamily: 'Outfit_700Bold',
        paddingHorizontal: scaleSize(12),
        color: require("../../theme/mfpDark").default.textPrimary,
        maxWidth: scaleSize(width * 0.45),
        letterSpacing: 0.2,
    },
    name_text: {
        marginTop: scaleSize(1.5),
        fontFamily: 'Outfit_500Medium',
        paddingHorizontal: scaleSize(12),
        color: require("../../theme/mfpDark").default.textSecondary,
        maxWidth: scaleSize(width * 0.45),
    },
    card_right: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'center',
        maxWidth: scaleSize(width * 0.35),
    },
    stat_text: {
        fontFamily: 'Outfit_700Bold',
        color: require("../../theme/mfpDark").default.accentBlue,
        textAlign: 'right',
        letterSpacing: 0.2,
    },
    best_set_text: {
        fontFamily: 'Outfit_500Medium',
        color: require("../../theme/mfpDark").default.textSecondary,
        marginTop: scaleSize(4),
        textAlign: 'right',
    },
    rank_text: {
        fontFamily: 'Poppins_700Bold',
        color: require("../../theme/mfpDark").default.textPrimary,
    },
    arrow_icon: {
        marginLeft: scaleSize(1),
        marginRight: scaleSize(7),
    },
    minus_icon: {
        marginLeft: scaleSize(7),
        marginRight: scaleSize(10),
    },
});
