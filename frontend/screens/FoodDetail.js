// screens/FoodDetail.js
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, SafeAreaView, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/mfpDark';
import { db } from '../../firebase.config';
import { doc, updateDoc, serverTimestamp, setDoc, collection } from 'firebase/firestore';
import { parseMacrosFromDescription } from '../utils/nutrition';
import Svg, { Circle } from 'react-native-svg';

const COLORS = {
    bg: theme.bg,
    card: theme.surface,
    text: theme.textPrimary,
    subtext: theme.textSecondary,
    hairline: theme.hairline,
    accent: theme.primary,
    // Macro colors (match MacroTracking)
    protein: '#6c98fcff',
    carbs: '#ff7cb5ff',
    fat: '#FFC874',
};

export default function FoodDetail({ navigation, route }) {
    const mode = route?.params?.mode || 'edit'; // 'edit' | 'add'
    const food = route?.params?.food || null;   // FatSecret-shaped when adding
    const entry = route?.params?.entry || {};
    const mealNameInit = route?.params?.mealName || 'Dinner';
    const dayKey = route?.params?.dayKey || '';
    const [servings, setServings] = useState(() => {
        const n = Number(entry?.quantity || 1);
        return Number.isFinite(n) && n > 0 ? n : 1;
    });
    const [meal, setMeal] = useState(mealNameInit);
    // Choose description source based on mode
    const baseDesc = mode === 'add' ? (food?.food_description || '') : (entry?.desc || '');
    const displayName = mode === 'add' ? (food?.food_name || 'Food Item') : (entry?.name || 'Food Item');
    const displayBrand = mode === 'add' ? (food?.brand_name || '') : (entry?.brand || '');
    const macros = useMemo(() => parseMacrosFromDescription(baseDesc, Number(servings) || 1), [baseDesc, servings]);
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

    const addNew = async () => {
        const uid = global?.userData?.uid || global?.userData?.id;
        if (!uid || !dayKey || !food) { navigation.goBack(); return; }
        setSaving(true);
        try {
            const dayRef = doc(db, 'users', uid, 'foodLogs', dayKey);
            const entryRef = doc(collection(dayRef, 'entries'));
            const qty = Number(servings) || 1;
            const m = parseMacrosFromDescription(food?.food_description || '', qty);

            const payload = {
                mealType: String(meal || mealNameInit || 'Dinner').toLowerCase(),
                name: food?.food_name || '',
                brand: food?.brand_name || '',
                foodId: String(food?.food_id ?? ''),
                description: food?.food_description || '',
                source: 'fatsecret',
                quantity: qty,
                macros: {
                    calories: Math.round(m.calories || 0),
                    protein: Math.round(m.protein || 0),
                    carbs: Math.round(m.carbs || 0),
                    fat: Math.round(m.fat || 0),
                },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(dayRef, { dayKey, updatedAt: serverTimestamp() }, { merge: true });
            await setDoc(entryRef, payload);

            // best-effort recent-foods
            try {
                const recentRef = doc(db, 'users', uid, 'recentFoods', String(payload.foodId || payload.name));
                await setDoc(
                    recentRef,
                    {
                        foodId: payload.foodId,
                        name: payload.name,
                        brand: payload.brand,
                        description: payload.description,
                        usedCount: 1,
                        lastUsedAt: serverTimestamp(),
                    },
                    { merge: true }
                );
            } catch { }
        } catch (e) {
            console.log('Failed to add food entry:', e?.message || e);
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
                {mode === 'add' ? (
                    <Pressable style={styles.saveBtn} onPress={addNew} disabled={saving} hitSlop={8}>
                        <Ionicons name="add" size={22} color={saving ? 'rgba(255,255,255,0.5)' : COLORS.text} />
                    </Pressable>
                ) : (
                    <Pressable style={styles.saveBtn} onPress={save} disabled={saving} hitSlop={8}>
                        <Ionicons name="checkmark" size={22} color={saving ? 'rgba(255,255,255,0.5)' : COLORS.text} />
                    </Pressable>
                )}
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Top summary section spanning full width */}
                <View style={styles.topSummary}>
                    {displayBrand ? (
                        <Text style={styles.brand} numberOfLines={1}>{displayBrand}</Text>
                    ) : null}
                    <Text style={styles.title} numberOfLines={2}>{displayName}</Text>
                    {/* Hide long description under title per request */}
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

                {/* Macro ring + stats */}
                <View style={{ paddingTop: 16, paddingBottom: 24 }}>
                    <MacroRow m={macros} />
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

function MacroRow({ m }) {
    const calories = Math.max(0, Math.round(m?.calories || 0));
    const p = Math.max(0, Number(m?.protein || 0));
    const c = Math.max(0, Number(m?.carbs || 0));
    const f = Math.max(0, Number(m?.fat || 0));

    const pCal = p * 4;
    const cCal = c * 4;
    const fCal = f * 9;
    const totalFromMacros = pCal + cCal + fCal;

    // Always fill the ring using macro proportions only.
    // If macro group is zero grams, it should not render at all.
    const ringDenom = totalFromMacros > 0 ? totalFromMacros : 1; // avoid divide-by-zero
    const fracP = totalFromMacros > 0 ? (pCal / ringDenom) : 0;
    const fracC = totalFromMacros > 0 ? (cCal / ringDenom) : 0;
    const fracF = totalFromMacros > 0 ? (fCal / ringDenom) : 0;

    const size = 120; // fixed ring size per design
    const stroke = Math.max(10, Math.round(size * 0.12));
    const r = Math.max(1, (size - stroke) / 2);
    const cx = size / 2;
    const cy = size / 2;
    const circ = 2 * Math.PI * r;

    // Segment lengths. Zero-length segments are omitted entirely below.
    const dashP = Math.max(0, fracP * circ);
    const dashC = Math.max(0, fracC * circ);
    // Ensure full coverage, assign remainder to last segment to prevent floating gaps
    const dashF = Math.max(0, circ - (dashP + dashC));

    // Start ring at 12 o'clock by rotating -90deg
    const baseOffset = 0;
    const offP = baseOffset;
    const offC = baseOffset - dashP;
    const offF = baseOffset - (dashP + dashC);

    return (
        <View style={styles.macroFourRow}>
            {/* Calories ring (no card) */}
            <View style={styles.ringBoxFour}>
                <View style={{ width: size, height: size }}>
                    <Svg width={size} height={size}>
                        {/* Track */}
                        <Circle
                            cx={cx}
                            cy={cy}
                            r={r}
                            stroke={COLORS.hairline}
                            strokeOpacity={0.28}
                            strokeWidth={stroke}
                            fill="none"
                        />
                        {/* Protein */}
                        {dashP > 0 && (
                            <Circle
                                cx={cx}
                                cy={cy}
                                r={r}
                                stroke={COLORS.protein}
                                strokeWidth={stroke}
                                fill="none"
                                strokeDasharray={`${dashP}, ${circ}`}
                                strokeDashoffset={offP}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${cx} ${cy})`}
                            />
                        )}
                        {/* Carbs */}
                        {dashC > 0 && (
                            <Circle
                                cx={cx}
                                cy={cy}
                                r={r}
                                stroke={COLORS.carbs}
                                strokeWidth={stroke}
                                fill="none"
                                strokeDasharray={`${dashC}, ${circ}`}
                                strokeDashoffset={offC}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${cx} ${cy})`}
                            />
                        )}
                        {/* Fat */}
                        {dashF > 0 && (
                            <Circle
                                cx={cx}
                                cy={cy}
                                r={r}
                                stroke={COLORS.fat}
                                strokeWidth={stroke}
                                fill="none"
                                strokeDasharray={`${dashF}, ${circ}`}
                                strokeDashoffset={offF}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${cx} ${cy})`}
                            />
                        )}
                    </Svg>
                    <View style={styles.centerLabel} pointerEvents="none">
                        <Text style={styles.centerCal}>{Math.round(calories || 0)}</Text>
                        <Text style={styles.centerSub}>cal</Text>
                    </View>
                </View>
            </View>
            <MacroStat width={68} color={COLORS.carbs} label="Carbs" grams={c} />
            <MacroStat width={60} color={COLORS.fat} label="Fat" grams={f} />
            <MacroStat width={70} color={COLORS.protein} label="Protein" grams={p} />
        </View>
    );
}

function MacroStat({ color, label, grams, width }) {
    return (
        <View style={[styles.macroStat, { width }]}>
            <View style={[styles.macroStatDot, { backgroundColor: color }]} />
            <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.macroStatLabel}>{label}</Text>
                <Text numberOfLines={1} style={styles.macroStatValue}>
                    {Math.round(grams || 0)} <Text style={styles.badgeSuffix}>g</Text>
                </Text>
            </View>
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

    macroFourRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
    ringBoxFour: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4, marginRight: 12 },
    centerLabel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    centerCal: { color: COLORS.text, fontFamily: 'Outfit_800ExtraBold', fontSize: 20 },
    centerSub: { color: COLORS.subtext, fontFamily: 'Outfit_700Bold', fontSize: 13 },
    macroStat: { paddingVertical: 2, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', gap: 6 },
    macroStatDot: { width: 8, height: 8, borderRadius: 4, marginRight: 2 },
    macroStatLabel: { color: COLORS.subtext, fontFamily: 'Nunito_700Bold', fontSize: 12 },
    macroStatValue: { color: COLORS.text, fontFamily: 'Outfit_800ExtraBold', fontSize: 18 },
});
