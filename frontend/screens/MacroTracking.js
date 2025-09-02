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
import snacksIcon from '../assets/snacks.png'

import FoodSearchOverlay from '../components/2_MacroTracking/FoodSearchOverlay';
import MacroGoalsSheet from '../components/2_MacroTracking/MacroGoalsSheet';

import UnderMealList from '../components/UnderMealList';
import { useFoodLogs } from '../hooks/useFoodLogs';
import { summarizeFood } from '../utils/nutrition';
import PersonalInfoSheet from '../components/2_MacroTracking/PersonalInfoSheet';

// 🔥 Firestore (load + save macro goals)
import { db } from '../../firebase.config';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    subtext: '#64748B',
    hairline: 'rgba(2, 6, 23, 0.06)',
    ringTint: '#6FB8FF',
    ringBg: '#E2E8F0',
    chipBg: '#EEF2FF',
    addBtnBg: '#E7F0FF',
    protein: '#A5B4FC',
    carbs: '#F9A8D4',
    fat: '#FCD5A5',
    shadow: '#000',
};

const mealsMeta = [
    { name: 'Breakfast', subtitle: 'Breakfast starts your day', icon: breakfastIcon, bgColor: '#FBEDD9' },
    { name: 'Lunch', subtitle: 'Lunch fuels your goals', icon: lunchIcon, bgColor: '#FFE8E9' },
    { name: 'Dinner', subtitle: 'Dinner completes your nutrition', icon: dinnerIcon, bgColor: '#EAEECE' },
    // Make snack icon slightly smaller by providing an explicit size override
    { name: 'Snacks', subtitle: 'Snacks keep you energized', icon: snacksIcon, iconSize: 22, bgColor: '#EAE5FF' },
];

