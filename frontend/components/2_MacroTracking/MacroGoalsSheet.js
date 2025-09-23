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

    const fadeToGoals = useCallback(() => {
        // Snap back to smaller snap; BottomSheet will invoke onChange for us.
        sheetRef.current?.snapToIndex?.(0);
        Animated.timing(modeAnim, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
        }).start(({ finished }) => finished && setShowInfo(false));
    }, [modeAnim]);

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
        const activity = form?.activity ?? 'moderate';
        const goal = form?.goal ?? 'maintain';

        if (!gender || !weight || !heightFt || heightIn === '' || !activity || !goal) return null;

        const wLb = Number(weight);
        const ft = Number(heightFt);
        const inch = Number(heightIn);
        if ([wLb, ft, inch].some((n) => Number.isNaN(n))) return null;

        const weightKg = wLb * 0.45359237;
        const heightCm = (ft * 12 + inch) * 2.54;
        const age = 18;

        const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
        const bmr = Math.round(base + (gender === 'male' ? 5 : -161));

        const activityMultiplierMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 };
        const activityMultiplier = activityMultiplierMap[activity] ?? 1.55;
        const tdee = bmr * activityMultiplier;

        const presets = {
            gain: { calAdj: 0.12, proteinPerLb: 1.10, fatPct: 0.22, fatMinPerLb: 0.30, carbMinPerLb: 1.10 },
            maintain: { calAdj: 0.00, proteinPerLb: 0.85, fatPct: 0.30, fatMinPerLb: 0.28, carbMinPerLb: 0.80 },
            lose: { calAdj: -0.18, proteinPerLb: 1.00, fatPct: 0.30, fatMinPerLb: 0.28, carbMinPerLb: 0.50 },
        };
        const P = presets[goal] ?? presets.maintain;

        const targetCals = Math.round(tdee * (1 + P.calAdj));
        const proteinG = Math.round(Math.max(0, wLb * P.proteinPerLb));
        const calFromProtein = proteinG * 4;

        const fatFromPctG = (targetCals * P.fatPct) / 9;
        const fatFromFloorG = wLb * P.fatMinPerLb;
        const fatG = Math.round(Math.max(fatFromPctG, fatFromFloorG));
        const calFromFat = fatG * 9;

        const remainingCalories = Math.max(0, targetCals - calFromProtein - calFromFat);
        const carbsFromRemainderG = remainingCalories / 4;
        const carbsFloorG = wLb * P.carbMinPerLb;
        let carbsG = Math.round(Math.max(carbsFromRemainderG, carbsFloorG));

        let adjProteinG = proteinG;
        let adjFatG = fatG;
        let adjCarbG = carbsG;

        let totalCals = adjProteinG * 4 + adjFatG * 9 + adjCarbG * 4;
        if (totalCals > targetCals) {
            let over = totalCals - targetCals;
            const fatFloorG = Math.round(fatFromFloorG);
            const maxTrimFat = Math.max(0, adjFatG - fatFloorG);
            const trimFatG = Math.min(maxTrimFat, Math.ceil(over / 9));
            if (trimFatG > 0) { adjFatG -= trimFatG; over -= trimFatG * 9; }
            if (over > 0) {
                const carbFloor = Math.round(carbsFloorG);
                const maxTrimCarb = Math.max(0, adjCarbG - carbFloor);
                const trimCarbG = Math.min(maxTrimCarb, Math.ceil(over / 4));
                if (trimCarbG > 0) { adjCarbG -= trimCarbG; over -= trimCarbG * 4; }
            }
        }

        return {
            calories: String(targetCals),
            protein: String(adjProteinG),
            carbs: String(adjCarbG),
            fat: String(adjFatG),
        };
    }, []);

    // ----------------- AUTO CALC (existing) with placeholder mode -----------------
    const manualRef = useRef({ calories: false, protein: false, carbs: false, fat: false });
    const onlyDigits = (s) => s.replace(/[^\d]/g, '');
    const markManual = (k) => { manualRef.current[k] = true; setUsePlaceholderMacros(false); };

    const gender = goalForm?.gender ?? 'male';
    const weight = goalForm?.weight ?? '';
    const heightFt = goalForm?.heightFt ?? '';
    const heightIn = goalForm?.heightIn ?? '';
    const activity = goalForm?.activity ?? 'moderate';
    const goal = goalForm?.goal ?? 'maintain';

    useEffect(() => {
        manualRef.current = { calories: false, protein: false, carbs: false, fat: false };
        if (usePlaceholderMacros) {
            const rec = computeRecommendedMacros(goalForm);
            if (rec) setPlaceholderMacros(rec);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gender, weight, heightFt, heightIn, activity, goal]);

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
        gender, weight, heightFt, heightIn, activity, goal, setGoalForm,
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
    useEffect(() => {
        if (index < 0) return; // only when sheet is open

        const onKbShow = () => {
            // only apply on Goals mode, not Personal Info
            if (showInfo) return;
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
            snapPoints={['60%', '95%']}
            enablePanDownToClose
            onChange={onChangeIndex}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
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
                                <Text style={styles.sheetTitle}>Adjust Macro goals</Text>
                            </View>

                            <View style={styles.row}>
                                <LabeledNumber
                                    label="Calories"
                                    value={goalForm.calories}
                                    onChangeText={(t) => { markManual('calories'); setGoalForm((s) => ({ ...s, calories: onlyDigits(t) })); }}
                                    suffix="kcal"
                                    styles={styles}
                                    placeholder={effectivePlaceholders.calories}
                                    placeholderTextColor={styles.placeholder.color}
                                    selectionColor={styles.accent.color}
                                />
                            </View>

                            <View style={[styles.row, { marginTop: scaleSize(10) }]}>
                                <LabeledNumber
                                    label="Protein"
                                    value={goalForm.protein}
                                    onChangeText={(t) => { markManual('protein'); setGoalForm((s) => ({ ...s, protein: onlyDigits(t) })); }}
                                    suffix="g"
                                    styles={styles}
                                    placeholder={effectivePlaceholders.protein}
                                    placeholderTextColor={styles.placeholder.color}
                                    selectionColor={styles.accent.color}
                                />

                                <View style={{ width: scaleSize(12) }} />
                                <LabeledNumber
                                    label="Carbs"
                                    value={goalForm.carbs}
                                    onChangeText={(t) => { markManual('carbs'); setGoalForm((s) => ({ ...s, carbs: onlyDigits(t) })); }}
                                    suffix="g"
                                    styles={styles}
                                    placeholder={effectivePlaceholders.carbs}
                                    placeholderTextColor={styles.placeholder.color}
                                    selectionColor={styles.accent.color}
                                />
                                <View style={{ width: scaleSize(12) }} />

                                <LabeledNumber
                                    label="Fat"
                                    value={goalForm.fat}
                                    onChangeText={(t) => { markManual('fat'); setGoalForm((s) => ({ ...s, fat: onlyDigits(t) })); }}
                                    suffix="g"
                                    styles={styles}
                                    placeholder={effectivePlaceholders.fat}
                                    placeholderTextColor={styles.placeholder.color}
                                    selectionColor={styles.accent.color}
                                />
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

                {/* Footer only in GOALS mode (unchanged) */}
                {!showInfo && (
                    <View style={[styles.sheetButtons, { paddingHorizontal: scaleSize(18) }]}>
                        <Pressable style={[styles.btn, styles.btnGhost]} onPress={closeSheet}>
                            <Text style={[styles.btnText, styles.btnGhostText]}>Cancel</Text>
                        </Pressable>
                        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={saveSheet}>
                            <Text style={[styles.btnText, styles.btnPrimaryText]}>Save</Text>
                        </Pressable>
                    </View>
                )}
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
    // Lift field background slightly from the sheet background
    const fieldBg = '#2B2F3A';

    return StyleSheet.create({
        sheetBackground: { backgroundColor: card, borderTopLeftRadius: scaleSize(24), borderTopRightRadius: scaleSize(24), borderWidth: StyleSheet.hairlineWidth, borderColor: hairline },
        sheetHandle: { backgroundColor: '#3A3D45', width: scaleSize(44), height: scaleSize(4), borderRadius: scaleSize(2) },

        modeWrap: { ...StyleSheet.absoluteFillObject },

        scrollContent: { paddingHorizontal: scaleSize(18), paddingTop: scaleSize(10), paddingBottom: scaleSize(18) },

        headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleSize(8) },
        sheetTitle: { fontSize: scaleSize(18), fontFamily: 'Outfit_700Bold', color: text },

        smallLinkPill: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: scaleSize(12),
            paddingVertical: scaleSize(7),
            borderRadius: scaleSize(999),
            backgroundColor: fieldBg,
            borderWidth: scaleSize(1),
            borderColor: hairline,
        },
        smallLinkText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(12.5), color: text },

        row: { flexDirection: 'row', alignItems: 'flex-start', marginTop: scaleSize(12) },

        inputLabel: { fontSize: scaleSize(13), color: subtext, marginBottom: scaleSize(6), fontFamily: 'Outfit_400Regular' },
        inputBox: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: fieldBg,
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
        input: { flex: 1, fontSize: scaleSize(16), fontFamily: 'Outfit_400Regular', color: text, paddingVertical: 0 },
        // Make placeholder slightly brighter for readability
        placeholder: { color: '#BAC3D2' },
        accent: { color: accent },
        inputSuffix: { marginLeft: scaleSize(8), color: subtext, fontFamily: 'Outfit_400Regular', fontSize: scaleSize(13) },

        autoCalcRow: {
            marginTop: scaleSize(16),
            paddingHorizontal: scaleSize(14),
            paddingVertical: scaleSize(16),
            borderRadius: scaleSize(14),
            backgroundColor: fieldBg,
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
            backgroundColor: fieldBg,
            borderWidth: scaleSize(1),
            borderColor: hairline,
            marginRight: scaleSize(10),
        },
        autoCalcText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(13), color: text },

        sheetButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: scaleSize(10), marginTop: scaleSize(18) },
        btn: { paddingVertical: scaleSize(12), paddingHorizontal: scaleSize(16), borderRadius: scaleSize(12) },
        // Give ghost button a clearer outline against the sheet
        btnGhost: { backgroundColor: fieldBg, borderWidth: scaleSize(1), borderColor: hairline },
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
