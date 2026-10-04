// screens/MacroTracking.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, UIManager, Platform, StatusBar, useWindowDimensions, VirtualizedList, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { doc, onSnapshot, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';

import Footer from '../components/Footer';
import WorkoutBarcodeScannerModal from '../components/2_MacroTracking/WorkoutBarcodeScannerModal';
import PlusIcon from '../assets/PlusIcon';
import DateHeader from '../components/2_MacroTracking/DateHeader';
import MacroDayPage from '../components/2_MacroTracking/MacroDayPage';
import MacroGoalsSheet from '../components/2_MacroTracking/MacroGoalsSheet';
import FoodSearchOverlay from '../components/2_MacroTracking/FoodSearchOverlay';
import scaleSize from '../helper/scaleSize';
import useStableSafeAreaInsets from '../hooks/useStableSafeAreaInsets';
import { getUnifiedHeaderSafeAreaOffset } from '../theme/headerMetrics';
// 🔥 Firestore (load + save macro goals)
import { db } from '../../firebase.config';
import { toDayKey } from '../utils/date';
import { buildFromGlobal } from '../logic/macroLogsIndexer';
import { touchRecentFood } from '../utils/recentFoods';
import { parseMacrosFromDescription, scaleMacros } from '../utils/nutrition';
import { COLORS, mealsMeta, TOTAL_PAGES, BASE_INDEX } from './macroTracking/macroTrackingConstants';
import {
    clampDateToToday,
    clampForwardDelta,
    sumWorkoutCaloriesForDay,
    scaleGoalsWithBurn,
    parseFocusParam,
    formatDate,
    clampInt,
} from './macroTracking/macroDayUtils';
import useCompletedWorkoutsSignature from './macroTracking/useCompletedWorkoutsSignature';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const HEADER_SAFE_AREA_OFFSET = getUnifiedHeaderSafeAreaOffset();

