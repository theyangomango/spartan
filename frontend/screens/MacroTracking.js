// screens/MacroTracking.js
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Pressable, UIManager, Platform, LayoutAnimation,
} from 'react-native';
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

// ---- FIREBASE
import { db } from '../../firebase.config';
import {
    collection, doc, getDocs, orderBy, query, setDoc, serverTimestamp, addDoc,
} from 'firebase/firestore';

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

const meals = [
    { name: 'Breakfast', subtitle: 'Breakfast starts your day', icon: breakfastIcon, bgColor: '#fbedd9' },
    { name: 'Lunch', subtitle: 'Lunch fuels your goals', icon: lunchIcon, bgColor: '#ffe8e9' },
    { name: 'Dinner', subtitle: 'Dinner completes your nutrition', icon: dinnerIcon, bgColor: '#eaefce' },
];

const pad2 = (n) => String(n).padStart(2, '0');
const toDayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const normalizeMealKey = (t = '') => {
    const s = t.toLowerCase();
    if (s.startsWith('break')) return 'Breakfast';
    if (s.startsWith('lunch')) return 'Lunch';
    if (s.startsWith('dinn')) return 'Dinner';
    return 'Dinner';
};

// ---- Parse macros from FatSecret-style description text
const parseMacrosFromDescription = (desc = '') => {
    const text = String(desc);

    // Calories
    // Matches: "Calories: 206kcal", "Calories: 206 cal", "206kcal"
    let cal = 0;
    const calLabel = text.match(/calories?\s*:\s*(\d+(?:\.\d+)?)/i);
    const calBare = text.match(/(\d+(?:\.\d+)?)\s*(?:kcal|cal)\b/i);
    if (calLabel) cal = parseFloat(calLabel[1]);
    else if (calBare) cal = parseFloat(calBare[1]);

    // Grams
    const prot = (() => {
        const m = text.match(/protein\s*:\s*(\d+(?:\.\d+)?)\s*g/i);
        return m ? parseFloat(m[1]) : 0;
    })();
    const carbs = (() => {
        const m = text.match(/carb(?:s|ohydrate)?\s*:\s*(\d+(?:\.\d+)?)\s*g/i);
        return m ? parseFloat(m[1]) : 0;
    })();
    const fat = (() => {
        const m = text.match(/fat\s*:\s*(\d+(?:\.\d+)?)\s*g/i);
        return m ? parseFloat(m[1]) : 0;
    })();

    return {
        calories: Number.isFinite(cal) ? cal : 0,
        protein: Number.isFinite(prot) ? prot : 0,
        carbs: Number.isFinite(carbs) ? carbs : 0,
        fat: Number.isFinite(fat) ? fat : 0,
    };
};

