// screens/MacroTracking.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, UIManager, Platform, LayoutAnimation } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import RNBounceable from '@freakycoder/react-native-bounceable';

import { searchFood } from './fatsecretClient';
import Footer from '../components/Footer';
import PlusIcon from '../assets/PlusIcon';
import MacroBar from '../components/2_MacroTracking/MacroBar';
import MealCard from '../components/2_MacroTracking/MealCard';
import breakfastIcon from '../assets/breakfast.png';
import lunchIcon from '../assets/lunch.png';
import dinnerIcon from '../assets/dinner.png';

import FoodSearchOverlay from '../components/2_MacroTracking/FoodSearchOverlay';
import MacroGoalsSheet from '../components/2_MacroTracking/MacroGoalsSheet';

import UnderMealList from '../components/UnderMealList';
import { useFoodLogs } from '../hooks/useFoodLogs';
import { summarizeFood } from '../utils/nutrition';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const mealsMeta = [
    { name: 'Breakfast', subtitle: 'Breakfast starts your day', icon: breakfastIcon, bgColor: '#fbedd9' },
    { name: 'Lunch', subtitle: 'Lunch fuels your goals', icon: lunchIcon, bgColor: '#ffe8e9' },
    { name: 'Dinner', subtitle: 'Dinner completes your nutrition', icon: dinnerIcon, bgColor: '#eaefce' },
];

