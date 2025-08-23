import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import { Entypo, FontAwesome } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';

const { width, height } = Dimensions.get("window");

const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) {
        return {
            cardHeight: 87,
            selfCardHeight: 97,
            pfpSize: 60,
            handleTextFontSize: 18,
            nameTextFontSize: 17,
            statTextFontSize: 17,
            rankTextFontSize: 16.5,
            bestSetTextFontSize: 14.5,
        };
    } else if (width >= 390 && height >= 844) {
        return {
            cardHeight: 82,
            selfCardHeight: 92,
            pfpSize: 56,
            handleTextFontSize: 16,
            nameTextFontSize: 14.5,
            statTextFontSize: 15.5,
            rankTextFontSize: 14,
            bestSetTextFontSize: 13,
        };
    } else if (width >= 375 && height >= 812) {
        return {
            cardHeight: 77,
            selfCardHeight: 87,
            pfpSize: 54,
            handleTextFontSize: 15,
            nameTextFontSize: 14,
            statTextFontSize: 15,
            rankTextFontSize: 13.5,
            bestSetTextFontSize: 12.5,
        };
    } else {
        return {
            cardHeight: 72,
            selfCardHeight: 82,
            pfpSize: 52,
            handleTextFontSize: 14.5,
            nameTextFontSize: 13.5,
            statTextFontSize: 14.5,
            rankTextFontSize: 13,
            bestSetTextFontSize: 12,
        };
    }
};

const dynamicStyles = getDynamicStyles();

/**
 * Props (new ones are optional & tribe-aware):
 * - pfp, handle, name, value, rank, lastRank, handlePress, userIsSelf, bestSet
 * - metric?: '1RM' | 'Volume' | 'Reps'            // default '1RM'
 * - exercise?: string                              // default 'Bench Press (Barbell)'
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
    exercise = 'Bench Press (Barbell)',
    normalizeByBodyweight = false,
    showBestSetWhenNotTribe = true,
    isTribeFocused = false,
}) {
    // Format the large stat and unit depending on metric & normalization
    const { statText, unitText } = formatStat(value, metric, normalizeByBodyweight);

    // Subline:
    // - If tribe-focused (or normalization is on), show metric/exercise summary.
    // - Else keep your original "best set" line.
    const showMetricSubline = isTribeFocused || normalizeByBodyweight;
    const bestSetIsNA = !bestSet || (bestSet.reps === 0 && bestSet.weight === 0);

    return (
        <RNBounceable
            onPress={handlePress}
            style={
                userIsSelf
                    ? [styles.self_card_ctnr, { height: dynamicStyles.selfCardHeight }]
                    : [styles.card_ctnr, { height: dynamicStyles.cardHeight }]
            }
        >
            <View style={styles.card_left}>
                <Text style={[styles.rank_text, { fontSize: dynamicStyles.rankTextFontSize }]}>{rank}</Text>

                {lastRank && lastRank < rank && <Entypo name='chevron-down' size={20} color='red' style={styles.arrow_icon} />}
                {lastRank && lastRank > rank && <Entypo name='chevron-up' size={20} color='#23B665' style={styles.arrow_icon} />}
                {(lastRank == null && value > 0) && <Entypo name='chevron-up' size={20} color='#23B665' style={styles.arrow_icon} />}
                {(lastRank == null && value === 0) && <FontAwesome name='minus' size={16} color='#aaa' style={styles.minus_icon} />}
                {(lastRank && lastRank === rank) && <FontAwesome name='minus' size={16} color='#aaa' style={styles.minus_icon} />}

                <View style={[styles.pfp_ctnr, { width: dynamicStyles.pfpSize }]}>
                    <FastImage
                        source={{ uri: pfp }}
                        style={styles.pfp}
                        resizeMode={FastImage.resizeMode.cover}
                    />
                </View>
                <View>
                    <Text style={[styles.handle_text, { fontSize: dynamicStyles.handleTextFontSize }]} numberOfLines={1}>
                        {handle}
                    </Text>
                    <Text style={[styles.name_text, { fontSize: dynamicStyles.nameTextFontSize }]} numberOfLines={1}>
                        {name}
                    </Text>
                </View>
            </View>

            <View style={styles.card_right}>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.stat_text, { fontSize: dynamicStyles.statTextFontSize }]}>
                        {statText} {unitText}
                    </Text>

                    {showMetricSubline ? (
                        <Text style={[styles.best_set_text, { fontSize: dynamicStyles.bestSetTextFontSize }]} numberOfLines={1}>
                            {metric}
                            {normalizeByBodyweight ? ' • per lb BW' : ''}
                            {exercise ? ` • ${exercise}` : ''}
                        </Text>
                    ) : showBestSetWhenNotTribe ? (
                        bestSetIsNA ? (
                            <Text style={[styles.best_set_text, { fontSize: dynamicStyles.bestSetTextFontSize }]}>N/A</Text>
                        ) : (
                            <Text style={[styles.best_set_text, { fontSize: dynamicStyles.bestSetTextFontSize }]} numberOfLines={1}>
                                {bestSet.reps} x {bestSet.weight} lbs
                            </Text>
                        )
                    ) : null}
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

    if (metric === 'Reps') {
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
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 10,
        paddingRight: 14,
        marginBottom: 12.5,
    },
    self_card_ctnr: {
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 10,
        paddingRight: 14,
        borderWidth: 2.5,
        borderColor: '#57B2FF',
        backgroundColor: '#F7FBFF',
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
        borderRadius: 100,
        backgroundColor: '#e9eef5',
    },
    handle_text: {
        fontFamily: 'Outfit_600SemiBold',
        paddingHorizontal: 12,
        color: '#333',
        maxWidth: width * 0.45,
    },
    name_text: {
        marginTop: 1.5,
        fontFamily: 'Outfit_500Medium',
        paddingHorizontal: 12,
        color: '#999',
        maxWidth: width * 0.45,
    },
    card_right: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'center',
        maxWidth: width * 0.35,
    },
    stat_text: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#2D9EFF',
        textAlign: 'right',
    },
    best_set_text: {
        fontFamily: 'Outfit_500Medium',
        color: '#777',
        marginTop: 4,
        textAlign: 'right',
    },
    rank_text: {
        fontFamily: 'Poppins_600SemiBold',
        color: '#333',
    },
    arrow_icon: {
        marginLeft: 1,
        marginRight: 7,
    },
    minus_icon: {
        marginLeft: 7,
        marginRight: 10,
    },
});
