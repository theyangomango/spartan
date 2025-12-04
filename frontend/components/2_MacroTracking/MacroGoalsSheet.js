// components/2_MacroTracking/MacroGoalsSheet.js
import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    Pressable,
    Animated,
    Easing,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { PersonalInfoContent } from './PersonalInfoSheet'; // reuse content-only component
import LabeledNumber from './LabeledNumber';

import scaleSize from "../../helper/scaleSize";
import { strong as haptic } from '../../utils/haptics';
import theme from '../../theme/mfpDark'
import { setFooterSuppressed } from '../../state/footerSuppressionStore';

const parseMacroNumber = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return numeric;
};

const getMacroCalories = (protein, carbs, fat) => {
    const proteinCalories = Math.round(parseMacroNumber(protein) * 4);
    const carbCalories = Math.round(parseMacroNumber(carbs) * 4);
    const fatCalories = Math.round(parseMacroNumber(fat) * 9);
    return {
        protein: proteinCalories,
        carbs: carbCalories,
        fat: fatCalories,
        total: proteinCalories + carbCalories + fatCalories,
    };
};

export default function MacroGoalsSheet({
    index,
    onChangeIndex,
    openSignal, // bump when parent explicitly wants to open
    goalForm,
    setGoalForm,
    onSave,
    onSavePersonalInfo,
    onCancel,
    COLORS,
}) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
    const sheetRef = useRef(null);
    const footerSuppressionKeyRef = useRef(`macro-goals-sheet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
    const footerSuppressionKey = footerSuppressionKeyRef.current;

    useEffect(() => {
        const key = footerSuppressionKey;
        const shouldSuppress = typeof index === 'number' && index >= 0;
        setFooterSuppressed(key, shouldSuppress);
    }, [footerSuppressionKey, index]);

    useEffect(() => () => {
        setFooterSuppressed(footerSuppressionKey, false);
    }, [footerSuppressionKey]);

    /** Cross-fade between GOALS (0) and PERSONAL-INFO (1) */
    const modeAnim = useRef(new Animated.Value(0)).current;
    const [showInfo, setShowInfo] = useState(false);

    const fadeToInfo = useCallback(() => {
        try { haptic(); } catch { }
        setShowInfo(true);
        // Snap the sheet to the larger snap; BottomSheet will invoke onChange for us.
        sheetRef.current?.snapToIndex?.(1);
        Animated.timing(modeAnim, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start();
    }, [modeAnim]);

    const suppressKeyboardExpandRef = useRef(false);
    const suppressKeyboardTimerRef = useRef(null);

    const fadeToGoals = useCallback(() => {
        suppressKeyboardExpandRef.current = true;
        if (suppressKeyboardTimerRef.current) {
            clearTimeout(suppressKeyboardTimerRef.current);
        }
        suppressKeyboardTimerRef.current = setTimeout(() => {
            suppressKeyboardExpandRef.current = false;
            suppressKeyboardTimerRef.current = null;
        }, 320);
        try { Keyboard.dismiss(); } catch { }
        sheetRef.current?.snapToIndex?.(0);
        onChangeIndex?.(0);
        Animated.timing(modeAnim, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start(({ finished }) => finished && setShowInfo(false));
    }, [modeAnim, onChangeIndex]);

    // Reset to goals mode whenever the sheet closes
    useEffect(() => {
        if (index === -1) {
            setShowInfo(false);
            modeAnim.setValue(0);
            setUsePlaceholderMacros(false);
            setPlaceholderMacros(null);
        }
    }, [index, modeAnim]);

    const goalsOpacity = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    const infoOpacity = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const goalsTranslate = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
    const infoTranslate = modeAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });

    const renderBackdrop = useCallback(
        (props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />,
        []
    );

    // Robust open: when parent bumps openSignal, ensure the sheet snaps open even
    // if it was mid-closing. Try immediately, then on next frame, then after a tick.
    useEffect(() => {
        if (openSignal == null) return;
        if (index < 0) {
            // setTimeout helps if onChange(-1) fires after parent set(0)
            try { sheetRef.current?.snapToIndex?.(0); } catch { }
            requestAnimationFrame(() => { try { sheetRef.current?.snapToIndex?.(0); } catch { } });
            const t = setTimeout(() => { try { sheetRef.current?.snapToIndex?.(0); } catch { } }, 120);
            return () => clearTimeout(t);
        } else {
            // already open — ensure it is at least at index 0
            try { sheetRef.current?.snapToIndex?.(Math.max(0, index)); } catch { }
        }
    }, [openSignal]);

    // ----------------- Recommended macros (placeholders) -----------------
    const [usePlaceholderMacros, setUsePlaceholderMacros] = useState(false);
    const [placeholderMacros, setPlaceholderMacros] = useState(null);

    // Effective placeholders: recommended (if set) else current macro values
    const effectivePlaceholders = useMemo(() => {
        if (usePlaceholderMacros && placeholderMacros) return placeholderMacros;
        return {
            calories: String(goalForm?.calories ?? '0'),
            protein: String(goalForm?.protein ?? '0'),
            carbs: String(goalForm?.carbs ?? '0'),
            fat: String(goalForm?.fat ?? '0'),
        };
    }, [
        usePlaceholderMacros,
        placeholderMacros,
        goalForm?.calories,
        goalForm?.protein,
        goalForm?.carbs,
        goalForm?.fat,
    ]);

    const computeRecommendedMacros = useCallback((form) => {
        const gender = form?.gender ?? 'male';
        const weight = form?.weight ?? '';
        const heightFt = form?.heightFt ?? '';
        const heightIn = form?.heightIn ?? '';
        const ageInput = form?.age ?? '';
        const activity = form?.activity ?? 'moderate';
        const goal = form?.goal ?? 'maintain';

        if (!gender || !weight || !heightFt || heightIn === '' || !activity || !goal) return null;

        const wLb = Number(weight);
        const ft = Number(heightFt);
        const inch = Number(heightIn);
        if ([wLb, ft, inch].some((n) => Number.isNaN(n))) return null;
        if (!Number.isFinite(wLb) || wLb <= 0) return null;

        const totalInches = ft * 12 + inch;
        if (!Number.isFinite(totalInches) || totalInches <= 0) return null;

        const weightKg = wLb * 0.45359237;
        const heightCm = totalInches * 2.54;
        const rawAge = Number(ageInput);
        const age = Number.isFinite(rawAge) && rawAge > 0 ? rawAge : 25;

        const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161); // Mifflin-St Jeor

        const activityMultiplierMap = { sedentary: 1.2, light: 1.32, moderate: 1.46, active: 1.6, athlete: 1.75 };
        const activityMultiplier = activityMultiplierMap[activity] ?? 1.55;
        // Slight uplift so activity isn't overly suppressed after the multiplier tweaks
        const tdee = bmr * activityMultiplier * 1.04;

        const roundTo5 = (value) => {
            if (!Number.isFinite(value)) return 0;
            return Math.max(0, Math.round(value / 5) * 5);
        };
        const roundCalories = (value) => {
            if (!Number.isFinite(value)) return 0;
            return Math.max(0, Math.round(value / 10) * 10);
        };

        // Evidence-based guardrails (ISSN / ACSM ranges): higher protein for deficit, moderate for gain/maintain
        const goalPresets = {
        gain: { percentDelta: 0.06, minDelta: 150, maxDelta: 400, proteinPerKg: 2.3, fatPerKg: 1.2 },
        maintain: { percentDelta: 0, minDelta: -180, maxDelta: 120, proteinPerKg: 2.4, fatPerKg: 1.1 },
        lose: { percentDelta: -0.22, minDelta: -750, maxDelta: -350, proteinPerKg: 2.6, fatPerKg: 1.0 },
        };
        const preset = goalPresets[goal] ?? goalPresets.maintain;

        const desiredDelta = tdee * preset.percentDelta;
        const clampedDelta = Math.min(preset.maxDelta, Math.max(preset.minDelta, desiredDelta));

        const calorieFloorFromWeight = (gender === 'male' ? 22 : 20) * weightKg; // ~22-20 kcal/kg floor
        const absoluteFloor = gender === 'male' ? 1200 : 1100;
        const calorieFloor = Math.max(calorieFloorFromWeight, absoluteFloor, bmr * 1.05); // keep close to BMR
        const targetCalories = roundCalories(Math.max(tdee + clampedDelta, calorieFloor));

        const proteinG = Math.max(preset.proteinPerKg * weightKg, 2.2 * weightKg);
        const fatFromWeight = preset.fatPerKg * weightKg;
        const minFatFromCalories = (0.32 * targetCalories) / 9;
        const maxFatFromCalories = (0.42 * targetCalories) / 9;
        const fatG = Math.min(Math.max(fatFromWeight, minFatFromCalories), maxFatFromCalories);

        const carbCalories = Math.max(targetCalories - (proteinG * 4) - (fatG * 9), 0);
        const carbsG = carbCalories / 4;

        let roundedProtein = roundTo5(proteinG);
        let roundedFat = roundTo5(fatG);
        let roundedCarbs = roundTo5(carbsG);

        const caloriesFromMacros = () => (roundedProtein * 4) + (roundedFat * 9) + (roundedCarbs * 4);

        const alignCalories = () => {
            const tolerance = 25; // allow small variance due to rounding
            let total = caloriesFromMacros();
            let iterations = 0;

            if (total < calorieFloor) {
                const needed = calorieFloor - total;
                const carbSteps = Math.ceil(needed / 20) * 5; // 5g carbs ≈ 20 kcal
                roundedCarbs += carbSteps;
                total = caloriesFromMacros();
            }

            while (total < targetCalories - tolerance && iterations < 16) {
                roundedCarbs += 5;
                total = caloriesFromMacros();
                iterations += 1;
            }
            while (total > targetCalories + tolerance && roundedCarbs >= 5 && iterations < 32) {
                roundedCarbs -= 5;
                total = caloriesFromMacros();
                iterations += 1;
            }

            return roundCalories(total);
        };

        const finalCalories = alignCalories();

        return {
            calories: String(finalCalories),
            protein: String(roundedProtein),
            carbs: String(roundedCarbs),
            fat: String(roundedFat),
        };
    }, []);

    // ----------------- AUTO CALC (existing) with placeholder mode -----------------
    const manualRef = useRef({ calories: false, protein: false, carbs: false, fat: false });
    const sanitizeDecimalInput = (s) => {
        if (!s) return '';
        const filtered = s.replace(/[^0-9.]/g, '');
        if (!filtered) return '';
        const firstDot = filtered.indexOf('.');
        if (firstDot === -1) {
            return filtered.replace(/^0+(\d)/, '$1');
        }
        const beforeDot = filtered.slice(0, firstDot).replace(/^0+(\d)/, '$1');
        const afterDot = filtered.slice(firstDot + 1).replace(/\./g, '');
        return `${beforeDot || '0'}.${afterDot}`;
    };
    const markManual = (k) => { manualRef.current[k] = true; setUsePlaceholderMacros(false); };
    const trimTrailingZeros = (value) => value.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '').replace(/^0+(?=\d)/u, '');
    const formatMacroValue = (value) => {
        if (!Number.isFinite(value) || value < 0) return '0';
        if (value === 0) return '0';
        const str = value.toFixed(6);
        const trimmed = trimTrailingZeros(str);
        return trimmed.length ? trimmed : '0';
    };
    const roundDisplayMacro = (value) => {
        if (value == null) return '';
        if (typeof value === 'string' && value.trim() === '') return '';
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '';
        return String(Math.max(0, Math.round(numeric)));
    };
    const caloriesFromMacros = (protein, carbs, fat) => {
        return String(getMacroCalories(protein, carbs, fat).total);
    };
    const handleMacroChange = (macroKey) => (text) => {
        const cleaned = sanitizeDecimalInput(text);
        markManual(macroKey);
        manualRef.current.calories = true;
        setGoalForm((prev) => {
            const next = { ...prev, [macroKey]: cleaned };
            return { ...next, calories: caloriesFromMacros(next.protein, next.carbs, next.fat) };
        });
    };
    const macroCalories = useMemo(
        () => getMacroCalories(goalForm?.protein, goalForm?.carbs, goalForm?.fat),
        [goalForm?.protein, goalForm?.carbs, goalForm?.fat]
    );

    const gender = goalForm?.gender ?? 'male';
    const weight = goalForm?.weight ?? '';
    const heightFt = goalForm?.heightFt ?? '';
    const heightIn = goalForm?.heightIn ?? '';
    const age = goalForm?.age ?? '';
    const activity = goalForm?.activity ?? 'moderate';
    const goal = goalForm?.goal ?? 'maintain';

    useEffect(() => {
        manualRef.current = { calories: false, protein: false, carbs: false, fat: false };
        if (usePlaceholderMacros) {
            const rec = computeRecommendedMacros(goalForm);
            if (rec) setPlaceholderMacros(rec);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gender, weight, heightFt, heightIn, age, activity, goal]);

    useEffect(() => {
        const rec = computeRecommendedMacros(goalForm);
        if (!rec) return;

        if (usePlaceholderMacros) {
            setPlaceholderMacros(rec);
            return; // don't write into values while showing placeholders
        }

        // original behavior: write into values unless manually edited
        const next = {
            calories: manualRef.current.calories ? goalForm.calories : rec.calories,
            protein: manualRef.current.protein ? goalForm.protein : rec.protein,
            carbs: manualRef.current.carbs ? goalForm.carbs : rec.carbs,
            fat: manualRef.current.fat ? goalForm.fat : rec.fat,
        };
        if (next.calories !== goalForm.calories || next.protein !== goalForm.protein || next.carbs !== goalForm.carbs || next.fat !== goalForm.fat) {
            setGoalForm((s) => ({ ...s, ...next }));
        }
    }, [
        usePlaceholderMacros,
        computeRecommendedMacros,
        goalForm.calories, goalForm.protein, goalForm.carbs, goalForm.fat,
        gender, weight, heightFt, heightIn, age, activity, goal, setGoalForm,
    ]);

    // ---------------------------------------------------

    const closeSheet = useCallback(() => {
        onChangeIndex?.(-1);
        onCancel?.();
        sheetRef.current?.close?.();
    }, [onCancel, onChangeIndex]);

    const saveSheet = useCallback(() => {
        try { haptic(); } catch { }
        onSave?.();
        onChangeIndex?.(-1);
        sheetRef.current?.close?.();
    }, [onSave, onChangeIndex]);

    // CTA press animation (unchanged)
    const ctaScale = useRef(new Animated.Value(1)).current;
    const chevron = useRef(new Animated.Value(0)).current;
    const onCtaPressIn = () => Animated.spring(ctaScale, { toValue: 0.97, useNativeDriver: true, friction: 5, tension: 120 }).start();
    const onCtaPressOut = () => Animated.spring(ctaScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 120 }).start();
    const chevronTranslate = chevron.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
    const pulseChevron = () => { chevron.setValue(0); Animated.timing(chevron, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); };
    const handleCtaPress = () => { pulseChevron(); fadeToInfo(); };

    // Expand to max when keyboard opens; restore when it closes (GOALS mode only)
    const preKeyboardIndexRef = useRef(null);
    const expandedForKeyboardRef = useRef(false);
    useEffect(() => () => {
        if (suppressKeyboardTimerRef.current) {
            clearTimeout(suppressKeyboardTimerRef.current);
            suppressKeyboardTimerRef.current = null;
        }
    }, []);
    useEffect(() => {
        if (index < 0) return; // only when sheet is open

        const onKbShow = () => {
            // only apply on Goals mode, not Personal Info
            if (showInfo) return;
            if (suppressKeyboardExpandRef.current) return;
            if (expandedForKeyboardRef.current) return;
            const current = typeof index === 'number' ? index : 0;
            // store where we were before expanding
            preKeyboardIndexRef.current = current;
            if (current !== 1) {
                expandedForKeyboardRef.current = true;
                try { sheetRef.current?.expand?.(); } catch { try { sheetRef.current?.snapToIndex?.(1); } catch { } }
            }
        };

        const onKbHide = () => {
            if (!expandedForKeyboardRef.current) return;
            const target = preKeyboardIndexRef.current;
            expandedForKeyboardRef.current = false;
            preKeyboardIndexRef.current = null;
            if (typeof target === 'number' && index >= 0 && target !== index) {
                try { sheetRef.current?.snapToIndex?.(target); } catch { }
            }
        };

        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const subShow = Keyboard.addListener(showEvent, onKbShow);
        const subHide = Keyboard.addListener(hideEvent, onKbHide);

        return () => {
            subShow?.remove?.();
            subHide?.remove?.();
        };
    }, [index, showInfo]);

    return (
        <BottomSheet
            ref={sheetRef}
            index={index}
            snapPoints={['70%', '93%']}
            enablePanDownToClose
            onChange={onChangeIndex}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
            handleStyle={styles.sheetHandleContainer}
            backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
        >
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={{ flex: 1 }}>
                    {/* ================= GOALS MODE ================= */}
                    <Animated.View
                        style={[styles.modeWrap, { opacity: goalsOpacity, transform: [{ translateY: goalsTranslate }] }]}
                        pointerEvents={showInfo ? 'none' : 'auto'}
                    >
                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.headerRow}>
                                <Text style={styles.sheetTitle}>Adjust Macro Goals</Text>
                            </View>

                            <Text style={styles.sheetDescription}>
                                Set your daily protein, carb, and fat targets in grams. Total calories below always reflect the macros you enter.
                            </Text>

                            <View style={[styles.row, styles.macroInputsRow]}> 
                                <View style={styles.macroColumn}>
                                    <LabeledNumber
                                        label="Protein"
                                        value={roundDisplayMacro(goalForm.protein)}
                                        onChangeText={handleMacroChange('protein')}
                                        suffix="g"
                                        styles={styles}
                                        placeholder={effectivePlaceholders.protein}
                                        placeholderTextColor={styles.placeholder.color}
                                        selectionColor={styles.accent.color}
                                        keyboardType="decimal-pad"
                                        inputBoxStyle={styles.editableInputBox}
                                    />
                                    <Text style={styles.macroCaloriesText}>{macroCalories.protein} kcal</Text>
                                </View>

                                <View style={{ width: scaleSize(16) }} />
                                <View style={styles.macroColumn}>
                                    <LabeledNumber
                                        label="Carbs"
                                        value={roundDisplayMacro(goalForm.carbs)}
                                        onChangeText={handleMacroChange('carbs')}
                                        suffix="g"
                                        styles={styles}
                                        placeholder={effectivePlaceholders.carbs}
                                        placeholderTextColor={styles.placeholder.color}
                                        selectionColor={styles.accent.color}
                                        keyboardType="decimal-pad"
                                        inputBoxStyle={styles.editableInputBox}
                                    />
                                    <Text style={styles.macroCaloriesText}>{macroCalories.carbs} kcal</Text>
                                </View>
                                <View style={{ width: scaleSize(16) }} />

                                <View style={styles.macroColumn}>
                                    <LabeledNumber
                                        label="Fat"
                                        value={roundDisplayMacro(goalForm.fat)}
                                        onChangeText={handleMacroChange('fat')}
                                        suffix="g"
                                        styles={styles}
                                        placeholder={effectivePlaceholders.fat}
                                        placeholderTextColor={styles.placeholder.color}
                                        selectionColor={styles.accent.color}
                                        keyboardType="decimal-pad"
                                        inputBoxStyle={styles.editableInputBox}
                                    />
                                    <Text style={styles.macroCaloriesText}>{macroCalories.fat} kcal</Text>
                                </View>
                            </View>

                            <View style={styles.totalCaloriesRow}>
                                <Text style={styles.totalCaloriesInline}>Total Calories:</Text>
                                <Text style={styles.totalCaloriesValue}>{macroCalories.total}</Text>
                                <Text style={styles.totalCaloriesUnit}>kcal</Text>
                            </View>

                            {/* Inline “Calculate using Personal Info” row */}
                            <Pressable onPress={handleCtaPress} onPressIn={onCtaPressIn} onPressOut={onCtaPressOut} hitSlop={8}>
                                <Animated.View style={[styles.autoCalcRow, { transform: [{ scale: ctaScale }] }]}>
                                    <View style={styles.autoCalcLeft}>
                                        <View style={styles.autoCalcIconWrap}>
                                            <Ionicons name="sparkles-outline" size={16} color={styles.accent.color} />
                                        </View>
                                        <Text style={styles.autoCalcText}>Calculate using Personal Info</Text>
                                    </View>
                                    <Animated.View style={{ transform: [{ translateX: chevronTranslate }] }}>
                                        <Ionicons name="chevron-forward" size={18} color={styles.accent.color} />
                                    </Animated.View>
                                </Animated.View>
                            </Pressable>

                            {/* Footer */}
                            <View style={styles.sheetButtons}>
                                <Pressable style={[styles.btn, styles.btnGhost]} onPress={closeSheet}>
                                    <Text style={[styles.btnText, styles.btnGhostText]}>Cancel</Text>
                                </Pressable>
                                <Pressable style={[styles.btn, styles.btnPrimary]} onPress={saveSheet}>
                                    <Text style={[styles.btnText, styles.btnPrimaryText]}>Save</Text>
                                </Pressable>
                            </View>

                            <View style={{ height: scaleSize(110) }} />
                        </ScrollView>
                    </Animated.View>

                    {/* ================= PERSONAL INFO MODE (reused) ================= */}
                    <Animated.View
                        style={[styles.modeWrap, { opacity: infoOpacity, transform: [{ translateY: infoTranslate }] }]}
                        pointerEvents={showInfo ? 'auto' : 'none'}
                    >
                        <PersonalInfoContent
                            goalForm={goalForm}
                            setGoalForm={setGoalForm}
                            COLORS={COLORS}
                            onBack={fadeToGoals}
                            onSave={() => {
                                // Persist personal info, compute recommendations, apply directly to inputs, then return
                                try { onSavePersonalInfo?.(); } catch { }
                                const rec = computeRecommendedMacros(goalForm);
                                if (rec) {
                                    // Apply recommended values into the Edit Goals inputs
                                    setGoalForm((s) => ({
                                        ...s,
                                        calories: rec.calories,
                                        protein: rec.protein,
                                        carbs: rec.carbs,
                                        fat: rec.fat,
                                    }));
                                    // Ensure we are not in placeholder mode
                                    setUsePlaceholderMacros(false);
                                    setPlaceholderMacros(null);
                                }
                                fadeToGoals();
                            }}
                        />
                    </Animated.View>
                </View>

            </KeyboardAvoidingView>
        </BottomSheet>
    );
}

const makeStyles = (COLORS) => {
    // Slightly lift contrasts so inputs/buttons stand out better on dark
    const text = COLORS?.text ?? COLORS?.textPrimary ?? '#E5E7EB';
    const subtext = COLORS?.subtext ?? COLORS?.textSecondary ?? '#A1A7B3';
    const card = COLORS?.card ?? '#252733';
    // Brighter hairline for clearer edges in dark mode
    // Use a locally tuned hairline/field shade for stronger separation in sheets
    const hairline = 'rgba(255,255,255,0.14)';
    const accent = COLORS?.accentBlue ?? '#6FB8FF';
    const streakColor = COLORS?.streak ?? '#FF6C1A';
    // Lift field background slightly from the sheet background
    const fieldBg = '#2B2F3A';

    return StyleSheet.create({
        sheetBackground: { backgroundColor: theme.bg, borderTopLeftRadius: scaleSize(24), borderTopRightRadius: scaleSize(24), borderWidth: StyleSheet.hairlineWidth, borderColor: hairline },
        sheetHandleContainer: { paddingVertical: scaleSize(14), alignItems: 'center' },
        sheetHandle: { backgroundColor: 'rgba(255,255,255,0.9)', width: scaleSize(44), height: scaleSize(4), borderRadius: scaleSize(2) },

        modeWrap: { ...StyleSheet.absoluteFillObject },

        scrollContent: { paddingHorizontal: scaleSize(18), paddingTop: scaleSize(18), paddingBottom: scaleSize(32) },

        headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleSize(12) },
        sheetTitle: { fontSize: scaleSize(18), fontFamily: 'Outfit_700Bold', color: text },
        sheetDescription: { fontSize: scaleSize(12.5), fontFamily: 'Outfit_400Regular', color: subtext, lineHeight: scaleSize(18) },

        smallLinkPill: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: scaleSize(12),
            paddingVertical: scaleSize(7),
            borderRadius: scaleSize(999),
            backgroundColor: theme.surface,
            borderWidth: scaleSize(1),
            borderColor: hairline,
        },
        smallLinkText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(12.5), color: text },

        row: { flexDirection: 'row', alignItems: 'flex-start' },
        macroInputsRow: { marginTop: scaleSize(18), paddingVertical: scaleSize(6) },
        totalCaloriesRow: { flexDirection: 'row', alignItems: 'baseline', gap: scaleSize(6), marginTop: scaleSize(22) },
        totalCaloriesInline: { fontSize: scaleSize(15), fontFamily: 'Outfit_500Medium', color: subtext },

        inputLabel: { fontSize: scaleSize(13), color: subtext, marginBottom: scaleSize(6), fontFamily: 'Outfit_400Regular' },
        inputBox: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderRadius: scaleSize(14),
            borderWidth: scaleSize(1),
            borderColor: hairline,
            paddingHorizontal: scaleSize(12),
            paddingVertical: scaleSize(12),
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: scaleSize(1) },
            shadowRadius: scaleSize(4),
        },
        editableInputBox: {
            borderColor: accent,
            backgroundColor: 'rgba(111,184,255,0.08)',
            borderWidth: scaleSize(1.2),
        },
        input: { flex: 1, fontSize: scaleSize(16), fontFamily: 'Outfit_400Regular', color: text, paddingVertical: 0 },
        totalCaloriesValue: { fontSize: scaleSize(18), fontFamily: 'Outfit_600SemiBold', color: streakColor },
        totalCaloriesUnit: { fontSize: scaleSize(15), fontFamily: 'Outfit_400Regular', color: streakColor },
        // Make placeholder slightly brighter for readability
        placeholder: { color: '#BAC3D2' },
        accent: { color: accent },
        inputSuffix: { marginLeft: scaleSize(8), color: subtext, fontFamily: 'Outfit_400Regular', fontSize: scaleSize(13) },
        macroColumn: { flex: 1, paddingVertical: scaleSize(4) },
        macroCaloriesText: { marginTop: scaleSize(8), fontSize: scaleSize(12), color: subtext, fontFamily: 'Outfit_500Medium' },

        autoCalcRow: {
            marginTop: scaleSize(24),
            paddingHorizontal: scaleSize(14),
            paddingVertical: scaleSize(18),
            borderRadius: scaleSize(14),
            backgroundColor: theme.surface,
            borderWidth: scaleSize(1),
            borderColor: hairline,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        autoCalcLeft: { flexDirection: 'row', alignItems: 'center' },
        autoCalcIconWrap: {
            width: scaleSize(28),
            height: scaleSize(28),
            borderRadius: scaleSize(14),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.surface,
            borderWidth: scaleSize(1),
            borderColor: hairline,
            marginRight: scaleSize(10),
        },
        autoCalcText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(13), color: text },

        sheetButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: scaleSize(10), marginTop: scaleSize(28) },
        btn: { paddingVertical: scaleSize(12), paddingHorizontal: scaleSize(16), borderRadius: scaleSize(12) },
        // Give ghost button a clearer outline against the sheet
        btnGhost: { backgroundColor: theme.surface, borderWidth: scaleSize(1), borderColor: hairline },
        btnPrimary: { backgroundColor: accent },
        btnText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(15) },
        btnGhostText: { color: text },
        btnPrimaryText: { color: '#fff' },

        infoHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scaleSize(10) },
        backPill: { paddingHorizontal: scaleSize(10), paddingVertical: scaleSize(6), borderRadius: scaleSize(999), backgroundColor: fieldBg, borderWidth: scaleSize(1), borderColor: hairline },
        backPillText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(12.5), color: text },

        toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scaleSize(8), marginBottom: scaleSize(8) },
        // Slightly clearer toggle outlines
        toggleButton: { paddingVertical: scaleSize(8), paddingHorizontal: scaleSize(14), borderRadius: scaleSize(999), borderWidth: scaleSize(1), borderColor: hairline, backgroundColor: card },
        toggleButtonActive: { backgroundColor: accent, borderColor: 'transparent' },
        toggleButtonText: { fontFamily: 'Outfit_500Medium', fontSize: scaleSize(14), color: text },
        toggleButtonTextActive: { color: '#fff' },

        inlineHint: { marginTop: scaleSize(14), fontFamily: 'Outfit_400Regular', fontSize: scaleSize(12.5), color: subtext },
    });
};
