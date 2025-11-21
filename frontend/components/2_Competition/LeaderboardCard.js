import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import RNBounceable from '@freakycoder/react-native-bounceable';
import scaleSize from '../../helper/scaleSize';
import { withStrongPress } from '../../utils/haptics';
const ts = require('../../helper/scaleSize').ts;
import theme from '../../theme/mfpDark';
import VerifiedHandle from '../common/VerifiedHandle';

const { width } = Dimensions.get("window");

// Scaled sizes (baseline ~ iPhone 12/13: 390x844)
const CARD_HEIGHT = scaleSize(72);
const SELF_CARD_HEIGHT = scaleSize(96);
const PFP_SIZE = scaleSize(44);

const FONT_HANDLE = ts(15);
const FONT_NAME = ts(15);
const FONT_STAT = ts(13);
const FONT_HEX_STAT = ts(15);
const FONT_RANK = ts(13);
const FONT_BEST = ts(13);

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
    isVerified = false,

    // NEW (all optional)
    metric = '1RM',
    exercise = 'Overall',
    normalizeByBodyweight = false,
    showBestSetWhenNotTribe = true,
    isTribeFocused = false,
    missingWeightData = false,
    // Custom background color for the card (unused now, kept for backward compatibility)
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

    return (
        <RNBounceable
            onPress={withStrongPress(handlePress)}
            style={
                userIsSelf
                    ? [styles.self_card_ctnr, { height: SELF_CARD_HEIGHT }]
                    : [styles.card_ctnr, { height: CARD_HEIGHT }]
            }
        >
            <View style={styles.card_left}>
                <View style={styles.rankWrapper}>
                    <Text style={[styles.rank_text, { fontSize: scaleSize(FONT_RANK) }]}>{rank}</Text>
                </View>

                <View style={[styles.pfp_ctnr, { width: PFP_SIZE }]}>
                    <FastImage
                        source={{ uri: pfp }}
                        style={styles.pfp}
                        resizeMode={FastImage.resizeMode.cover}
                    />
                </View>
                <View>
                    <View style={isVerified ? styles.handleRowVerified : styles.handleRowUnverified}>
                        <VerifiedHandle
                            handle={handle}
                            isVerified={isVerified}
                            textStyle={[styles.handle_text, { fontSize: scaleSize(FONT_HANDLE) }]}
                            numberOfLines={1}
                            iconSize={scaleSize(15)}
                            containerStyle={styles.handle_row}
                        />
                    </View>

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
        paddingLeft: scaleSize(18),
        paddingRight: scaleSize(24),
        marginBottom: scaleSize(12.5),
        backgroundColor: theme.surface,
    },
    handle_row: {
        maxWidth: width * 0.45,
    },
    self_card_ctnr: {
        borderRadius: scaleSize(20),
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: scaleSize(16),
        paddingRight: scaleSize(20),
        borderWidth: scaleSize(2.5),
        borderColor: '#57B2FF',
        backgroundColor: theme.surface,
        marginBottom: scaleSize(12.5),
    },
    card_left: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: scaleSize(2),
    },
    rankWrapper: {
        minWidth: scaleSize(32),
        alignItems: 'flex-start',
        marginRight: scaleSize(8),
    },
    pfp_ctnr: {
        aspectRatio: 1,
        marginRight: scaleSize(10),
    },
    pfp: {
        flex: 1,
        borderRadius: scaleSize(100),
        backgroundColor: '#2D3441',
    },
    handleRowUnverified: {
        paddingLeft: scaleSize(12)
    },
    handleRowVerified: {
        paddingLeft: scaleSize(8)
    },
    handle_text: {
        fontFamily: 'Outfit_700Bold',
        color: require("../../theme/mfpDark").default.textPrimary,
        maxWidth: scaleSize(width * 0.45),
        letterSpacing: 0.2,
    },
    name_text: {
        marginTop: scaleSize(2),
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
});
