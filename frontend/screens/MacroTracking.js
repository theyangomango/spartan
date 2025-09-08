// screens/MacroTracking.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, UIManager, Platform, LayoutAnimation, InteractionManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Footer from '../components/Footer';

// search is handled inside FoodSearchOverlay to reduce re-renders
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
    bg: '#f0f4f9ff',
    card: '#FFFFFF',
    text: '#0F172A',
    subtext: '#64748B',
    hairline: 'rgba(2, 6, 23, 0.06)',
    ringTint: '#6FB8FF',
    ringBg: '#E2E8F0',
    chipBg: '#EEF2FF',
    addBtnBg: '#dbe8ffb0',
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

export default function MacroTracking({ navigation, route }) {
    // Allow focusing a specific date via navigation params
    const parseFocusParam = (param) => {
        if (!param) return null;
        try {
            let d = null;
            if (typeof param === 'number') {
                d = new Date(param);
            } else if (typeof param === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
                    const [y, m, dd] = param.split('-').map((n) => parseInt(n, 10));
                    d = new Date(y, (m || 1) - 1, dd || 1);
                } else {
                    const tmp = new Date(param);
                    if (!Number.isNaN(tmp.getTime())) d = tmp;
                }
            } else if (param instanceof Date) {
                d = new Date(param);
            }
            if (!d || Number.isNaN(d.getTime())) return null;
            d.setHours(0, 0, 0, 0);
            return d;
        } catch { return null; }
    };

    const initialFocus = parseFocusParam(route?.params?.focusDate || route?.params?.date) || new Date();
    const [focusedDate, setFocusedDate] = useState(initialFocus);
    // Defer heavy Firestore subscriptions until after the transition starts
    const [logsReady, setLogsReady] = useState(true);
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
            if (mg) {
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
            }

            // Also hydrate personal info if present (non-destructive for non-empty fields)
            try {
                const pi = data.personalInfo || null;
                if (pi) {
                    setGoalForm((s) => ({
                        ...s,
                        gender: pi.gender ?? s.gender,
                        activity: pi.activity ?? s.activity,
                        goal: pi.goal ?? s.goal,
                        weight: s.weight === '' && (pi.weight != null) ? String(pi.weight) : s.weight,
                        heightFt: s.heightFt === '' && (pi.heightFt != null) ? String(pi.heightFt) : s.heightFt,
                        heightIn: s.heightIn === '' && (pi.heightIn != null) ? String(pi.heightIn) : s.heightIn,
                    }));
                    try { global.userData = { ...(global.userData || {}), personalInfo: pi }; } catch {}
                }
            } catch {}
        });

        return () => unsub && unsub();
    }, [logsReady]);

    // Warm cache around the focused date for smoother navigation (±2 days).
    // Run regardless of logsReady so the cache is primed before subscribing.
    useEffect(() => {
        const uid = global?.userData?.uid || global?.userData?.id;
        if (uid) primeFoodLogsCache(uid, focusedDate, 7);
    }, [focusedDate]);

    // If MacroTracking is already mounted and new params arrive, update the focused date
    useEffect(() => {
        const p = route?.params?.focusDate || route?.params?.date;
        const parsed = parseFocusParam(p);
        if (!parsed) return;
        try {
            const cur = new Date(focusedDate);
            cur.setHours(0, 0, 0, 0);
            if (cur.getTime() !== parsed.getTime()) setFocusedDate(parsed);
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route?.params?.focusDate, route?.params?.date]);

    const [goalsSheetIndex, setGoalsSheetIndex] = useState(-1);
    const [goalsOpenSignal, setGoalsOpenSignal] = useState(null); // null until user explicitly opens
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

    const openGoalsSheet = () => { setGoalsSheetIndex(0); setGoalsOpenSignal((s) => (s == null ? 1 : s + 1)); };
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

    // 🔒 Persist personal info (gender/weight/height/activity/goal) on Save & Calculate
    const onSavePersonalInfo = async () => {
        const uid = global?.userData?.uid || global?.userData?.id;
        if (!uid) return;

        const clamp = (s, min, max) => {
            const n = parseInt(String(s || '0'), 10);
            if (Number.isNaN(n)) return min;
            return Math.max(min, Math.min(max, n));
        };

        const info = {
            gender: String(goalForm.gender || 'male'),
            activity: String(goalForm.activity || 'moderate'),
            goal: String(goalForm.goal || 'maintain'),
            weight: clamp(goalForm.weight, 0, 2000),
            heightFt: clamp(goalForm.heightFt, 0, 8),
            heightIn: clamp(goalForm.heightIn, 0, 11),
        };

        try {
            await updateDoc(doc(db, 'users', uid), {
                personalInfo: info,
                updatedAt: serverTimestamp(),
            });
            try { global.userData = { ...(global.userData || {}), personalInfo: info }; } catch {}
        } catch (e) {
            console.log('Failed to save personal info:', e?.message || e);
        }
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
                        <Pressable style={styles.editGoalsPill} onPress={openGoalsSheet} hitSlop={8}>
                            <Ionicons name="settings-outline" size={15} color={'#3e9effff'} />
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
                    openSignal={goalsOpenSignal}
                    goalForm={goalForm}
                    setGoalForm={setGoalForm}
                    onSave={onSaveGoals}
                    onCancel={closeGoalsSheet}
                    onSavePersonalInfo={onSavePersonalInfo}
                    onOpenPersonalInfo={() => setPersonalSheetIndex(1)}
                    COLORS={COLORS}
                />

                <PersonalInfoSheet
                    index={personalSheetIndex}
                    onChangeIndex={setPersonalSheetIndex}
                    goalForm={goalForm}
                    setGoalForm={setGoalForm}
                    onClose={() => setPersonalSheetIndex(-1)}
                    onSave={() => { onSavePersonalInfo(); setPersonalSheetIndex(-1); }}
                    COLORS={COLORS}
                />

                <Footer currentScreenName={'MacroTracking'} navigation={navigation} />
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
        marginBottom: 6,
    },
    sectionTitleNoMargin: { marginLeft: 0 },
    body: { backgroundColor: COLORS.bg },

    sectionTitle: {
        fontSize: 16,
        marginLeft: 18,
        color: COLORS.text,
        fontFamily: 'Nunito_800ExtraBold',
    },

    editGoalsPill: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        backgroundColor: COLORS.addBtnBg || '#E7F0FF',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.ringTint ? `${COLORS.ringTint}80` : 'rgba(111,184,255,0.5)',
    },
    editGoalsText: { fontFamily: 'Outfit_700Bold',color: '#3e9effca', fontSize: 13 },
});
