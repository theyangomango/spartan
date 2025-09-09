// components/2_MacroTracking/PersonalInfoSheet.js
import React, { useMemo, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Easing,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

export function PersonalInfoContent({ goalForm, setGoalForm, onBack, onSave, COLORS }) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
    const onlyDigits = (s) => s.replace(/[^\d]/g, '');

    const gender = goalForm?.gender ?? 'male';
    const weight = goalForm?.weight ?? '';
    const heightFt = goalForm?.heightFt ?? '';
    const heightIn = goalForm?.heightIn ?? '';
    const activity = goalForm?.activity ?? 'moderate';
    const goal = goalForm?.goal ?? 'maintain';

    // Press animation for the full-width CTA (mirrors Macro Goals)
    const ctaScale = useRef(new Animated.Value(1)).current;
    const chevron = useRef(new Animated.Value(0)).current;
    const onCtaPressIn = () => Animated.spring(ctaScale, { toValue: 0.97, useNativeDriver: true, friction: 5, tension: 120 }).start();
    const onCtaPressOut = () => Animated.spring(ctaScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 120 }).start();
    const pulseChevron = () => {
        chevron.setValue(0);
        Animated.timing(chevron, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    };
    const chevronTranslate = chevron.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });

    const handleSavePress = () => {
        pulseChevron();
        onSave?.();
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header: title + Back (pill mirrors Macro Goals “Calculate”) */}
                <View style={styles.headerRow}>
                    <Text style={styles.sheetTitle}>Personal Information</Text>
                    <Pressable onPress={onBack} hitSlop={8}>
                        <View style={styles.smallLinkPill}>
                            <Ionicons name="chevron-back" size={14} color={styles.accent.color} style={{ marginRight: 6 }} />
                            <Text style={styles.smallLinkText}>Cancel</Text>
                        </View>
                    </Pressable>
                </View>

                {/* Gender */}
                <View style={{ marginBottom: 12 }}>
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
                                    <Text style={[styles.toggleButtonText, active && styles.toggleButtonTextActive]}>{g}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                {/* Weight */}
                <View style={{ marginBottom: 12 }}>
                    <Text style={styles.inputLabel}>Weight</Text>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.inputBox}>
                                <TextInput
                                    keyboardType="number-pad"
                                    returnKeyType="done"
                                    value={String(weight)}
                                    onChangeText={(t) => setGoalForm((s) => ({ ...s, weight: onlyDigits(t) }))}
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor={styles.placeholder.color}
                                />
                                <Text style={styles.inputSuffix}>lb</Text>
                            </View>
                        </View>
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
                                    value={String(heightFt)}
                                    onChangeText={(t) => setGoalForm((s) => ({ ...s, heightFt: onlyDigits(t) }))}
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor={styles.placeholder.color}
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
                                    value={String(heightIn)}
                                    onChangeText={(t) => setGoalForm((s) => ({ ...s, heightIn: onlyDigits(t) }))}
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor={styles.placeholder.color}
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
                                <Text style={[styles.toggleButtonText, active && styles.toggleButtonTextActive]}>{a.label}</Text>
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
                                <Text style={[styles.toggleButtonText, active && styles.toggleButtonTextActive]}>{g.label}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Full-width “Save & Calculate” — mirrors Macro Goals autoCalcRow */}
                <Pressable onPress={handleSavePress} onPressIn={onCtaPressIn} onPressOut={onCtaPressOut} hitSlop={8}>
                    <Animated.View style={[styles.autoCalcRow, { transform: [{ scale: ctaScale }] }]}>
                        <View style={styles.autoCalcLeft}>
                            <View style={styles.autoCalcIconWrap}>
                                <Ionicons name="sparkles-outline" size={16} color={styles.accent.color} />
                            </View>
                            <Text style={styles.autoCalcText}>Save &amp; Calculate</Text>
                        </View>
                        <Animated.View style={{ transform: [{ translateX: chevronTranslate }] }}>
                            <Ionicons name="chevron-forward" size={18} color={styles.accent.color} />
                        </Animated.View>
                    </Animated.View>
                </Pressable>

                <View style={{ height: 110 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

/** Default export: BottomSheet wrapper */
export default function PersonalInfoSheet({ index, onChangeIndex, goalForm, setGoalForm, onClose, onSave, COLORS }) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
    const sheetRef = useRef(null);

    const renderBackdrop = useCallback(
        (props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />,
        []
    );

    const handleClose = useCallback(() => {
        onChangeIndex?.(-1);
        onClose?.();
        sheetRef.current?.close?.();
    }, [onClose, onChangeIndex]);

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
            <PersonalInfoContent
                goalForm={goalForm}
                setGoalForm={setGoalForm}
                onBack={handleClose}
                onSave={handleSave}
                COLORS={COLORS}
            />
        </BottomSheet>
    );
}

const makeStyles = (COLORS) => {
    // Harmonize with MacroGoalsSheet: slightly brighter contrasts
    const text = COLORS?.text ?? COLORS?.textPrimary ?? '#E5E7EB';
    const subtext = COLORS?.subtext ?? COLORS?.textSecondary ?? '#A1A7B3';
    const card = COLORS?.card ?? '#252733';
    // Locally tuned for clearer separation in this sheet
    const hairline = 'rgba(255,255,255,0.14)';
    const accent = COLORS?.accentBlue ?? '#6FB8FF';
    const fieldBg = '#2B2F3A';

    return StyleSheet.create({
        sheetBackground: { backgroundColor: card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: hairline },
        sheetHandle: { backgroundColor: '#3A3D45', width: 44, height: 4, borderRadius: 2 },
        scrollContent: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18 },

        headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
        sheetTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: text },

        row: { flexDirection: 'row', alignItems: 'flex-start' },

        inputLabel: { fontSize: 13, color: subtext, marginBottom: 6, fontFamily: 'Outfit_400Regular' },
        inputBox: {
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: fieldBg, borderRadius: 14,
            borderWidth: 1, borderColor: hairline,
            paddingHorizontal: 12, paddingVertical: 12,
            shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4,
        },
        input: { flex: 1, fontSize: 16, fontFamily: 'Outfit_400Regular', color: text, paddingVertical: 0 },
        placeholder: { color: '#BAC3D2' },
        accent: { color: accent },
        inputSuffix: { marginLeft: 8, color: subtext, fontFamily: 'Outfit_400Regular' },

        toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
        toggleButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: hairline, backgroundColor: card },
        toggleButtonActive: { backgroundColor: accent, borderColor: 'transparent' },
        toggleButtonText: { fontFamily: 'Outfit_500Medium', fontSize: 14, color: text },
        toggleButtonTextActive: { color: '#fff' },

        // Macro Goals “Calculate” pill (header action)
        smallLinkPill: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: fieldBg,
            borderWidth: 1,
            borderColor: hairline,
        },
        smallLinkText: { fontFamily: 'Outfit_600SemiBold', fontSize: 12.5, color: text },

        // Full-width action row (mirrors Macro Goals autoCalcRow)
        autoCalcRow: {
            marginTop: 16,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 14,
            backgroundColor: fieldBg,
            borderWidth: 1,
            borderColor: hairline,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        autoCalcLeft: { flexDirection: 'row', alignItems: 'center' },
        autoCalcIconWrap: {
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: fieldBg,
            borderWidth: 1,
            borderColor: hairline,
            marginRight: 10,
        },
        autoCalcText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: text },
    });
};
