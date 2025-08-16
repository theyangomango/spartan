// components/MacroGoalsSheet.js
import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';

// ⬇️ subcomponent moved here
import LabeledNumber from './LabeledNumber';

export default function MacroGoalsSheet({
    index,
    onChangeIndex,
    goalForm,
    setGoalForm,
    onSave,
    onCancel,
    COLORS,
}) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
    const sheetRef = useRef(null);
    const scrollViewRef = useRef(null);

    // Track which macro fields the user edits manually so auto-calc won't overwrite them
    const manualRef = useRef({
        calories: false,
        protein: false,
        carbs: false,
        fat: false,
    });

    const markManual = (field) => {
        if (!manualRef.current[field]) {
            manualRef.current[field] = true;
        }
    };

    const onlyDigits = (s) => s.replace(/[^\d]/g, '');

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                pressBehavior="close"
            />
        ),
        []
    );

    // Safe defaults so nothing crashes
    const gender = goalForm?.gender ?? 'male';
    const weight = goalForm?.weight ?? '';
    const heightFt = goalForm?.heightFt ?? '';
    const heightIn = goalForm?.heightIn ?? '';
    const activity = goalForm?.activity ?? 'moderate';
    const goal = goalForm?.goal ?? 'maintain';

    // If the user changes any *driver* inputs, allow auto-calc to update macros again
    useEffect(() => {
        manualRef.current = { calories: false, protein: false, carbs: false, fat: false };
    }, [gender, weight, heightFt, heightIn, activity, goal]);

    // ---------- AUTO CALC MACROS (goal-specific, JS-safe, respects manual overrides) ----------
    useEffect(() => {
        if (!gender || !weight || !heightFt || heightIn === '' || !activity || !goal) return;

        const wLb = Number(weight);
        const ft = Number(heightFt);
        const inch = Number(heightIn);
        if ([wLb, ft, inch].some((n) => Number.isNaN(n))) return;

        // 1) BMR → TDEE (Mifflin–St Jeor)
        const weightKg = wLb * 0.45359237;
        const heightCm = (ft * 12 + inch) * 2.54;
        const age = 18; // wire an age field later if needed

        const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
        const bmr = Math.round(base + (gender === 'male' ? 5 : -161));

        const activityMultiplierMap = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            athlete: 1.9,
        };
        const activityMultiplier = activityMultiplierMap[activity] ?? 1.55;
        const tdee = bmr * activityMultiplier;

        // 2) Goal-specific macro strategy
        const presets = {
            gain: {
                calAdj: 0.12,        // ~12% surplus
                proteinPerLb: 1.10,  // **Higher protein focus** for gain
                fatPct: 0.22,        // lower fat% to free up carbs
                fatMinPerLb: 0.30,   // safety floor
                carbMinPerLb: 1.10,  // more carbs for training
            },
            maintain: {
                calAdj: 0.0,
                proteinPerLb: 0.85,
                fatPct: 0.30,
                fatMinPerLb: 0.28,
                carbMinPerLb: 0.80,
            },
            lose: {
                calAdj: -0.18,       // ~18% deficit
                proteinPerLb: 1.00,  // protect LBM
                fatPct: 0.30,
                fatMinPerLb: 0.28,
                carbMinPerLb: 0.50,
            },
        };

        const P = presets[goal] ?? presets.maintain;

        const targetCals = Math.round(tdee * (1 + P.calAdj));

        // Protein first (anchor, especially for Gain)
        const proteinG = Math.round(Math.max(0, wLb * P.proteinPerLb));
        const calFromProtein = proteinG * 4;

        // Fat: % of calories but not below per-lb floor
        const fatFromPctG = (targetCals * P.fatPct) / 9;
        const fatFromFloorG = wLb * P.fatMinPerLb;
        const fatG = Math.round(Math.max(fatFromPctG, fatFromFloorG));
        const calFromFat = fatG * 9;

        // Carbs: remainder, with a goal-dependent minimum per lb
        const remainingCalories = Math.max(0, targetCals - calFromProtein - calFromFat);
        const carbsFromRemainderG = remainingCalories / 4;
        const carbsFloorG = wLb * P.carbMinPerLb;
        let carbsG = Math.round(Math.max(carbsFromRemainderG, carbsFloorG));

        // 3) If carbs floor pushes over calories, trim fat (to floor) then carbs (to floor)
        let adjProteinG = proteinG;
        let adjFatG = fatG;
        let adjCarbG = carbsG;

        let totalCals = adjProteinG * 4 + adjFatG * 9 + adjCarbG * 4;
        if (totalCals > targetCals) {
            let over = totalCals - targetCals;

            const fatFloorG = Math.round(fatFromFloorG);
            const maxTrimFat = Math.max(0, adjFatG - fatFloorG);
            let trimFatG = Math.min(maxTrimFat, Math.ceil(over / 9));
            if (trimFatG > 0) {
                adjFatG -= trimFatG;
                over -= trimFatG * 9;
            }

            if (over > 0) {
                const carbFloor = Math.round(carbsFloorG);
                const maxTrimCarb = Math.max(0, adjCarbG - carbFloor);
                let trimCarbG = Math.min(maxTrimCarb, Math.ceil(over / 4));
                if (trimCarbG > 0) {
                    adjCarbG -= trimCarbG;
                    over -= trimCarbG * 4;
                }
            }
            // keep protein stable; it's the priority for Gain and helpful for Lose
        }

        // Respect manual overrides: only update fields the user hasn't overridden
        const next = {
            calories: manualRef.current.calories ? goalForm.calories : String(targetCals),
            protein: manualRef.current.protein ? goalForm.protein : String(adjProteinG),
            carbs: manualRef.current.carbs ? goalForm.carbs : String(adjCarbG),
            fat: manualRef.current.fat ? goalForm.fat : String(adjFatG),
        };

        if (
            next.calories !== goalForm.calories ||
            next.protein !== goalForm.protein ||
            next.carbs !== goalForm.carbs ||
            next.fat !== goalForm.fat
        ) {
            setGoalForm((s) => ({ ...s, ...next }));
        }
    }, [
        gender,
        weight,
        heightFt,
        heightIn,
        activity,
        goal,
        setGoalForm,
        goalForm.calories,
        goalForm.protein,
        goalForm.carbs,
        goalForm.fat,
    ]);

    // Helpers to ensure the sheet actually closes and parent state stays in sync
    const closeSheetEverywhere = useCallback(() => {
        onChangeIndex?.(-1);
        onCancel?.();
        sheetRef.current?.close?.();
    }, [onCancel, onChangeIndex]);

    const handleSave = useCallback(() => {
        onSave?.();
        onChangeIndex?.(-1);
        sheetRef.current?.close?.();
    }, [onSave, onChangeIndex]);

    return (
        <BottomSheet
            ref={sheetRef}
            index={index}
            snapPoints={['40%', '90%']}
            enablePanDownToClose
            onChange={onChangeIndex}
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.sheetHandle}
            backdropComponent={renderBackdrop}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.sheetTitle}>Personal Information</Text>

                    {/* Gender */}
                    <View style={{ marginBottom: 10 }}>
                        <Text style={styles.inputLabel}>Gender</Text>
                        <View style={styles.toggleRow}>
                            {['Male', 'Female'].map((g) => {
                                const v = g.toLowerCase();
                                const active = gender === v;
                                return (
                                    <Pressable
                                        key={g}
                                        style={[styles.toggleButton, active && styles.toggleButtonActive]}
                                        onPress={() => setGoalForm((s) => ({ ...s, gender: v }))}
                                    >
                                        <Text style={[styles.toggleButtonText, active && styles.toggleButtonTextActive]}>
                                            {g}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {/* Weight — half width like ft/in */}
                    <View style={{ marginBottom: 10 }}>
                        <Text style={styles.inputLabel}>Weight</Text>
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <View style={styles.inputBox}>
                                    <TextInput
                                        keyboardType="number-pad"
                                        returnKeyType="done"
                                        value={weight}
                                        onChangeText={(t) => setGoalForm((s) => ({ ...s, weight: onlyDigits(t) }))}
                                        style={styles.input}
                                        placeholder="0"
                                    />
                                    <Text style={styles.inputSuffix}>lb</Text>
                                </View>
                            </View>
                            {/* spacer to keep weight at half width */}
                            <View style={{ width: 12 }} />
                            <View style={{ flex: 1 }} />
                        </View>
                    </View>

                    {/* Height */}
                    <View style={{ marginTop: 2 }}>
                        <Text style={styles.inputLabel}>Height</Text>
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <View style={styles.inputBox}>
                                    <TextInput
                                        keyboardType="number-pad"
                                        returnKeyType="done"
                                        value={heightFt}
                                        onChangeText={(t) =>
                                            setGoalForm((s) => ({ ...s, heightFt: onlyDigits(t) }))
                                        }
                                        style={styles.input}
                                        placeholder="0"
                                        maxLength={1}
                                    />
                                    <Text style={styles.inputSuffix}>ft</Text>
                                </View>
                            </View>
                            <View style={{ width: 12 }} />
                            <View style={{ flex: 1 }}>
                                <View style={styles.inputBox}>
                                    <TextInput
                                        keyboardType="number-pad"
                                        returnKeyType="done"
                                        value={heightIn}
                                        onChangeText={(t) =>
                                            setGoalForm((s) => ({ ...s, heightIn: onlyDigits(t) }))
                                        }
                                        style={styles.input}
                                        placeholder="0"
                                        maxLength={2}
                                    />
                                    <Text style={styles.inputSuffix}>in</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Activity */}
                    <Text style={[styles.inputLabel, { marginTop: 20 }]}>Weekly Activity Level</Text>
                    <View style={styles.toggleRow}>
                        {[
                            { label: 'Sedentary (little/no exercise)', value: 'sedentary' },
                            { label: 'Light (2–3 hrs light)', value: 'light' },
                            { label: 'Moderate (3–4 days)', value: 'moderate' },
                            { label: 'Active (5–7 days)', value: 'active' },
                            { label: 'Athlete (intense 2x/day)', value: 'athlete' },
                        ].map((a) => {
                            const active = activity === a.value;
                            return (
                                <Pressable
                                    key={a.value}
                                    style={[styles.toggleButton, active && styles.toggleButtonActive]}
                                    onPress={() => setGoalForm((s) => ({ ...s, activity: a.value }))}
                                >
                                    <Text style={[styles.toggleButtonText, active && styles.toggleButtonTextActive]}>
                                        {a.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Goal */}
                    <Text style={[styles.inputLabel, { marginTop: 18 }]}>Goal</Text>
                    <View style={styles.toggleRow}>
                        {[
                            { label: 'Gain Muscle', value: 'gain' },
                            { label: 'Lose Fat', value: 'lose' },
                            { label: 'Maintain', value: 'maintain' },
                        ].map((g) => {
                            const active = goal === g.value;
                            return (
                                <Pressable
                                    key={g.value}
                                    style={[styles.toggleButton, active && styles.toggleButtonActive]}
                                    onPress={() => setGoalForm((s) => ({ ...s, goal: g.value }))}
                                >
                                    <Text style={[styles.toggleButtonText, active && styles.toggleButtonTextActive]}>
                                        {g.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Goals */}
                    <Text style={[styles.sheetTitle, { marginTop: 30 }]}>Adjust macro goals</Text>

                    <View style={styles.row}>
                        <LabeledNumber
                            label="Calories"
                            value={goalForm.calories}
                            onChangeText={(t) => {
                                markManual('calories');
                                setGoalForm((s) => ({ ...s, calories: onlyDigits(t) }));
                            }}
                            suffix="kcal"
                            styles={styles}
                            onFocus={() =>
                                setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 100)
                            }
                        />
                    </View>

                    <View style={[styles.row, { marginTop: 8 }]}>
                        <LabeledNumber
                            label="Protein"
                            value={goalForm.protein}
                            onChangeText={(t) => {
                                markManual('protein');
                                setGoalForm((s) => ({ ...s, protein: onlyDigits(t) }));
                            }}
                            suffix="g"
                            styles={styles}
                            onFocus={() =>
                                setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 100)
                            }
                        />
                        <View style={{ width: 12 }} />
                        <LabeledNumber
                            label="Carbs"
                            value={goalForm.carbs}
                            onChangeText={(t) => {
                                markManual('carbs');
                                setGoalForm((s) => ({ ...s, carbs: onlyDigits(t) }));
                            }}
                            suffix="g"
                            styles={styles}
                            onFocus={() =>
                                setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 100)
                            }
                        />
                        <View style={{ width: 12 }} />
                        <LabeledNumber
                            label="Fat"
                            value={goalForm.fat}
                            onChangeText={(t) => {
                                markManual('fat');
                                setGoalForm((s) => ({ ...s, fat: onlyDigits(t) }));
                            }}
                            suffix="g"
                            styles={styles}
                            onFocus={() =>
                                setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 100)
                            }
                        />
                    </View>

                    {/* Buttons */}
                    <View style={styles.sheetButtons}>
                        <Pressable
                            style={[styles.btn, styles.btnGhost]}
                            onPress={closeSheetEverywhere}
                        >
                            <Text style={[styles.btnText, styles.btnGhostText]}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.btn, styles.btnPrimary]}
                            onPress={handleSave}
                        >
                            <Text style={[styles.btnText, styles.btnPrimaryText]}>Save</Text>
                        </Pressable>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </BottomSheet>
    );
}

const makeStyles = (COLORS) =>
    StyleSheet.create({
        sheetBackground: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
        sheetHandle: { backgroundColor: '#e5e7eb', width: 44 },
        scrollContent: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 18 },

        sheetTitle: {
            fontSize: 18,
            fontFamily: 'Nunito_800ExtraBold',
            color: COLORS.textPrimary,
            marginBottom: 12,
        },
        row: { flexDirection: 'row', alignItems: 'flex-start' },

        inputLabel: {
            fontSize: 13,
            color: COLORS.textSecondary,
            marginBottom: 6,
            fontFamily: 'Outfit_400Regular',
        },
        inputBox: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff',
            borderRadius: 14,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: '#e6e6e6',
            paddingHorizontal: 12,
            paddingVertical: 10,
            shadowColor: '#000',
            shadowOpacity: 0.03,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 2,
        },
        input: {
            flex: 1,
            fontSize: 16,
            fontFamily: 'Outfit_400Regular',
            color: COLORS.textPrimary,
            paddingVertical: 0,
        },
        inputSuffix: { marginLeft: 8, color: COLORS.textSecondary, fontFamily: 'Outfit_400Regular' },

        toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
        toggleButton: {
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 14,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: '#e6e6e6',
            backgroundColor: '#fff',
        },
        toggleButtonActive: { backgroundColor: COLORS.accentBlue },
        toggleButtonText: {
            fontFamily: 'Outfit_400Regular',
            fontSize: 14,
            color: COLORS.textPrimary,
        },
        toggleButtonTextActive: { color: '#fff' },

        sheetButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
        btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
        btnGhost: { backgroundColor: '#f3f4f6' },
        btnPrimary: { backgroundColor: COLORS.accentBlue },
        btnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 15 },
        btnGhostText: { color: COLORS.textPrimary },
        btnPrimaryText: { color: '#fff' },
    });
