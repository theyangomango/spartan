// screens/FoodDetail.js
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, SafeAreaView, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/mfpDark';
import { db } from '../../firebase.config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { parseMacrosFromDescription } from '../utils/nutrition';

const COLORS = {
    bg: theme.bg,
    card: theme.surface,
    text: theme.textPrimary,
    subtext: theme.textSecondary,
    hairline: theme.hairline,
    accent: theme.primary,
};

export default function FoodDetail({ navigation, route }) {
    const entry = route?.params?.entry || {};
    const mealNameInit = route?.params?.mealName || 'Dinner';
    const dayKey = route?.params?.dayKey || '';
    const [servings, setServings] = useState(() => {
        const n = Number(entry?.quantity || 1);
        return Number.isFinite(n) && n > 0 ? n : 1;
    });
    const [meal, setMeal] = useState(mealNameInit);
    const macros = useMemo(() => parseMacrosFromDescription(entry?.desc || '', Number(servings) || 1), [entry?.desc, servings]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Ensure title in header area uses SafeArea by setting StatusBar and wrapping in SafeAreaView below
    }, []);

    const adjust = (delta) => {
        setServings((s) => {
            let v = Math.round((Number(s) + delta) * 100) / 100;
            if (!Number.isFinite(v) || v <= 0) v = 0.5;
            return v;
        });
    };

    const onChangeText = (t) => {
        const cleaned = String(t).replace(/[^0-9.]/g, '');
        const n = parseFloat(cleaned);
        if (!Number.isNaN(n)) setServings(n);
        else if (cleaned === '') setServings('');
    };

    const save = async () => {
        if (!entry?.key || !dayKey) { navigation.goBack(); return; }
        const uid = global?.userData?.uid || global?.userData?.id;
        if (!uid) { navigation.goBack(); return; }
        setSaving(true);
        try {
            const ref = doc(db, 'users', uid, 'foodLogs', dayKey, 'entries', entry.key);
            const qty = Number(servings) || 1;
            const m = parseMacrosFromDescription(entry?.desc || '', qty);
            await updateDoc(ref, {
                quantity: qty,
                mealType: String(meal || mealNameInit || 'Dinner').toLowerCase(),
                macros: {
                    calories: Math.round(m.calories || 0),
                    protein: Math.round(m.protein || 0),
                    carbs: Math.round(m.carbs || 0),
                    fat: Math.round(m.fat || 0),
                },
                updatedAt: serverTimestamp(),
            });
        } catch (e) {
            console.log('Failed to update food entry:', e?.message || e);
        }
        setSaving(false);
        navigation.goBack();
    };

    const MEAL_OPTIONS = ['Breakfast', 'Lunch', 'Dinner'];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            {/* Header inside safe area */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
                    <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>Add Food</Text>
                <Pressable style={styles.saveBtn} onPress={save} disabled={saving} hitSlop={8}>
                    <Ionicons name="checkmark" size={22} color={saving ? 'rgba(255,255,255,0.5)' : COLORS.text} />
                </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Top summary section spanning full width */}
                <View style={styles.topSummary}>
                    {entry?.brand ? (
                        <Text style={styles.brand} numberOfLines={1}>{entry.brand}</Text>
                    ) : null}
                    <Text style={styles.title} numberOfLines={2}>{entry?.name || 'Food Item'}</Text>
                    {entry?.desc ? (
                        <Text style={styles.desc} numberOfLines={3}>{entry.desc}</Text>
                    ) : null}
                </View>

                <View style={styles.hairline} />

                {/* Number of Servings */}
                <View style={styles.rowWrap}>
                    <Text style={styles.rowLabel}>Number of Servings</Text>
                    <View style={styles.inputWrap}>
                        <Pressable style={[styles.stepBtn, styles.stepLeft]} onPress={() => adjust(-0.5)}>
                            <Ionicons name="remove" size={16} color={COLORS.text} />
                        </Pressable>
                        <TextInput
                            value={String(servings)}
                            onChangeText={onChangeText}
                            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                            style={styles.input}
                            placeholder="1"
                            placeholderTextColor={COLORS.subtext}
                        />
                        <Pressable style={[styles.stepBtn, styles.stepRight]} onPress={() => adjust(+0.5)}>
                            <Ionicons name="add" size={16} color={COLORS.text} />
                        </Pressable>
                    </View>
                </View>

                <View style={styles.hairline} />

                {/* Meal selection */}
                <View style={styles.rowWrap}>
                    <Text style={styles.rowLabel}>Meal</Text>
                    <View style={styles.mealChipsRow}>
                        {MEAL_OPTIONS.map((opt) => (
                            <Pressable
                                key={opt}
                                onPress={() => setMeal(opt)}
                                style={[styles.mealChip, meal === opt && styles.mealChipActive]}
                            >
                                <Text style={[styles.mealChipText, meal === opt && styles.mealChipTextActive]}>{opt}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={styles.hairline} />

                {/* Macro badges */}
                <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
                    <View style={styles.macrosRow}>
                        <MacroBadge label="Calories" value={Math.round(macros.calories || 0)} suffix="kcal" />
                        <MacroBadge label="Protein" value={Math.round(macros.protein || 0)} suffix="g" />
                        <MacroBadge label="Carbs" value={Math.round(macros.carbs || 0)} suffix="g" />
                        <MacroBadge label="Fat" value={Math.round(macros.fat || 0)} suffix="g" />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function MacroBadge({ label, value, suffix }) {
    return (
        <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{label}</Text>
            <Text style={styles.badgeValue}>{value}<Text style={styles.badgeSuffix}> {suffix}</Text></Text>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
    backBtn: {
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
    },
    headerTitle: { flex: 1, color: COLORS.text, fontFamily: 'Nunito_800ExtraBold', fontSize: 16, textAlign: 'center' },
    saveBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
    topSummary: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14 },
    brand: { color: COLORS.subtext, fontFamily: 'Nunito_700Bold', fontSize: 12, marginBottom: 4 },
    title: { color: COLORS.text, fontFamily: 'Nunito_800ExtraBold', fontSize: 18, marginBottom: 6 },
    desc: { color: COLORS.subtext, fontFamily: 'Nunito_600SemiBold', fontSize: 12.5 },
    hairline: { height: 1, backgroundColor: COLORS.hairline, opacity: 0.7 },
    macrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.hairline,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        minWidth: 120,
    },
    badgeLabel: { color: COLORS.subtext, fontFamily: 'Nunito_700Bold', fontSize: 12 },
    badgeValue: { color: COLORS.text, fontFamily: 'Outfit_800ExtraBold', fontSize: 16, marginTop: 2 },
    badgeSuffix: { color: COLORS.subtext, fontFamily: 'Outfit_700Bold', fontSize: 12 },

    rowWrap: {
        paddingHorizontal: 18,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rowLabel: { color: COLORS.text, fontFamily: 'Nunito_700Bold', fontSize: 14 },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.field,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.hairline,
    },
    input: {
        width: 80,
        color: COLORS.text,
        fontFamily: 'Outfit_700Bold',
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 8,
    },
    stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    stepLeft: { borderRightWidth: 1, borderRightColor: COLORS.hairline },
    stepRight: { borderLeftWidth: 1, borderLeftColor: COLORS.hairline },
    mealChipsRow: { flexDirection: 'row', gap: 8 },
    mealChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.hairline,
        backgroundColor: theme.field,
    },
    mealChipActive: { backgroundColor: 'rgba(45,158,255,0.16)', borderColor: theme.primaryHairline },
    mealChipText: { color: COLORS.text, fontFamily: 'Outfit_700Bold', fontSize: 12 },
    mealChipTextActive: { color: theme.primary },
});
