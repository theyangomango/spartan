// ! Currently Depricated

import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import scaleSize from '../../helper/scaleSize';
import RNBounceable from '@freakycoder/react-native-bounceable';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Clock } from 'iconsax-react-native';

const { height: screenHeight } = Dimensions.get('window');
// Use centralized scale utility for consistent sizing across devices
const scaledSize = (size) => scaleSize(size);

const recentSearches = [
    'abs workouts',
    'protein intake trackers',
    'glute exercises',
    'healthy foods',
    'chest workouts',
];

const popularSearches = [
    { text: 'Does Cardio Kill Gains?', superTrending: false },
    { text: 'CBum Neck Workout', superTrending: true },
    { text: 'Are Drop Sets Worth It?', superTrending: false },
    { text: 'Gym Reviews', superTrending: true },
    { text: 'Flexibility Exercises', superTrending: false },
];

const SearchPanel = ({ onSelectSearch }) => {
    const [showAllRecent, setShowAllRecent] = useState(false);

    const sortedPopularSearches = popularSearches.sort((a, b) => b.superTrending - a.superTrending);

    const renderSearchItem = ({ item }) => (
        <View style={styles.searchItem}>
            <Clock size={scaledSize(18)} color="#aaa" variant='Broken' style={styles.iconLeft} />
            <RNBounceable
                onPress={() => onSelectSearch(item)}
                style={styles.searchItemTextContainer}
            >
                <Text style={styles.searchItemText}>{item}</Text>
            </RNBounceable>
            <TouchableOpacity style={styles.iconRightContainer}>
                <MaterialCommunityIcons name="close" size={scaledSize(14)} color="#888" style={styles.iconRight} />
            </TouchableOpacity>
        </View>
    );

    const renderTrendingItem = ({ item }) => (
        <View style={[
            styles.trendingItem,
            item.superTrending && styles.superTrendingItem
        ]}>
            <View style={[
                styles.bulletPoint,
                item.superTrending ? styles.blueBulletPoint : styles.grayBulletPoint
            ]} />
            <RNBounceable
                onPress={() => onSelectSearch(item.text)}
                style={styles.searchItemTextContainer}
            >
                <Text style={styles.searchItemText}>{item.text}</Text>
            </RNBounceable>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.recentSearchContainer}>
                <FlatList
                    data={showAllRecent ? recentSearches : recentSearches.slice(0, 3)}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={renderSearchItem}
                    showsVerticalScrollIndicator={false}
                    style={styles.recentList}
                />
                {!showAllRecent && (
                    <TouchableOpacity onPress={() => setShowAllRecent(true)} style={styles.seeMoreButton}>
                        <Text style={styles.seeMoreButtonText}>See more</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Text style={styles.trendingTitle}>Trending</Text>
            <FlatList
                data={sortedPopularSearches}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderTrendingItem}
                showsVerticalScrollIndicator={false}
                style={styles.trendingList}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    sectionTitle: {
        fontSize: scaleSize(18),
        fontWeight: 'bold',
        marginBottom: scaleSize(scaledSize(10)),
        paddingHorizontal: scaleSize(scaledSize(25)),
    },
    trendingTitle: {
        fontSize: scaleSize(16),
        fontFamily: 'Mulish_700Bold',
        marginBottom: scaleSize(scaledSize(8)),
        paddingHorizontal: scaleSize(scaledSize(25)),
    },
    recentList: {
        paddingHorizontal: scaleSize(scaledSize(25)),
    },
    trendingList: {
        // paddingHorizontal: 32,
    },
    recentSearchContainer: {
        marginBottom: scaleSize(scaledSize(20)),
    },
    searchItem: {
        height: scaleSize(scaledSize(28)),
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scaleSize(scaledSize(10)),
    },
    trendingItem: {
        height: scaleSize(scaledSize(34)),
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scaleSize(scaledSize(7)),
        marginBottom: scaleSize(scaledSize(3)),
        marginHorizontal: scaleSize(scaledSize(8)),
        paddingHorizontal: scaleSize(scaledSize(22)),
    },
    superTrendingItem: {
        backgroundColor: '#e6f7ff',
        borderRadius: scaleSize(scaledSize(5)),
    },
    searchItemTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    searchItemText: {
        fontSize: scaleSize(14.5),
        color: '#333',
        fontFamily: 'Mulish_700Bold',
    },
    iconLeft: {
        marginRight: scaleSize(scaledSize(10)),
        marginTop: scaleSize(scaledSize(3.5)),
    },
    iconRightContainer: {
        marginTop: scaleSize(scaledSize(4)),
    },
    iconRight: {
        marginLeft: scaleSize(scaledSize(10)),
    },
    bulletPoint: {
        width: scaleSize(scaledSize(6)),
        height: scaleSize(scaledSize(6)),
        borderRadius: scaleSize(scaledSize(3)),
        marginRight: scaleSize(scaledSize(10)),
    },
    blueBulletPoint: {
        backgroundColor: '#007BFF',
    },
    grayBulletPoint: {
        backgroundColor: '#888',
    },
    seeMoreButton: {
        alignItems: 'center',
    },
    seeMoreButtonText: {
        fontSize: scaleSize(13.5),
        color: '#999',
        fontFamily: 'Mulish_700Bold',
    },
});

export default SearchPanel;