export default function MacroTracking({ navigation }) {
    const [focusedDate, setFocusedDate] = useState(new Date());
    const { meals, totals, addFood, deleteFood } = useFoodLogs(focusedDate);

    // -------- goals (load from user doc, save back) --------
    const [macroGoals, setMacroGoals] = useState({ calories: 2340, carbs: 285, fat: 70, protein: 140 });

    // Prefill macro fields from current macroGoals so inputs show those values initially
    const [goalForm, setGoalForm] = useState(() => ({
        gender: 'male',
        weight: '',
        heightFt: '',
        heightIn: '',
        activity: 'moderate',
        goal: 'maintain',
        calories: String(macroGoals.calories),
        carbs: String(macroGoals.carbs),
        fat: String(macroGoals.fat),
        protein: String(macroGoals.protein),
    }));

    // Subscribe to user's macro goals in Firestore
    useEffect(() => {
        const uid = global?.userData?.uid || global?.userData?.id;
        if (!uid) return;

        const ref = doc(db, 'users', uid);
        const unsub = onSnapshot(ref, (snap) => {
            const data = snap.data() || {};
            const mg = data.macroGoals ?? data.macrosGoal; // keep legacy fallback
            if (!mg) return;

            const next = {
                calories: Number(mg.calories) || 0,
                carbs: Number(mg.carbs) || 0,
                fat: Number(mg.fat) || 0,
                protein: Number(mg.protein) || 0,
            };
            setMacroGoals(next);

            // If a sheet is open later, another effect (below) will make sure the fields are seeded.
            // Optionally also mirror into goalForm immediately if empty strings:
            setGoalForm((s) => ({
                ...s,
                calories: s.calories === '' ? String(next.calories) : s.calories,
                carbs: s.carbs === '' ? String(next.carbs) : s.carbs,
                fat: s.fat === '' ? String(next.fat) : s.fat,
                protein: s.protein === '' ? String(next.protein) : s.protein,
            }));

            // Keep global in sync so other screens (e.g. calendar coloring) see it instantly
            try {
                global.userData = { ...(global.userData || {}), macroGoals: next };
            } catch { }
        });

        return () => unsub && unsub();
    }, []);

    const [sheetIndex, setSheetIndex] = useState(-1);       // goals sheet
    const [personalIndex, setPersonalIndex] = useState(-1); // personal info sheet

    const [searchVisible, setSearchVisible] = useState(false);
    const [activeMeal, setActiveMeal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const [collapsed, setCollapsed] = useState({ Breakfast: false, Lunch: false, Dinner: false });

    const toggleMeal = (name) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
    };

    const calorieProgress = Math.min(100, (Math.max(0, totals.calories) / Math.max(1, macroGoals.calories)) * 100);

    const formatDate = (date) =>
        date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const shiftDate = (days) => {
        const d = new Date(focusedDate);
        d.setDate(d.getDate() + days);
        setFocusedDate(d);
    };

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

    // When opening the sheet, seed empty fields from the latest macroGoals
    useEffect(() => {
        if (sheetIndex >= 0) {
            setGoalForm((s) => ({
                ...s,
                calories: s.calories === '' ? String(macroGoals.calories) : s.calories,
                carbs: s.carbs === '' ? String(macroGoals.carbs) : s.carbs,
                fat: s.fat === '' ? String(macroGoals.fat) : s.fat,
                protein: s.protein === '' ? String(macroGoals.protein) : s.protein,
            }));
        }
    }, [sheetIndex, macroGoals.calories, macroGoals.carbs, macroGoals.fat, macroGoals.protein]);

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
    const onSelectResult = async (food) => {
        if (!activeMeal) return;
        await addFood(activeMeal, food);
        closeSearch();
    };

    const openGoalsSheet = () => setSheetIndex(1);
    const closeGoalsSheet = () => setSheetIndex(-1);
    const clampInt = (s, min, max) => {
        const n = parseInt(s || '0', 10);
        if (Number.isNaN(n)) return min;
        return Math.max(min, Math.min(max, n));
    };

    // 🔒 Persist macro goals
    const onSaveGoals = async () => {
        const next = {
            calories: clampInt(goalForm.calories, 1, 100000),
            carbs: clampInt(goalForm.carbs, 0, 2000),
            fat: clampInt(goalForm.fat, 0, 1000),
            protein: clampInt(goalForm.protein, 0, 1000),
        };
        setMacroGoals(next);

        const uid = global?.userData?.uid || global?.userData?.id;
        if (uid) {
            try {
                await updateDoc(doc(db, 'users', uid), {
                    macroGoals: next,
                    updatedAt: serverTimestamp(),
                });
                // mirror to global immediately for other screens
                try {
                    global.userData = { ...(global.userData || {}), macroGoals: next };
                } catch { }
            } catch (e) {
                // if write fails, we still keep local state; optionally you could show a toast
                console.log('Failed to save macro goals:', e?.message || e);
            }
        }

        closeGoalsSheet();
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.stickyHeader}>
                    <Pressable onPress={() => shiftDate(-1)} hitSlop={8}>
                        <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                    </Pressable>
                    <Text style={styles.headerText}>{formatDate(focusedDate)}</Text>
                    <Pressable onPress={() => shiftDate(1)} hitSlop={8}>
                        <Ionicons name="chevron-forward" size={24} color={COLORS.text} />
                    </Pressable>
                </View>

                {/* Body */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: 14, paddingBottom: 120 }}
                    style={styles.body}
                >
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitle, styles.sectionTitleNoMargin]}>Nutrition</Text>
                        <Pressable style={styles.editGoalsPill} onPress={() => setSheetIndex(0)} hitSlop={8}>
                            <Ionicons name="settings-outline" size={14} color={COLORS.text} />
                            <Text style={styles.editGoalsText}>Edit Goals</Text>
                        </Pressable>
                    </View>

                    <View style={styles.trackerCard}>
                        <View style={styles.trackerRow}>
                            <View style={styles.progressContainer}>
                                <AnimatedCircularProgress
                                    size={138}
                                    width={12}
                                    fill={calorieProgress}
                                    tintColor={COLORS.ringTint}
                                    backgroundColor={COLORS.ringBg}
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
                                <MacroBar label="Protein" value={totals.protein} goal={macroGoals.protein} color={COLORS.protein} textPrimary={COLORS.text} textSecondary={COLORS.subtext} />
                                <MacroBar label="Carbs" value={totals.carbs} goal={macroGoals.carbs} color={COLORS.carbs} textPrimary={COLORS.text} textSecondary={COLORS.subtext} />
                                <MacroBar label="Fat" value={totals.fat} goal={macroGoals.fat} color={COLORS.fat} textPrimary={COLORS.text} textSecondary={COLORS.subtext} />
                            </View>
                        </View>
                    </View>

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
                    onOpenPersonalInfo={() => setPersonalIndex(1)}
                    COLORS={COLORS}
                />

                <PersonalInfoSheet
                    index={personalIndex}
                    onChangeIndex={setPersonalIndex}
                    goalForm={goalForm}
                    setGoalForm={setGoalForm}
                    onClose={() => setPersonalIndex(-1)}
                    onSave={() => setPersonalIndex(-1)}
                    COLORS={COLORS}
                />

                <Footer navigation={navigation} currentScreenName={'MacroTracking'} />
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    sectionHeaderRow: {
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    sectionTitleNoMargin: { marginLeft: 0 },

    stickyHeader: {
        backgroundColor: COLORS.bg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingTop: 56,
        paddingBottom: 6,
    },
    body: { backgroundColor: COLORS.bg },
    headerText: {
        fontSize: 16,
        color: COLORS.text,
        fontFamily: 'Outfit_700Bold',
    },

    sectionTitle: {
        fontSize: 18,
        marginLeft: 18,
        color: COLORS.text,
        letterSpacing: 0.2,
        fontFamily: 'Outfit_700Bold',
    },

    trackerCard: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 18,
        paddingRight: 18,
        marginBottom: 18,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.hairline,
    },

    trackerRow: { flexDirection: 'row', gap: 18 },
    progressContainer: { paddingRight: 6 },
    centerContent: { alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    valueText: { fontSize: 26, color: COLORS.text, fontFamily: 'Outfit_700Bold', marginBottom: -2.5 },
    valueSubtitleText: { fontSize: 12.5, color: COLORS.subtext, fontFamily: 'Outfit_500Medium', marginBottom: 4 },
    macroSummary: { flex: 1, paddingTop: 2 },

    editGoalsPill: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
    },
    editGoalsText: { fontFamily: 'Outfit_600SemiBold', color: COLORS.text, fontSize: 12.5, letterSpacing: 0.1 },

    underMealList: { paddingHorizontal: 18, marginTop: 0, marginBottom: 8 },
    underMealCard: {
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 22,
        marginVertical: 4,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.hairline,
        shadowOpacity: 0.03,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
        backgroundColor: COLORS.card,
    },
});