export default function MacroTracking({ navigation, route }) {
    const insets = useStableSafeAreaInsets();
    const headerSafeAreaPadding = Math.max(0, (insets.top || 0) - HEADER_SAFE_AREA_OFFSET);
    const { width: screenWidth } = useWindowDimensions();
    const initialFocus = clampDateToToday(parseFocusParam(route?.params?.focusDate || route?.params?.date) || new Date());
    const [focusedDate, setFocusedDate] = useState(initialFocus);
    // Local state derived from global.loggedFoods for the focused day
    const [meals, setMeals] = useState(() => ({ Breakfast: [], Lunch: [], Dinner: [], Snacks: [] }));
    const [totals, setTotals] = useState(() => ({ calories: 0, protein: 0, carbs: 0, fat: 0 }));
    const completedWorkoutsSig = useCompletedWorkoutsSignature();
    const [applyWorkoutCalories, setApplyWorkoutCalories] = useState(
        () => !!(global?.userData?.macroSettings?.applyWorkoutCaloriesToGoals)
    );

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

        const ref = doc(db, 'usersPrivate', uid);
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

            const applySettingRaw = data?.macroSettings?.applyWorkoutCaloriesToGoals;
            const applySetting = applySettingRaw === undefined ? false : !!applySettingRaw;
            setApplyWorkoutCalories((prev) => (prev === applySetting ? prev : applySetting));
            try {
                global.userData = {
                    ...(global.userData || {}),
                    macroSettings: {
                        ...(global.userData?.macroSettings || {}),
                        applyWorkoutCaloriesToGoals: applySetting,
                    },
                };
            } catch { }

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

    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [selectedMeal, setSelectedMeal] = useState(null);

    const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);

    const isGoalsSheetOpen = goalsSheetIndex >= 0;

    const handleBarcodePress = useCallback(() => {
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

    const shiftDate = (days) => {
        if (!Number.isFinite(days) || days === 0) return;
        const d = new Date(focusedDate);
        d.setDate(d.getDate() + days);
        const safeDate = clampDateToToday(d);
        // Immediately show empty meals/totals to avoid any perceived loading
        setMeals({ Breakfast: [], Lunch: [], Dinner: [], Snacks: [] });
        setTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
        setFocusedDate(safeDate);
    };

    const jumpToToday = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Show empty default first for instant transition
        setMeals({ Breakfast: [], Lunch: [], Dinner: [], Snacks: [] });
        setTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
        setFocusedDate(today);
    };

    const openLoggedFoodsHistory = useCallback(() => {
        const viewerData = (() => {
            try { return global?.userData || null; } catch { return null; }
        })();
        const params = viewerData?.uid ? {
            targetUid: String(viewerData.uid),
            isViewingSelf: true,
            initialUser: viewerData,
        } : undefined;
        try {
            navigation.navigate('ProfileLoggedFoods', params);
        } catch {
            try {
                navigation.getParent?.('ROOT')?.navigate?.('ProfileLoggedFoods', params);
            } catch { }
        }
    }, [navigation]);

    // --- Horizontal pager (VirtualizedList-like behavior) ---
    const [baseIndex, setBaseIndex] = useState(BASE_INDEX);
    const [headerDate, setHeaderDate] = useState(focusedDate);
    const lastHeaderIndexRef = useRef(baseIndex);

    const isHeaderDateToday = useMemo(() => {
        if (!headerDate) return false;
        try {
            const candidate = new Date(headerDate);
            if (Number.isNaN(candidate.getTime())) return false;
            candidate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return candidate.getTime() === today.getTime();
        } catch {
            return false;
        }
    }, [headerDate]);

    const refreshDayData = useCallback(() => {
        const built = buildFromGlobal(focusedDate);
        setMeals(built.meals);
        setTotals(built.totals);
    }, [focusedDate, buildFromGlobal]);

    // Keep header + page data in sync when focusedDate changes
    useEffect(() => {
        setHeaderDate(focusedDate);
        refreshDayData();
    }, [focusedDate, refreshDayData]);

    const listRef = useRef(null);

    const scrollToIndexSafe = useCallback((index, animated = true) => {
        try {
            listRef.current?.scrollToIndex({ index, animated });
        } catch {
            setTimeout(() => {
                try { listRef.current?.scrollToIndex({ index, animated }); } catch {}
            }, 16);
        }
    }, []);

    // Slide pages horizontally by delta days; always animate
    const slideBy = useCallback((delta) => {
        if (!delta) return;
        const allowedDelta = delta > 0 ? clampForwardDelta(delta, focusedDate) : delta;
        if (delta > 0 && allowedDelta <= 0) return;
        scrollToIndexSafe(baseIndex + allowedDelta, true);
    }, [baseIndex, focusedDate, scrollToIndexSafe]);

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
                const uref = doc(db, 'usersPrivate', uid);
                const nestedPath = `loggedFoods.${dk}.${entry.key}`;
                const flatPath = `loggedFoods.${entry.key}`;
                updateDoc(uref, { [nestedPath]: deleteField(), [flatPath]: deleteField() }).catch(() => { });
            }
        } catch { }
    }, [focusedDate]);

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
        setSelectedMeal(meal?.name ?? null);
        setIsSearchVisible(true);
    }, []);
    const closeSearch = useCallback(() => {
        setIsSearchVisible(false);
        setSelectedMeal(null);
    }, []);
    const onSelectResult = useCallback(async (food) => {
        if (!food) return;
        const uid = global?.userData?.uid || global?.userData?.id;
        const dk = toDayKey(focusedDate);
        const mealKey = String(selectedMeal || 'Snacks');
        const factorRaw = Number(food?.__portionMultiplier ?? 1);
        const factor = Number.isFinite(factorRaw) && factorRaw > 0 ? factorRaw : 1;

        const baseDesc = String(
            food?.food_description ??
            food?.description ??
            food?.desc ??
            ''
        );
        const resolvedName = String(
            food?.food_name ??
            food?.name ??
            food?.foodName ??
            ''
        );
        const resolvedBrand = String(
            food?.brand_name ??
            food?.brand ??
            food?.brandName ??
            ''
        );
        const resolvedFoodId = String(
            food?.food_id ??
            food?.foodId ??
            food?.id ??
            ''
        );

        const coerceMacros = (src = {}) => ({
            calories: Number(src?.calories) || 0,
            protein: Number(src?.protein) || 0,
            carbs: Number(src?.carbs) || 0,
            fat: Number(src?.fat) || 0,
        });

        const perServingMacros =
            (food && typeof food === 'object' && (
                (food.macrosPerServing && typeof food.macrosPerServing === 'object' && food.macrosPerServing) ||
                (food.macrosPS && typeof food.macrosPS === 'object' && food.macrosPS)
            )) || null;

        const macros = perServingMacros
            ? coerceMacros(scaleMacros(perServingMacros, factor))
            : coerceMacros(parseMacrosFromDescription(baseDesc, factor));

        const makeRand = () => Math.random().toString(36).slice(2, 10);
        const newId = `${Date.now().toString(36)}${makeRand()}`;
        const entry = {
            key: newId,
            food_id: resolvedFoodId,
            name: resolvedName,
            brand: resolvedBrand,
            desc: baseDesc,
            macros,
            quantity: factor,
        };
        try {
            global.userData = global.userData || {};
            global.userData.loggedFoods = global.userData.loggedFoods || {};
            global.userData.loggedFoods[dk] = global.userData.loggedFoods[dk] || {};
            global.userData.loggedFoods[dk][newId] = {
                dayKey: dk,
                meal: mealKey,
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
        setMeals((prev) => ({ ...prev, [mealKey]: [...(prev[mealKey] || []), entry] }));
        setTotals((prev) => ({
            calories: Math.round((prev.calories || 0) + (macros.calories || 0)),
            protein: Math.round((prev.protein || 0) + (macros.protein || 0)),
            carbs: Math.round((prev.carbs || 0) + (macros.carbs || 0)),
            fat: Math.round((prev.fat || 0) + (macros.fat || 0)),
        }));
        try {
            if (uid) {
                const uref = doc(db, 'usersPrivate', uid);
                const fieldPath = `loggedFoods.${dk}.${newId}`;
                const flat = {
                    dayKey: dk,
                    meal: mealKey,
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

    const onToggleCalorieOffset = useCallback((enabled) => {
        setApplyWorkoutCalories(enabled);
        const uid = global?.userData?.uid || global?.userData?.id;
        if (uid) {
            try {
                updateDoc(doc(db, 'usersPrivate', uid), {
                    'macroSettings.applyWorkoutCaloriesToGoals': enabled,
                    updatedAt: serverTimestamp(),
                }).catch(() => {});
            } catch { }
        }
        try {
            global.userData = {
                ...(global.userData || {}),
                macroSettings: {
                    ...(global.userData?.macroSettings || {}),
                    applyWorkoutCaloriesToGoals: enabled,
                },
            };
        } catch { }
    }, []);

    const openGoalsSheet = () => { setGoalsSheetIndex(0); setGoalsOpenSignal((s) => (s == null ? 1 : s + 1)); };
    const closeGoalsSheet = () => { setGoalsSheetIndex(-1); };

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
                await updateDoc(doc(db, 'usersPrivate', uid), {
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
            weight: clampInt(goalForm.weight, 0, 2000),
            heightFt: clampInt(goalForm.heightFt, 0, 8),
            heightIn: clampInt(goalForm.heightIn, 0, 11),
            age: clampOptional(goalForm.age, 13, 100),
        };

        try {
            await updateDoc(doc(db, 'usersPrivate', uid), {
                personalInfo: info,
                updatedAt: serverTimestamp(),
            });
            try { global.userData = { ...(global.userData || {}), personalInfo: info }; } catch { }
        } catch (e) {
            console.log('Failed to save personal info:', e?.message || e);
        }
    };

    // Refresh from global when returning to this screen so edits/saves reflect
    useFocusEffect(React.useCallback(() => {
        refreshDayData();
    }, [refreshDayData]));

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
                {/* Header */}
                <View style={{ paddingTop: headerSafeAreaPadding, backgroundColor: COLORS.bg }}>
                    <DateHeader
                        title={formatDate(headerDate)}
                        onPrev={() => slideBy(-1)}
                        onNext={() => slideBy(1)}
                        onTitlePress={jumpToToday}
                        onHistoryPress={openLoggedFoodsHistory}
                        COLORS={COLORS}
                        isToday={isHeaderDateToday}
                    />
                </View>

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
                extraData={`${completedWorkoutsSig}:${applyWorkoutCalories ? '1' : '0'}`}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => String(index)}
                    getItemCount={() => TOTAL_PAGES}
                    getItem={(_data, index) => index}
                    initialScrollIndex={baseIndex}
                    getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
                    onLayout={() => {
                        scrollToIndexSafe(baseIndex, false);
                    }}
                    onScroll={(e) => {
                        try {
                            const x = e?.nativeEvent?.contentOffset?.x || 0;
                            const nextIndex = Math.round(x / (screenWidth || 1));
                            if (nextIndex !== lastHeaderIndexRef.current) {
                                lastHeaderIndexRef.current = nextIndex;
                                const delta = nextIndex - baseIndex;
                                const constrainedDelta = delta > 0 ? clampForwardDelta(delta, focusedDate) : delta;
                                const d = new Date(focusedDate);
                                d.setDate(d.getDate() + constrainedDelta);
                                d.setHours(0, 0, 0, 0);
                                setHeaderDate(clampDateToToday(d));
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
                        if (!Number.isFinite(nextIndex)) return;
                        if (nextIndex === baseIndex) {
                            lastHeaderIndexRef.current = baseIndex;
                            setHeaderDate(clampDateToToday(focusedDate));
                            return;
                        }

                        const delta = nextIndex - baseIndex;
                        const constrainedDelta = delta > 0 ? clampForwardDelta(delta, focusedDate) : delta;
                        const clampedIndex = baseIndex + constrainedDelta;

                        if (clampedIndex !== nextIndex) {
                            scrollToIndexSafe(clampedIndex, true);
                        }

                        if (constrainedDelta !== 0) {
                            setBaseIndex(clampedIndex);
                            shiftDate(constrainedDelta);
                            const d = new Date(focusedDate);
                            d.setDate(d.getDate() + constrainedDelta);
                            d.setHours(0, 0, 0, 0);
                            setHeaderDate(clampDateToToday(d));
                        } else {
                            setHeaderDate(clampDateToToday(focusedDate));
                        }
                        lastHeaderIndexRef.current = clampedIndex;
                    }}
                    renderItem={({ index }) => {
                        const offset = index - baseIndex;
                        const d = new Date(focusedDate);
                        d.setDate(d.getDate() + offset);
                        d.setHours(0, 0, 0, 0);
                        const dayKey = toDayKey(d);
                        const fromGlobal = buildFromGlobal(d);
                        const hasLocalMeals = (meals?.Breakfast?.length || meals?.Lunch?.length || meals?.Dinner?.length || meals?.Snacks?.length);
                        const mealsForPage = offset === 0
                            ? (hasLocalMeals ? meals : fromGlobal.meals)
                            : fromGlobal.meals;
                        const totalsForPage = offset === 0
                            ? ((totals?.calories || totals?.protein || totals?.carbs || totals?.fat) ? totals : fromGlobal.totals)
                            : fromGlobal.totals;
                        const caloriesBurnedForPage = sumWorkoutCaloriesForDay(d);
                        const offsetEnabled = applyWorkoutCalories;
                        const goalsForPage = (offsetEnabled && caloriesBurnedForPage > 0)
                            ? scaleGoalsWithBurn(macroGoals, caloriesBurnedForPage)
                            : macroGoals;
                        return (
                            <MacroDayPage
                                screenWidth={screenWidth}
                                COLORS={COLORS}
                                macroGoals={goalsForPage}
                                meals={mealsForPage}
                                totals={totalsForPage}
                                openGoalsSheet={openGoalsSheet}
                                openSearchForMeal={openSearchForMeal}
                                deleteFood={deleteFood}
                                PlusIcon={PlusIcon}
                                date={d}
                                dayKey={dayKey}
                                isFocused={Math.abs(offset) <= 1}
                                mealsMeta={mealsMeta}
                                caloriesBurned={caloriesBurnedForPage}
                                calorieOffsetEnabled={offsetEnabled}
                                onToggleCalorieOffset={onToggleCalorieOffset}
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