export default function MacroTracking({ navigation }) {
    const [focusedDate, setFocusedDate] = useState(new Date());
    const { meals, totals, addFood, deleteFood } = useFoodLogs(focusedDate);

    const [macroGoals, setMacroGoals] = useState({ calories: 2340, carbs: 285, fat: 70, protein: 140 });
    const [goalForm, setGoalForm] = useState({
        gender: 'male', weight: '', heightFt: '', heightIn: '', activity: 'moderate', calories: '', carbs: '', fat: '', protein: '',
    });
    const [sheetIndex, setSheetIndex] = useState(-1);

    const [searchVisible, setSearchVisible] = useState(false);
    const [activeMeal, setActiveMeal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const [collapsed, setCollapsed] = useState({ Breakfast: false, Lunch: false, Dinner: false });

    const toggleMeal = (name) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
    };

    const calorieProgress = Math.min(100, (totals.calories / Math.max(1, macroGoals.calories)) * 100);

    const formatDate = (date) =>
        date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const shiftDate = (days) => {
        const d = new Date(focusedDate);
        d.setDate(d.getDate() + days);
        setFocusedDate(d);
    };

    // Search (unchanged)
    useEffect(() => {
        if (!searchVisible) return;
        if (searchQuery.trim().length > 0) {
            searchFood(searchQuery)
                .then((res) => {
                    if (res?.foods && 'food' in res.foods) setSearchResults(res.foods.food);
                    else setSearchResults([]);
                })
                .catch(() => setSearchResults([]));
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, searchVisible]);

    const openSearchForMeal = (meal) => {
        setActiveMeal(meal?.name ?? null);
        setSearchQuery('');
        setSearchResults([]);
        setSearchVisible(true);
    };
    const closeSearch = () => {
        setSearchVisible(false);
        setActiveMeal(null);
        setSearchQuery('');
        setSearchResults([]);
    };
    // IMPORTANT: overlay now provides __portionMultiplier on food
    const onSelectResult = async (food) => {
        if (!activeMeal) return;
        await addFood(activeMeal, food);  // food may contain __portionMultiplier
        closeSearch();
    };

    const openGoalsSheet = () => setSheetIndex(1);
    const closeGoalsSheet = () => setSheetIndex(-1);
    const clampInt = (s, min, max) => {
        const n = parseInt(s || '0', 10);
        if (Number.isNaN(n)) return min;
        return Math.max(min, Math.min(max, n));
    };
    const onSaveGoals = () => {
        const next = {
            calories: clampInt(goalForm.calories, 1, 100000),
            carbs: clampInt(goalForm.carbs, 0, 2000),
            fat: clampInt(goalForm.fat, 0, 1000),
            protein: clampInt(goalForm.protein, 0, 1000),
        };
        setMacroGoals(next);
        closeGoalsSheet();
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
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

                {/* Body */}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }} style={styles.body}>
                    <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Nutrition</Text>

                    <RNBounceable style={styles.trackerCard} onPress={openGoalsSheet}>
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
                                            <Text style={styles.valueText}>{Math.max(0, totals.calories).toLocaleString()}</Text>
                                            <Text style={styles.valueSubtitleText}>/{macroGoals.calories.toLocaleString()} kcal</Text>
                                        </View>
                                    )}
                                </AnimatedCircularProgress>
                            </View>

                            <View style={styles.macroSummary}>
                                <MacroBar label="Protein" value={totals.protein} goal={macroGoals.protein} color={COLORS.protein} textPrimary={COLORS.textPrimary} textSecondary={COLORS.textSecondary} />
                                <MacroBar label="Carbs" value={totals.carbs} goal={macroGoals.carbs} color={COLORS.carbs} textPrimary={COLORS.textPrimary} textSecondary={COLORS.textSecondary} />
                                <MacroBar label="Fat" value={totals.fat} goal={macroGoals.fat} color={COLORS.fat} textPrimary={COLORS.textPrimary} textSecondary={COLORS.textSecondary} />
                            </View>
                        </View>
                    </RNBounceable>

                    <Text style={styles.sectionTitle}>Daily meals</Text>
                    {mealsMeta.map((m) => (
                        <React.Fragment key={m.name}>
                            <MealCard
                                item={m}
                                PlusIcon={PlusIcon}
                                COLORS={COLORS}
                                onAddPress={openSearchForMeal}
                                onToggle={() => toggleMeal(m.name)}
                                collapsed={collapsed[m.name]}
                            />

                            {!collapsed[m.name] && (
                                <UnderMealList
                                    items={meals[m.name] ?? []}
                                    COLORS={COLORS}
                                    listStyle={styles.underMealList}
                                    cardStyle={styles.underMealCard}
                                    renderSummary={(entry) => summarizeFood(entry.desc, entry.brand, entry.quantity ?? 1)}
                                    onDelete={(entry) => deleteFood(m.name, entry)}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </ScrollView>

                {/* Modals */}
                <FoodSearchOverlay
                    visible={searchVisible}
                    activeMeal={activeMeal}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchResults={searchResults}
                    onClose={closeSearch}
                    COLORS={COLORS}
                    onSelectResult={onSelectResult}
                />

                <MacroGoalsSheet
                    index={sheetIndex}
                    onChangeIndex={setSheetIndex}
                    goalForm={goalForm}
                    setGoalForm={setGoalForm}
                    onSave={onSaveGoals}
                    onCancel={closeGoalsSheet}
                    COLORS={COLORS}
                />

                <Footer navigation={navigation} currentScreenName={'MacroTracking'} />
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    stickyHeader: {
        backgroundColor: COLORS.background,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingTop: 56,
        paddingBottom: 2,
    },
    body: { backgroundColor: COLORS.background },
    headerText: { fontSize: 16, color: COLORS.textPrimary, fontFamily: 'Nunito_800ExtraBold' },
    sectionTitle: { fontSize: 19, marginLeft: 18, color: COLORS.textPrimary, letterSpacing: 0.2, fontFamily: 'Nunito_800ExtraBold' },
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
    trackerRow: { flexDirection: 'row', gap: 20 },
    progressContainer: {},
    centerContent: { alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    valueText: { fontSize: 26, color: '#18181A', fontFamily: 'Outfit_600SemiBold', marginBottom: -2.5 },
    valueSubtitleText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'Outfit_400Regular', marginBottom: 4 },
    macroSummary: { flex: 1 },

    // Compact under-meal spacing (tweak here freely)
    underMealList: {
        paddingHorizontal: 18,
        marginTop: 2,
        marginBottom: 8,
    },
    underMealCard: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginVertical: 2,
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
});
