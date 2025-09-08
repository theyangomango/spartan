// ! Currently Depricated

import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Clock } from 'iconsax-react-native';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

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
        fontSize: scaledSize(18),
        fontWeight: 'bold',
        marginBottom: scaledSize(10),
        paddingHorizontal: scaledSize(25),
    },
    trendingTitle: {
        fontSize: scaledSize(16),
        fontFamily: 'Mulish_700Bold',
        marginBottom: scaledSize(8),
        paddingHorizontal: scaledSize(25),
    },
    recentList: {
        paddingHorizontal: scaledSize(25),
    },
    trendingList: {
        // paddingHorizontal: 32,
    },
    recentSearchContainer: {
        marginBottom: scaledSize(20),
    },
    searchItem: {
        height: scaledSize(28),
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scaledSize(10),
    },
    trendingItem: {
        height: scaledSize(34),
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: scaledSize(7),
        marginBottom: scaledSize(3),
        marginHorizontal: scaledSize(8),
        paddingHorizontal: scaledSize(22),
    },
    superTrendingItem: {
        backgroundColor: '#e6f7ff',
        borderRadius: scaledSize(5),
    },
    searchItemTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    searchItemText: {
        fontSize: scaledSize(14.5),
        color: '#333',
        fontFamily: 'Mulish_700Bold',
    },
    iconLeft: {
        marginRight: scaledSize(10),
        marginTop: scaledSize(3.5),
    },
    iconRightContainer: {
        marginTop: scaledSize(4),
    },
    iconRight: {
        marginLeft: scaledSize(10),
    },
    bulletPoint: {
        width: scaledSize(6),
        height: scaledSize(6),
        borderRadius: scaledSize(3),
        marginRight: scaledSize(10),
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
        fontSize: scaledSize(13.5),
        color: '#999',
        fontFamily: 'Mulish_700Bold',
    },
});

export default SearchPanel;
