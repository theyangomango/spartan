// screens/MacroTracking.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, UIManager, Platform, LayoutAnimation, StatusBar, useWindowDimensions, VirtualizedList, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView as SafeAreaInsetsView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Footer from '../components/Footer';
import WorkoutBarcodeScannerModal from '../components/2_MacroTracking/WorkoutBarcodeScannerModal';

// search is handled inside FoodSearchOverlay to reduce re-renders
import PlusIcon from '../assets/PlusIcon';
import DateHeader from '../components/2_MacroTracking/DateHeader';
import MacroDayPage from '../components/2_MacroTracking/MacroDayPage';
import breakfastIcon from '../assets/breakfast.png';
import lunchIcon from '../assets/lunch.png';
import dinnerIcon from '../assets/dinner.png';
import snacksIcon from '../assets/snacks.png'
import MacroGoalsSheet from '../components/2_MacroTracking/MacroGoalsSheet';
import PersonalInfoSheet from '../components/2_MacroTracking/PersonalInfoSheet';
import FoodSearchOverlay from '../components/2_MacroTracking/FoodSearchOverlay';

import scaleSize from '../helper/scaleSize';

// 🔥 Firestore (load + save macro goals)
import { db } from '../../firebase.config';
import theme from '../theme/mfpDark';
import { toDayKey } from '../utils/date';
import { buildFromGlobal } from '../logic/macroLogsIndexer';
import { doc, onSnapshot, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { touchRecentFood } from '../utils/recentFoods';

// scaleSize primarily used for floating controls; child components handle their own scaling

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Unified dark palette (match other screens). Reduce contrast vs. bg.
const COLORS = {
    bg: theme.bg,
    card: theme.surface,
    text: theme.textPrimary,
    subtext: theme.textSecondary,
    hairline: theme.hairline,
    ringTint: theme.primary,
    ringBg: theme.ringBg,
    ringTrack: theme.ringBg,
    chipBg: theme.surface,
    addBtnBg: theme.surface,
    fieldBg: theme.surface,
    accentBlue: theme.primary,
    accent: theme.primary,
    // Macro colors
    protein: '#6c98fcff',
    carbs: '#ff7cb5ff',
    fat: '#FFC874',
    shadow: '#000',
    modalCard: theme.surface,
};

const mealsMeta = [
    { name: 'Breakfast', subtitle: 'Breakfast starts your day', icon: breakfastIcon, bgColor: '#FBEDD9' },
    { name: 'Lunch', subtitle: 'Lunch fuels your goals', icon: lunchIcon, bgColor: '#FFE8E9' },
    { name: 'Dinner', subtitle: 'Dinner completes your nutrition', icon: dinnerIcon, bgColor: '#EAEECE' },
    // Snacks bucket (UI shows plural, key also plural for consistency)
    { name: 'Snacks', subtitle: 'Snacks keep you energized', icon: snacksIcon, iconSize: 22, bgColor: '#fed2bcff' },
];

export default function MacroTracking({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    // Fast caches for global.loggedFoods → day-index and built meals
    const lastCountRef = useRef(0);
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
    // Local state derived from global.loggedFoods for the focused day
    const [meals, setMeals] = useState(() => ({ Breakfast: [], Lunch: [], Dinner: [], Snacks: [] }));
    const [totals, setTotals] = useState(() => ({ calories: 0, protein: 0, carbs: 0, fat: 0 }));

    // -------- goals (load from user doc, save back) --------
    const [macroGoals, setMacroGoals] = useState({ calories: 2340, carbs: 285, fat: 70, protein: 140 });

    // Prefill macro fields from current macroGoals so inputs show those values initially
    const [goalForm, setGoalForm] = useState(() => ({
        gender: 'male',
        weight: '',
        heightFt: '',
        heightIn: '',
        age: '',
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
                        age: s.age === '' && (pi.age != null) ? String(pi.age) : s.age,
                    }));
                    try { global.userData = { ...(global.userData || {}), personalInfo: pi }; } catch { }
                }
            } catch { }
        });

        return () => unsub && unsub();
    }, []);

    // No network prefetch here — rely on global.userData.loggedFoods for instant render

    // If MacroTracking is already mounted and new params arrive, update the focused date
    useEffect(() => {
        const p = route?.params?.focusDate || route?.params?.date;
        const parsed = parseFocusParam(p);
        if (!parsed) return;
        try {
            const cur = new Date(focusedDate);
            cur.setHours(0, 0, 0, 0);
            if (cur.getTime() !== parsed.getTime()) setFocusedDate(parsed);
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route?.params?.focusDate, route?.params?.date]);

    const [goalsSheetIndex, setGoalsSheetIndex] = useState(-1);
    const [goalsOpenSignal, setGoalsOpenSignal] = useState(null); // null until user explicitly opens
    const [personalSheetIndex, setPersonalSheetIndex] = useState(-1);

    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [selectedMeal, setSelectedMeal] = useState(null);

    const [collapsedMeals, setCollapsedMeals] = useState({ Breakfast: false, Lunch: false, Dinner: false });
    const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);

    const isGoalsSheetOpen = goalsSheetIndex >= 0;

    const handleBarcodePress = useCallback(() => {
        try { haptic(); } catch {}
        setBarcodeScannerVisible(true);
    }, []);

    const closeBarcodeScanner = useCallback(() => {
        setBarcodeScannerVisible(false);
    }, []);

    const handleBarcodeResult = useCallback((food) => {
        if (!food) {
            setBarcodeScannerVisible(false);
            return;
        }
        setBarcodeScannerVisible(false);
        setTimeout(() => {
            navigation.navigate('FoodDetail', {
                mode: 'add',
                food,
                mealName: selectedMeal || 'Snacks',
                dayKey: toDayKey(focusedDate),
            });
        }, 80);
    }, [navigation, focusedDate, selectedMeal]);

    const toggleMealCollapse = useCallback((name) => {
        try { haptic(); } catch {}
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCollapsedMeals((prev) => ({ ...prev, [name]: !prev[name] }));
    }, []);

    const formatDate = (date) =>
        date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const shiftDate = (days) => {
        const d = new Date(focusedDate);
        d.setDate(d.getDate() + days);
        // Immediately show empty meals/totals to avoid any perceived loading
        setMeals({ Breakfast: [], Lunch: [], Dinner: [], Snacks: [] });
        setTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
        setFocusedDate(d);
    };

    const jumpToToday = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Show empty default first for instant transition
        setMeals({ Breakfast: [], Lunch: [], Dinner: [], Snacks: [] });
        setTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
        setFocusedDate(today);
    };

    // --- Horizontal pager (VirtualizedList-like behavior) ---
    const TOTAL_PAGES = 100000;
    const BASE_INDEX = Math.floor(TOTAL_PAGES / 2);
    const [baseIndex, setBaseIndex] = useState(BASE_INDEX);
    const [headerDate, setHeaderDate] = useState(focusedDate);
    const lastHeaderIndexRef = useRef(baseIndex);

    // Keep header + page data in sync when focusedDate changes
    useEffect(() => {
        setHeaderDate(focusedDate);
        const built = buildFromGlobal(focusedDate);
        setMeals(built.meals);
        setTotals(built.totals);
    }, [focusedDate]);

    const listRef = useRef(null);

    // Slide pages horizontally by delta days; always animate
    const slideBy = useCallback((delta) => {
        try {
            listRef.current?.scrollToIndex({ index: baseIndex + delta, animated: true });
        } catch {
            setTimeout(() => {
                try { listRef.current?.scrollToIndex({ index: baseIndex + delta, animated: true }); } catch {}
            }, 16);
        }
    }, [baseIndex]);

    // Delete an entry from the focused day's global.loggedFoods and local state
    const deleteFood = useCallback((mealName, entry) => {
        const uid = global?.userData?.uid || global?.userData?.id;
        const dk = toDayKey(focusedDate);
        const m = entry?.macros || parseMacrosFromDescription(entry?.desc || '', entry?.quantity || 1);
        setMeals((prev) => ({
            ...prev,
            [mealName]: (prev[mealName] || []).filter((x) => x.key !== entry.key),
        }));
        setTotals((prev) => ({
            calories: Math.max(0, Math.round((prev.calories || 0) - (m.calories || 0))),
            protein: Math.max(0, Math.round((prev.protein || 0) - (m.protein || 0))),
            carbs: Math.max(0, Math.round((prev.carbs || 0) - (m.carbs || 0))),
            fat: Math.max(0, Math.round((prev.fat || 0) - (m.fat || 0))),
        }));
        // Remove from global cache (supports both nested-by-day and flat legacy shapes)
        try {
            const map = global?.userData?.loggedFoods;
            if (map) {
                if (map[dk] && typeof map[dk] === 'object') {
                    try { delete map[dk][entry.key]; } catch {}
                }
                // Also attempt flat delete for legacy shape
                try { delete map[entry.key]; } catch {}
                // bump signature for subscribers
                try { global.__loggedFoodsSig = (global.__loggedFoodsSig || 0) + 1; } catch {}
            }
        } catch { }
        try {
            if (uid) {
                const uref = doc(db, 'users', uid);
                const nestedPath = `loggedFoods.${dk}.${entry.key}`;
                const flatPath = `loggedFoods.${entry.key}`;
                updateDoc(uref, { [nestedPath]: deleteField(), [flatPath]: deleteField() }).catch(() => { });
            }
        } catch { }
    }, [focusedDate]);

    // MacroDayPage extracted into separate file for clarity

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
        try { haptic(); } catch {}
        setSelectedMeal(meal?.name ?? null);
        setIsSearchVisible(true);
    }, []);
    const closeSearch = useCallback(() => {
        setIsSearchVisible(false);
        setSelectedMeal(null);
    }, []);
    const onSelectResult = useCallback(async (food) => {
        if (!selectedMeal) return;
        const uid = global?.userData?.uid || global?.userData?.id;
        const dk = toDayKey(focusedDate);
        const factor = food?.__portionMultiplier ?? 1;
        const macros = parseMacrosFromDescription(food.food_description || '', factor);
        const makeRand = () => Math.random().toString(36).slice(2, 10);
        const newId = `${Date.now().toString(36)}${makeRand()}`;
        const entry = {
            key: newId,
            food_id: String(food.food_id ?? ''),
            name: food.food_name || '',
            brand: food.brand_name || '',
            desc: food.food_description || '',
            macros,
            quantity: factor,
        };
        try {
            global.userData = global.userData || {};
            global.userData.loggedFoods = global.userData.loggedFoods || {};
            global.userData.loggedFoods[dk] = global.userData.loggedFoods[dk] || {};
            global.userData.loggedFoods[dk][newId] = {
                dayKey: dk,
                meal: String(selectedMeal),
                name: entry.name,
                brand: entry.brand,
                desc: entry.desc,
                foodId: entry.food_id,
                quantity: factor,
                macros,
                createdAt: Date.now(),
            };
            try { global.__loggedFoodsSig = (global.__loggedFoodsSig || 0) + 1; } catch {}
        } catch { }
        setMeals((prev) => ({ ...prev, [selectedMeal]: [...(prev[selectedMeal] || []), entry] }));
        setTotals((prev) => ({
            calories: Math.round((prev.calories || 0) + (macros.calories || 0)),
            protein: Math.round((prev.protein || 0) + (macros.protein || 0)),
            carbs: Math.round((prev.carbs || 0) + (macros.carbs || 0)),
            fat: Math.round((prev.fat || 0) + (macros.fat || 0)),
        }));
        try {
            if (uid) {
                const uref = doc(db, 'users', uid);
                const fieldPath = `loggedFoods.${dk}.${newId}`;
                const flat = {
                    dayKey: dk,
                    meal: String(selectedMeal),
                    name: entry.name,
                    brand: entry.brand,
                    desc: entry.desc,
                    foodId: entry.food_id,
                    quantity: factor,
                    macros,
                    createdAt: serverTimestamp(),
                };
                updateDoc(uref, { [fieldPath]: flat }).catch(() => { });
                // Update Recent Foods backend
                touchRecentFood(uid, {
                    foodId: entry.food_id,
                    name: entry.name,
                    brand: entry.brand,
                    description: entry.desc,
                }).catch(() => {});
            }
        } catch { }
        closeSearch();
    }, [selectedMeal, focusedDate, closeSearch]);

    const openGoalsSheet = () => { try { haptic(); } catch {} setGoalsSheetIndex(0); setGoalsOpenSignal((s) => (s == null ? 1 : s + 1)); };
    const closeGoalsSheet = () => { setGoalsSheetIndex(-1); };
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

        const clampOptional = (value, min, max) => {
            if (value == null || value === '') return null;
            const n = parseInt(String(value), 10);
            if (Number.isNaN(n)) return null;
            return Math.max(min, Math.min(max, n));
        };

        const info = {
            gender: String(goalForm.gender || 'male'),
            activity: String(goalForm.activity || 'moderate'),
            goal: String(goalForm.goal || 'maintain'),
            weight: clamp(goalForm.weight, 0, 2000),
            heightFt: clamp(goalForm.heightFt, 0, 8),
            heightIn: clamp(goalForm.heightIn, 0, 11),
            age: clampOptional(goalForm.age, 13, 100),
        };

        try {
            await updateDoc(doc(db, 'users', uid), {
                personalInfo: info,
                updatedAt: serverTimestamp(),
            });
            try { global.userData = { ...(global.userData || {}), personalInfo: info }; } catch { }
        } catch (e) {
            console.log('Failed to save personal info:', e?.message || e);
        }
    };

    // Build meals/totals from in-memory global.userData.loggedFoods (instant, memoized)
    // buildFromGlobal moved to frontend/logic/macroLogsIndexer

    // Refresh from global when returning to this screen so edits/saves reflect
    useFocusEffect(React.useCallback(() => {
        const built = buildFromGlobal(focusedDate);
        setMeals(built.meals);
        setTotals(built.totals);
    }, [focusedDate]));

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
                {/* Header */}
                <SafeAreaInsetsView edges={['top']} style={{ backgroundColor: COLORS.bg }}>
                    <DateHeader
                        title={formatDate(headerDate)}
                        onPrev={() => slideBy(-1)}
                        onNext={() => slideBy(1)}
                        onTitlePress={jumpToToday}
                        COLORS={COLORS}
                    />
                </SafeAreaInsetsView>

                {/* Body: horizontally swipeable pages */}
                <VirtualizedList
                    ref={listRef}
                    style={{ flex: 1, backgroundColor: COLORS.bg }}
                    horizontal
                    pagingEnabled
                    directionalLockEnabled
                    decelerationRate="fast"
                    initialNumToRender={3}
                    windowSize={5}
                    maxToRenderPerBatch={2}
                    updateCellsBatchingPeriod={16}
                    removeClippedSubviews={false}
                    snapToInterval={screenWidth}
                    snapToAlignment="start"
                    disableIntervalMomentum
                    scrollEnabled
                    bounces={false}
                    overScrollMode="never"
                    scrollEventThrottle={16}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item, index) => String(index)}
                    getItemCount={() => TOTAL_PAGES}
                    getItem={(_data, index) => index}
                    initialScrollIndex={baseIndex}
                    getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
                    onLayout={() => {
                        try { listRef.current?.scrollToIndex({ index: baseIndex, animated: false }); } catch { }
                    }}
                    // Keep date updates to the cheap end-of-gesture callback
                    onScroll={(e) => {
                        try {
                            const x = e?.nativeEvent?.contentOffset?.x || 0;
                            const nextIndex = Math.round(x / (screenWidth || 1));
                            if (nextIndex !== lastHeaderIndexRef.current) {
                                lastHeaderIndexRef.current = nextIndex;
                                const delta = nextIndex - baseIndex;
                                const d = new Date(focusedDate);
                                d.setDate(d.getDate() + delta);
                                d.setHours(0, 0, 0, 0);
                                setHeaderDate(d);
                            }
                        } catch {}
                    }}
                    onScrollToIndexFailed={({ index }) => {
                        setTimeout(() => {
                            try { listRef.current?.scrollToIndex({ index, animated: true }); } catch { }
                        }, 16);
                    }}
                    onMomentumScrollEnd={(e) => {
                        const x = e?.nativeEvent?.contentOffset?.x || 0;
                        const nextIndex = Math.round(x / (screenWidth || 1));
                        if (Number.isFinite(nextIndex) && nextIndex !== baseIndex) {
                            const delta = nextIndex - baseIndex;
                            setBaseIndex(nextIndex);
                            shiftDate(delta);
                            const d = new Date(focusedDate);
                            d.setDate(d.getDate() + delta);
                            d.setHours(0, 0, 0, 0);
                            setHeaderDate(d);
                        }
                        // Keep subscription unchanged; data will hydrate if needed
                    }}
                    renderItem={({ index }) => {
                        const offset = index - baseIndex;
                        const d = new Date(focusedDate);
                        d.setDate(d.getDate() + offset);
                        d.setHours(0, 0, 0, 0);
                        const fromGlobal = buildFromGlobal(d);
                        const hasLocalMeals = (meals?.Breakfast?.length || meals?.Lunch?.length || meals?.Dinner?.length || meals?.Snacks?.length);
                        const mealsForPage = offset === 0
                            ? (hasLocalMeals ? meals : fromGlobal.meals)
                            : fromGlobal.meals;
                        const totalsForPage = offset === 0
                            ? ((totals?.calories || totals?.protein || totals?.carbs || totals?.fat) ? totals : fromGlobal.totals)
                            : fromGlobal.totals;
                        return (
                            <MacroDayPage
                                screenWidth={screenWidth}
                                COLORS={COLORS}
                                macroGoals={macroGoals}
                                meals={mealsForPage}
                                totals={totalsForPage}
                                collapsed={collapsedMeals}
                                toggleMeal={toggleMealCollapse}
                                openGoalsSheet={openGoalsSheet}
                                openSearchForMeal={openSearchForMeal}
                                deleteFood={deleteFood}
                                PlusIcon={PlusIcon}
                                date={d}
                                isFocused={Math.abs(offset) <= 1}
                                mealsMeta={mealsMeta}
                            />
                        );
                    }}
                />

                <TouchableOpacity
                    style={[
                        styles.barcodeButton,
                        {
                            bottom: (insets.bottom || 0) + scaleSize(110),
                            opacity: isGoalsSheetOpen ? 0 : 1,
                            zIndex: isGoalsSheetOpen ? 0 : 3,
                            elevation: isGoalsSheetOpen ? 0 : 3,
                        },
                    ]}
                    activeOpacity={0.85}
                    onPress={handleBarcodePress}
                    disabled={isGoalsSheetOpen}
                    accessibilityRole="button"
                    accessibilityLabel="Open barcode scanner"
                >
                    <Ionicons
                        name="barcode-outline"
                        size={scaleSize(24)}
                        color="#000"
                    />
                </TouchableOpacity>

                <WorkoutBarcodeScannerModal
                    visible={barcodeScannerVisible}
                    onClose={closeBarcodeScanner}
                    onResult={handleBarcodeResult}
                />

                {/* Modals */}
                <FoodSearchOverlay
                    visible={isSearchVisible}
                    activeMeal={selectedMeal}
                    onClose={closeSearch}
                    COLORS={COLORS}
                    onSelectResult={onSelectResult}
                    dayKey={toDayKey(focusedDate)}
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
    barcodeButton: {
        position: 'absolute',
        right: scaleSize(24),
        width: scaleSize(56),
        height: scaleSize(56),
        borderRadius: scaleSize(28),
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
    },
});
