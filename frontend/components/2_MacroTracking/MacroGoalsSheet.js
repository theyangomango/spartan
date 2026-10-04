// components/2_MacroTracking/MacroGoalsSheet.js
import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
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
import makeStyles from './MacroGoalsSheet.styles';
import { getMacroCalories, sanitizeDecimalInput, roundDisplayMacro, caloriesFromMacros } from './macroGoalsUtils';

import scaleSize from "../../helper/scaleSize";
import { strong as haptic } from '../../utils/haptics';
import { setFooterSuppressed } from '../../state/footerSuppressionStore';
import { computeRecommendedMacrosFromPersonalInfo } from '../../utils/macroRecommendations';

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

    // Effective placeholders: current macro values
    const effectivePlaceholders = useMemo(() => {
        return {
            calories: String(goalForm?.calories ?? '0'),
            protein: String(goalForm?.protein ?? '0'),
            carbs: String(goalForm?.carbs ?? '0'),
            fat: String(goalForm?.fat ?? '0'),
        };
    }, [
        goalForm?.calories,
        goalForm?.protein,
        goalForm?.carbs,
        goalForm?.fat,
    ]);

    const computeRecommendedMacros = useCallback(
        (form) => computeRecommendedMacrosFromPersonalInfo(form),
        []
    );

    // ----------------- AUTO CALC -----------------
    const manualRef = useRef({ calories: false, protein: false, carbs: false, fat: false });
    const markManual = (k) => { manualRef.current[k] = true; };
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gender, weight, heightFt, heightIn, age, activity, goal]);

    useEffect(() => {
        const rec = computeRecommendedMacros(goalForm);
        if (!rec) return;

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
        computeRecommendedMacros,
        goalForm.calories, goalForm.protein, goalForm.carbs, goalForm.fat,
        gender, weight, heightFt, heightIn, age, activity, goal, setGoalForm,
    ]);

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

    // CTA press animation
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
            backdropComponent={renderBackdrop}
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
