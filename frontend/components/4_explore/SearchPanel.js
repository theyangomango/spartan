// ! Currently Not in Use for Spartan's Beta

import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Clock } from 'iconsax-react-native';

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
            <Clock size="18" color="#aaa" variant='Broken' style={styles.iconLeft} />
            <RNBounceable
                onPress={() => onSelectSearch(item)}
                style={styles.searchItemTextContainer}
            >
                <Text style={styles.searchItemText}>{item}</Text>
            </RNBounceable>
            <TouchableOpacity style={styles.iconRightContainer}>
                <MaterialCommunityIcons name="close" size={14} color="#888" style={styles.iconRight} />
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
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        paddingHorizontal: 25,
    },
    trendingTitle: {
        fontSize: 16,
        fontFamily: 'Mulish_700Bold',
        marginBottom: 8,
        paddingHorizontal: 25,
    },
    recentList: {
        paddingHorizontal: 25,
    },
    trendingList: {
        // paddingHorizontal: 32,
    },
    recentSearchContainer: {
        marginBottom: 20,
    },
    searchItem: {
        height: 28,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    trendingItem: {
        height: 34,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        marginBottom: 3,
        marginHorizontal: 8,
        paddingHorizontal: 22,

    },
    superTrendingItem: {
        backgroundColor: '#e6f7ff',
        borderRadius: 5,
        // paddingHorizontal: 5,
    },
    searchItemTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    searchItemText: {
        fontSize: 14.5,
        color: '#333',
        fontFamily: 'Mulish_700Bold',
    },
    iconLeft: {
        marginRight: 10,
        marginTop: 3.5,
    },
    iconRightContainer: {
        marginTop: 4,
    },
    iconRight: {
        marginLeft: 10,
    },
    bulletPoint: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 10,
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
        fontSize: 13.5,
        color: '#999',
        fontFamily: 'Mulish_700Bold',
    },
});

export default SearchPanel;
