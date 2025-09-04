// screens/MacroTracking.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, UIManager, Platform, LayoutAnimation, InteractionManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

// search is handled inside FoodSearchOverlay to reduce re-renders
import Footer from '../components/Footer';
import PlusIcon from '../assets/PlusIcon';
import DateHeader from '../components/2_MacroTracking/DateHeader';
import NutritionSummaryCard from '../components/2_MacroTracking/NutritionSummaryCard';
import MealsSection from '../components/2_MacroTracking/MealsSection';
import breakfastIcon from '../assets/breakfast.png';
import lunchIcon from '../assets/lunch.png';
import dinnerIcon from '../assets/dinner.png';
import snacksIcon from '../assets/snacks.png'

import FoodSearchOverlay from '../components/2_MacroTracking/FoodSearchOverlay';
import MacroGoalsSheet from '../components/2_MacroTracking/MacroGoalsSheet';

import { useFoodLogs, primeFoodLogsCache } from '../hooks/useFoodLogs';
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
    { name: 'Snacks', subtitle: 'Snacks keep you energized', icon: snacksIcon, iconSize: 22, bgColor: '#fed2bcff' },
];

export default function MacroTracking({ navigation }) {
    const [focusedDate, setFocusedDate] = useState(new Date());
    // Defer heavy Firestore subscriptions until after the transition starts
    const [logsReady, setLogsReady] = useState(false);
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => setLogsReady(true));
        return () => task?.cancel?.();
    }, []);
    const { meals, totals, addFood, deleteFood } = useFoodLogs(focusedDate, undefined, logsReady);

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

    // Subscribe to user's macro goals in Firestore AFTER transition starts
    useEffect(() => {
        if (!logsReady) return;
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

            setGoalForm((s) => ({
                ...s,
                calories: s.calories === '' ? String(next.calories) : s.calories,
                carbs: s.carbs === '' ? String(next.carbs) : s.carbs,
                fat: s.fat === '' ? String(next.fat) : s.fat,
                protein: s.protein === '' ? String(next.protein) : s.protein,
            }));

            try {
                global.userData = { ...(global.userData || {}), macroGoals: next };
            } catch { }
        });

        return () => unsub && unsub();
    }, [logsReady]);

    // Warm cache around the focused date for smoother navigation (±2 days).
    // Run regardless of logsReady so the cache is primed before subscribing.
    useEffect(() => {
        const uid = global?.userData?.uid || global?.userData?.id;
        if (uid) primeFoodLogsCache(uid, focusedDate, 7);
    }, [focusedDate]);

    const [goalsSheetIndex, setGoalsSheetIndex] = useState(-1);
    const [personalSheetIndex, setPersonalSheetIndex] = useState(-1);

    const [searchVisible, setSearchVisible] = useState(false);
    const [activeMeal, setActiveMeal] = useState(null);

    const [collapsed, setCollapsed] = useState({ Breakfast: false, Lunch: false, Dinner: false });

    const toggleMeal = useCallback((name) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
    }, []);

    const formatDate = (date) =>
        date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const shiftDate = (days) => {
        const d = new Date(focusedDate);
        d.setDate(d.getDate() + days);
        try {
            const uidX = global?.userData?.uid || global?.userData?.id;
            if (uidX) primeFoodLogsCache(uidX, d, 7);
        } catch {}
        setFocusedDate(d);
    };

    // Search is now fully managed inside FoodSearchOverlay

    // When opening the sheet, seed empty fields from the latest macroGoals
    useEffect(() => {
        if (goalsSheetIndex >= 0) {
            setGoalForm((s) => ({
                ...s,
                calories: s.calories === '' ? String(macroGoals.calories) : s.calories,
                carbs: s.carbs === '' ? String(macroGoals.carbs) : s.carbs,
                fat: s.fat === '' ? String(macroGoals.fat) : s.fat,
                protein: s.protein === '' ? String(macroGoals.protein) : s.protein,
            }));
        }
    }, [goalsSheetIndex, macroGoals.calories, macroGoals.carbs, macroGoals.fat, macroGoals.protein]);

    const openSearchForMeal = useCallback((meal) => {
        setActiveMeal(meal?.name ?? null);
        setSearchVisible(true);
    }, []);
    const closeSearch = useCallback(() => {
        setSearchVisible(false);
        setActiveMeal(null);
    }, []);
    const onSelectResult = useCallback(async (food) => {
        if (!activeMeal) return;
        await addFood(activeMeal, food);
        closeSearch();
    }, [activeMeal, addFood, closeSearch]);

    const openGoalsSheet = () => setGoalsSheetIndex(1);
    const closeGoalsSheet = () => setGoalsSheetIndex(-1);
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
                <DateHeader title={formatDate(focusedDate)} onPrev={() => shiftDate(-1)} onNext={() => shiftDate(1)} COLORS={COLORS} />

                {/* Body */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: 14, paddingBottom: 120 }}
                    style={styles.body}
                    removeClippedSubviews
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitle, styles.sectionTitleNoMargin]}>Nutrition</Text>
                        <Pressable style={styles.editGoalsPill} onPress={() => setGoalsSheetIndex(0)} hitSlop={8}>
                            <Ionicons name="settings-outline" size={14} color={COLORS.text} />
                            <Text style={styles.editGoalsText}>Edit Goals</Text>
                        </Pressable>
                    </View>

                    <NutritionSummaryCard totals={totals} goals={macroGoals} COLORS={COLORS} />

                    <MealsSection
                        mealsMeta={mealsMeta}
                        meals={meals}
                        collapsed={collapsed}
                        toggleMeal={toggleMeal}
                        onAddPress={openSearchForMeal}
                        onDelete={deleteFood}
                        COLORS={COLORS}
                        PlusIcon={PlusIcon}
                    />
                </ScrollView>

                {/* Modals */}
                <FoodSearchOverlay
                    visible={searchVisible}
                    activeMeal={activeMeal}
                    onClose={closeSearch}
                    COLORS={COLORS}
                    onSelectResult={onSelectResult}
                />

                <MacroGoalsSheet
                    index={goalsSheetIndex}
                    onChangeIndex={setGoalsSheetIndex}
                    goalForm={goalForm}
                    setGoalForm={setGoalForm}
                    onSave={onSaveGoals}
                    onCancel={closeGoalsSheet}
                    onOpenPersonalInfo={() => setPersonalSheetIndex(1)}
                    COLORS={COLORS}
                />

                <PersonalInfoSheet
                    index={personalSheetIndex}
                    onChangeIndex={setPersonalSheetIndex}
                    goalForm={goalForm}
                    setGoalForm={setGoalForm}
                    onClose={() => setPersonalSheetIndex(-1)}
                    onSave={() => setPersonalSheetIndex(-1)}
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
    body: { backgroundColor: COLORS.bg },

    sectionTitle: {
        fontSize: 17,
        marginLeft: 18,
        color: COLORS.text,
        fontFamily: 'Nunito_800ExtraBold',
    },

    editGoalsPill: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
    },
    editGoalsText: { fontFamily: 'Outfit_600SemiBold', color: COLORS.text, fontSize: 12.5 },
});
