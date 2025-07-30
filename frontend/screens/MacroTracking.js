import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    FlatList,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { searchFood } from './fatsecretClient';
import Footer from '../components/Footer';
import PlusIcon from '../assets/PlusIcon';

// Components
import MacroBar from '../components/2_MacroTracking/MacroBar';
import MealCard from '../components/2_MacroTracking/MealCard';

// Local icons
import breakfastIcon from '../assets/breakfast.png';
import lunchIcon from '../assets/lunch.png';
import dinnerIcon from '../assets/dinner.png';
import SearchResultCard from '../components/2_MacroTracking/SearchResultCard';

const COLORS = {
    background: '#f5f6fa',
    textPrimary: '#1C1C1E',
    textSecondary: '#777',
    card: '#ffffffff',
    accentBlue: '#53B6F5',
    protein: '#B3B5FF',
    carbs: '#FFB3D1',
    fat: '#FFCBA0',
    mealCardShadow: '#99a5b7ff',
    addButton: '#eaeeffb0',
};

const MACRO_GOALS = {
    calories: 2340,
    carbs: 285,
    fat: 70,
    protein: 140,
};

const currentMacros = {
    calories: 1210,
    carbs: 100,
    fat: 25,
    protein: 60,
};

const meals = [
    {
        name: 'Breakfast',
        subtitle: 'Breakfast fuels your day',
        icon: breakfastIcon,
        bgColor: '#fbedd9',
    },
    {
        name: 'Lunch',
        subtitle: 'Lunch fuels your goals',
        icon: lunchIcon,
        bgColor: '#ffe8e9',
    },
    {
        name: 'Dinner',
        subtitle: 'Dinner completes your nutrition',
        icon: dinnerIcon,
        bgColor: '#eaefce',
    },
];

export default function MacroTracking({ navigation }) {
    const [focusedDate, setFocusedDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const calorieProgress =
        (currentMacros.calories / MACRO_GOALS.calories) * 100;

    const formatDate = (date) =>
        date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });

    const shiftDate = (days) => {
        const newDate = new Date(focusedDate);
        newDate.setDate(focusedDate.getDate() + days);
        setFocusedDate(newDate);
    };

    useEffect(() => {
        if (searchQuery.trim().length > 0) {
            searchFood(searchQuery)
                .then((res) => {
                    console.log(res.foods);
                    setSearchResults(res.foods.food);
                })
                .catch(console.error);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    return (
        <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.stickyHeader}>
                <Pressable onPress={() => shiftDate(-1)}>
                    <Ionicons name="chevron-back" size={25} color={COLORS.textPrimary} />
                </Pressable>
                <Text style={styles.headerText}>{formatDate(focusedDate)}</Text>
                <Pressable onPress={() => shiftDate(1)}>
                    <Ionicons name="chevron-forward" size={25} color={COLORS.textPrimary} />
                </Pressable>
            </View>

            {/* Scrollable Main Content */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 100, paddingBottom: 100 }}
                style={styles.body}
            >
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={18} color="#999" style={{ marginRight: 10 }} />
                        <TextInput
                            placeholder="Search for a food..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={styles.searchInput}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#999" style={{ marginRight: 5 }} />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Nutrition Tracker */}
                <Text style={styles.sectionTitle}>Nutrition</Text>
                <View style={styles.trackerCard}>
                    <View style={styles.trackerRow}>
                        <View style={styles.progressContainer}>
                            <AnimatedCircularProgress
                                size={135}
                                width={11}
                                fill={calorieProgress}
                                tintColor="#6FB8FF"
                                backgroundColor="#f0f0f0"
                                lineCap="round"
                                arcSweepAngle={360}
                                rotation={0}
                            >
                                {() => (
                                    <View style={styles.centerContent}>
                                        <Text style={styles.valueText}>
                                            {(MACRO_GOALS.calories - currentMacros.calories).toLocaleString()}
                                        </Text>
                                        <Text style={styles.valueSubtitleText}>
                                            /{MACRO_GOALS.calories.toLocaleString()} Kcal
                                        </Text>
                                    </View>
                                )}
                            </AnimatedCircularProgress>
                        </View>

                        <View style={styles.macroSummary}>
                            <MacroBar
                                label="Protein"
                                value={currentMacros.protein}
                                goal={MACRO_GOALS.protein}
                                color={COLORS.protein}
                                textPrimary={COLORS.textPrimary}
                                textSecondary={COLORS.textSecondary}
                            />
                            <MacroBar
                                label="Carbs"
                                value={currentMacros.carbs}
                                goal={MACRO_GOALS.carbs}
                                color={COLORS.carbs}
                                textPrimary={COLORS.textPrimary}
                                textSecondary={COLORS.textSecondary}
                            />
                            <MacroBar
                                label="Fat"
                                value={currentMacros.fat}
                                goal={MACRO_GOALS.fat}
                                color={COLORS.fat}
                                textPrimary={COLORS.textPrimary}
                                textSecondary={COLORS.textSecondary}
                            />
                        </View>
                    </View>
                </View>

                {/* Meals */}
                <Text style={styles.sectionTitle}>Daily meals</Text>
                {meals.map((item) => (
                    <MealCard
                        key={item.name}
                        item={item}
                        PlusIcon={PlusIcon}
                        COLORS={COLORS}
                    />
                ))}

            </ScrollView>

            {/* Floating Search Results */}
            {searchResults.length > 0 && (
                <View style={styles.searchOverlay}>
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item) => item.food_id}
                        renderItem={({ item }) => (
                            <SearchResultCard item={item} />
                        )}
                    />
                </View>
            )}

            <Footer navigation={navigation} currentScreenName={'MacroTracking'} />
        </View>
    );
}

const styles = StyleSheet.create({
    stickyHeader: {
        position: 'absolute',
        top: 48,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: COLORS.background,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 14,
    },
    body: {
        backgroundColor: COLORS.background,
    },
    headerText: {
        fontSize: 18,
        color: COLORS.textPrimary,
        fontFamily: 'Outfit_600SemiBold',
    },
    searchContainer: {
        paddingHorizontal: 18,
        marginBottom: 20,
    },
    searchBox: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 13,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Outfit_400Regular',
        fontSize: 15,
        color: COLORS.textPrimary,
        paddingVertical: 0,
    },
    sectionTitle: {
        fontSize: 19,
        marginBottom: 12,
        fontFamily: 'Outfit_700Bold',
        marginLeft: 18,
        color: COLORS.textPrimary,
        letterSpacing: 0.2,
    },
    trackerCard: {
        backgroundColor: '#fff',
        borderRadius: 36,
        elevation: 2,
        paddingTop: 20,
        paddingBottom: 18,
        paddingLeft: 22,
        paddingRight: 25,
        marginBottom: 30,
        marginHorizontal: 16,
        shadowColor: COLORS.mealCardShadow,
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    trackerRow: {
        flexDirection: 'row',
        gap: 20,
    },
    progressContainer: {},
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    valueText: {
        fontSize: 26,
        color: '#18181A',
        fontFamily: 'Outfit_600SemiBold',
        marginBottom: -2.5,
    },
    valueSubtitleText: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    macroSummary: {
        flex: 1,
    },
    searchOverlay: {
        position: 'absolute',
        top: 160,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.background,
        paddingHorizontal: 18,
        zIndex: 50,
    },
});