export default function MacroTracking({ navigation }) {
    const [focusedDate, setFocusedDate] = useState(new Date());

    // ---- LIVE daily totals (this is what the UI shows)
    const [trackedMacros, setTrackedMacros] = useState({
        calories: 0,
        carbs: 0,
        fat: 0,
        protein: 0,
    });

    const [macroGoals, setMacroGoals] = useState({
        calories: 2340,
        carbs: 285,
        fat: 70,
        protein: 140,
    });

    const [goalForm, setGoalForm] = useState({
        gender: 'male',
        weight: '',
        heightFt: '',
        heightIn: '',
        activity: 'moderate',
        calories: '',
        carbs: '',
        fat: '',
        protein: '',
    });

    const [sheetIndex, setSheetIndex] = useState(-1);

    const [searchVisible, setSearchVisible] = useState(false);
    const [activeMeal, setActiveMeal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // foods per meal (for rendering)
    const [mealFoods, setMealFoods] = useState(() =>
        Object.fromEntries(meals.map((m) => [m.name, []]))
    );

    // collapsed state per meal (false = expanded)
    const [collapsed, setCollapsed] = useState(() =>
        Object.fromEntries(meals.map((m) => [m.name, false]))
    );

    const toggleMeal = (name) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
    };

    const calorieProgress = Math.min(
        100,
        (trackedMacros.calories / Math.max(1, macroGoals.calories)) * 100
    );

    const formatDate = (date) =>
        date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const shiftDate = (days) => {
        const newDate = new Date(focusedDate);
        newDate.setDate(focusedDate.getDate() + days);
        setFocusedDate(newDate);
    };

    // ---- Load entries & rebuild totals on date change
    useEffect(() => {
        const userId = global?.userData?.id || global?.userData?.uid;
        if (!userId) return;

        (async () => {
            try {
                const dayKey = toDayKey(focusedDate);

                const dayRef = doc(db, 'users', userId, 'foodLogs', dayKey);
                await setDoc(dayRef, { dayKey, updatedAt: serverTimestamp() }, { merge: true });

                const entriesRef = collection(dayRef, 'entries');
                const q = query(entriesRef, orderBy('createdAt', 'asc'));
                const snap = await getDocs(q);

                const byMeal = { Breakfast: [], Lunch: [], Dinner: [] };
                const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

                snap.forEach((d) => {
                    const data = d.data() || {};
                    const bucket = normalizeMealKey(data.mealType);

                    // prefer stored macros; else try to parse from description
                    const m = data.macros || parseMacrosFromDescription(data.description || data.desc || '');

                    totals.calories += m?.calories || 0;
                    totals.protein += m?.protein || 0;
                    totals.carbs += m?.carbs || 0;
                    totals.fat += m?.fat || 0;

                    byMeal[bucket] = [
                        ...byMeal[bucket],
                        {
                            key: d.id,
                            food_id: data.foodId || '',
                            name: data.name || '',
                            brand: data.brand || '',
                            desc: data.description || data.desc || '',
                        },
                    ];
                });

                setMealFoods({
                    Breakfast: byMeal.Breakfast,
                    Lunch: byMeal.Lunch,
                    Dinner: byMeal.Dinner,
                });
                setTrackedMacros({
                    calories: Math.round(totals.calories),
                    protein: Math.round(totals.protein),
                    carbs: Math.round(totals.carbs),
                    fat: Math.round(totals.fat),
                });
            } catch (e) {
                console.log('Failed to load food entries:', e);
            }
        })();
    }, [focusedDate]);

    // ---- Food search
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

    // ---- Add & persist; then update local totals immediately
    const addFoodToActiveMeal = async (food) => {
        if (!activeMeal) return;

        const userId = global?.userData?.id || global?.userData?.uid;
        if (!userId) {
            console.log('No user id found on global.userData');
            return;
        }

        try {
            const dayKey = toDayKey(focusedDate);
            const dayRef = doc(db, 'users', userId, 'foodLogs', dayKey);
            await setDoc(dayRef, { dayKey, updatedAt: serverTimestamp() }, { merge: true });

            const macros = parseMacrosFromDescription(food.food_description || '');

            const payload = {
                mealType: activeMeal.toLowerCase(),   // "breakfast" | "lunch" | "dinner"
                name: food.food_name || '',
                brand: food.brand_name || '',
                foodId: String(food.food_id ?? ''),
                description: food.food_description || '',
                source: 'fatsecret',
                quantity: 1,
                macros,                               // store snapshot of macros on the entry
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const created = await addDoc(collection(dayRef, 'entries'), payload);

            // Update UI list
            const entryForUi = {
                key: created.id,
                food_id: payload.foodId,
                name: payload.name,
                brand: payload.brand,
                desc: payload.description,
            };
            setMealFoods((prev) => {
                const nextList = prev[activeMeal] ? [...prev[activeMeal], entryForUi] : [entryForUi];
                return { ...prev, [activeMeal]: nextList };
            });

            // Update daily totals shown in the ring & MacroBars
            setTrackedMacros((prev) => ({
                calories: Math.round(prev.calories + (macros.calories || 0)),
                protein: Math.round(prev.protein + (macros.protein || 0)),
                carbs: Math.round(prev.carbs + (macros.carbs || 0)),
                fat: Math.round(prev.fat + (macros.fat || 0)),
            }));
        } catch (e) {
            console.log('Failed to add food entry:', e);
        } finally {
            closeSearch();
        }
    };

    // ---- Summary helpers for under-meal rows
    const formatPortion = (qty, unit) => {
        const u = (unit || '').trim().toLowerCase();
        if (/^g(ram|rams)?$/.test(u)) return `${qty}g`;
        if (/^(mg|milligram|milligrams)$/.test(u)) return `${qty}mg`;
        if (/^(kg|kilogram|kilograms)$/.test(u)) return `${qty}kg`;
        return `${qty} ${unit.trim()}`;
    };

    const summarizeFood = (desc = '', brand = '') => {
        const kcalMatch = desc.match(/(\d+)\s?(?:kcal|cal(?:ories)?)\b/i);
        const calories = kcalMatch ? `${kcalMatch[1]} kcal` : '';

        const perServing = /\bper\b\s*(?:\d+(?:\s*\/\s*\d+)?(?:\.\d+)?)?\s*serving\b/i.test(desc);
        if (perServing) return [calories, brand].filter(Boolean).join(', ');

        const perFraction = desc.match(/\bper\b\s*(\d+\s*\/\s*\d+)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/i);
        if (perFraction) {
            const qty = perFraction[1].replace(/\s*/g, '');
            const unit = perFraction[2].trim();
            if (unit.toLowerCase() !== 'serving') {
                return [calories, formatPortion(qty, unit), brand].filter(Boolean).join(', ');
            }
        }

        const perUnit = desc.match(/\bper\b\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/i);
        if (perUnit) {
            const qty = perUnit[1];
            const unit = perUnit[2].trim();
            if (unit.toLowerCase() !== 'serving') {
                return [calories, formatPortion(qty, unit), brand].filter(Boolean).join(', ');
            }
        }

        const gramMatch = desc.match(/(\d+)\s?g\b/i);
        const grams = gramMatch ? `${gramMatch[1]}g` : '';

        return [calories, grams, brand].filter(Boolean).join(', ');
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
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
                    style={styles.body}
                >
                    <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Nutrition</Text>

                    {/* Tap to open Goals sheet */}
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
                                            <Text style={styles.valueText}>
                                                {Math.max(0, trackedMacros.calories).toLocaleString()}
                                            </Text>
                                            <Text style={styles.valueSubtitleText}>
                                                /{macroGoals.calories.toLocaleString()} kcal
                                            </Text>
                                        </View>
                                    )}
                                </AnimatedCircularProgress>
                            </View>

                            <View style={styles.macroSummary}>
                                <MacroBar label="Protein" value={trackedMacros.protein} goal={macroGoals.protein} color={COLORS.protein} textPrimary={COLORS.textPrimary} textSecondary={COLORS.textSecondary} />
                                <MacroBar label="Carbs" value={trackedMacros.carbs} goal={macroGoals.carbs} color={COLORS.carbs} textPrimary={COLORS.textPrimary} textSecondary={COLORS.textSecondary} />
                                <MacroBar label="Fat" value={trackedMacros.fat} goal={macroGoals.fat} color={COLORS.fat} textPrimary={COLORS.textPrimary} textSecondary={COLORS.textSecondary} />
                            </View>
                        </View>
                    </RNBounceable>

                    <Text style={styles.sectionTitle}>Daily meals</Text>
                    {meals.map((item) => (
                        <React.Fragment key={item.name}>
                            <MealCard
                                item={item}
                                PlusIcon={PlusIcon}
                                COLORS={COLORS}
                                onAddPress={openSearchForMeal}
                                onToggle={() => toggleMeal(item.name)}
                                collapsed={collapsed[item.name]}
                            />

                            {/* UNDER-MEAL LIST */}
                            {!collapsed[item.name] && (
                                <View style={styles.underMealList}>
                                    {(mealFoods[item.name] ?? []).map((f) => (
                                        <View key={f.key} style={styles.underMealCard}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.foodName}>{f.name}</Text>
                                                <Text style={styles.foodSummary}>{summarizeFood(f.desc, f.brand)}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
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
                    onSelectResult={addFoodToActiveMeal}
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
    headerText: {
        fontSize: 16,
        color: COLORS.textPrimary,
        fontFamily: 'Nunito_800ExtraBold',
    },
    sectionTitle: {
        fontSize: 19,
        marginLeft: 18,
        color: COLORS.textPrimary,
        letterSpacing: 0.2,
        fontFamily: 'Nunito_800ExtraBold',
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
    trackerRow: { flexDirection: 'row', gap: 20 },
    progressContainer: {},
    centerContent: { alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    valueText: { fontSize: 26, color: '#18181A', fontFamily: 'Outfit_600SemiBold', marginBottom: -2.5 },
    valueSubtitleText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'Outfit_400Regular', marginBottom: 4 },
    macroSummary: { flex: 1 },

    /* Under-meal cards */
    foodName: {
        fontSize: 13.5,
        color: COLORS.textPrimary,
        fontFamily: 'Mulish_700Bold',
        marginBottom: 3,
    },
    foodSummary: {
        fontSize: 12.5,
        color: COLORS.textSecondary,
        fontFamily: 'Mulish_500Medium',
    },
    underMealList: {
        paddingHorizontal: 18,
        marginTop: 2,
        marginBottom: 8,
    },
    underMealCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginVertical: 2,
        shadowColor: COLORS.mealCardShadow,
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
});
