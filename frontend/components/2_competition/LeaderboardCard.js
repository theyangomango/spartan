import React from 'react';
import { Image, StyleSheet, Text, View, Dimensions } from 'react-native';
import { Entypo, FontAwesome } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';

const { width, height } = Dimensions.get("window");

// Function to determine dynamic styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
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
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
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
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
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
    } else { // Smaller iPhone models (like iPhone SE)
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

export default function LeaderboardCard({ pfp, handle, name, value, rank, lastRank, handlePress, userIsSelf = false, bestSet }) {
    return (
        <RNBounceable onPress={handlePress} style={userIsSelf ? [styles.self_card_ctnr, { height: dynamicStyles.selfCardHeight }] : [styles.card_ctnr, { height: dynamicStyles.cardHeight }]}>
            <View style={styles.card_left}>
                <Text style={[styles.rank_text, { fontSize: dynamicStyles.rankTextFontSize }]}>{rank}</Text>
                {lastRank && lastRank < rank &&
                    <Entypo name='chevron-down' size={20} color={'red'} style={styles.arrow_icon} />
                }
                {lastRank && lastRank > rank &&
                    <Entypo name='chevron-up' size={20} color={'#23B665'} style={styles.arrow_icon} />
                }
                {(!lastRank || lastRank == rank) &&
                    <FontAwesome name='minus' size={16} color={'#aaa'} style={styles.minus_icon} />
                }
                <View style={[styles.pfp_ctnr, { width: dynamicStyles.pfpSize }]}>
                    <Image source={{ uri: pfp }} style={styles.pfp} />
                </View>
                <View>
                    <Text style={[styles.handle_text, { fontSize: dynamicStyles.handleTextFontSize }]}>{handle}</Text>
                    <Text style={[styles.name_text, { fontSize: dynamicStyles.nameTextFontSize }]}>{name}</Text>
                </View>
            </View>
            <View style={styles.card_right}>
                <View>
                    <Text style={[styles.stat_text, { fontSize: dynamicStyles.statTextFontSize }]}>{value.toFixed(0)} lbs</Text>
                    {bestSet.reps === 0 && bestSet.weight === 0 ?
                        <Text style={[styles.best_set_text, { fontSize: dynamicStyles.bestSetTextFontSize }]}>N/A</Text>
                        :
                        <Text style={[styles.best_set_text, { fontSize: dynamicStyles.bestSetTextFontSize }]}>{bestSet.reps} x {bestSet.weight} lbs</Text>
                    }
                </View>
            </View>
        </RNBounceable>
    )
};

const styles = StyleSheet.create({
    card_ctnr: {
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 10,
        paddingRight: 14,
        marginHorizontal: 15,
        marginBottom: 12.5,
    },
    self_card_ctnr: {
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 10,
        paddingRight: 14,
        marginHorizontal: 15,
        borderWidth: 2.5,
        borderColor: '#57B2FF',
        backgroundColor: '#F7FBFF'
    },
    card_left: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pfp_ctnr: {
        aspectRatio: 1
    },
    pfp: {
        flex: 1,
        borderRadius: 100
    },
    handle_text: {
        fontFamily: 'Outfit_600SemiBold',
        paddingHorizontal: 12,
        color: '#333'
    },
    name_text: {
        marginTop: 1.5,
        fontFamily: 'Outfit_500Medium',
        paddingHorizontal: 12,
        color: '#999'
    },
    card_right: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    stat_text: {
        fontFamily: 'Outfit_600SemiBold',
        color: '#2D9EFF',
        textAlign: 'right'
    },
    best_set_text: {
        fontFamily: 'Outfit_500Medium',
        color: '#777',
        marginTop: 4, // Add some spacing between the value and best set text
        textAlign: 'right'
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
        marginRight: 10
    }
});
