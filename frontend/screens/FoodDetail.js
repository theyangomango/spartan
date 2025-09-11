// screens/FoodDetail.js
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, SafeAreaView, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/mfpDark';
import { db } from '../../firebase.config';
import { doc, updateDoc, serverTimestamp, setDoc, collection } from 'firebase/firestore';
import { parseMacrosFromDescription, parseExtraNutrientsFromDescription } from '../utils/nutrition';
import { getFoodById } from './fatsecretClient';
import Svg, { Circle } from 'react-native-svg';

const COLORS = {
    bg: theme.bg,
    card: theme.surface,
    text: theme.textPrimary,
    subtext: theme.textSecondary,
    hairline: theme.hairline,
    accent: theme.primary,
    accentSoft: theme.accentBlue,
    muted: theme.muted,
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
    const macros = useMemo(() => {
        const qty = Number(servings) || 1;
        return parseMacrosFromDescription(baseDesc, qty);
    }, [baseDesc, servings]);
    const [saving, setSaving] = useState(false);
    const [apiServing, setApiServing] = useState(null); // default serving from FatSecret

    // Fetch default serving once so we can populate Nutrition Facts robustly
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const fid = mode === 'add'
                    ? String(food?.food_id || '').trim()
                    : String(entry?.foodId || entry?.food_id || '').trim();
                if (!fid) return;
                const res = await getFoodById(fid).catch(() => null);
                const f = res?.food || null;
                const servings = f?.servings?.serving;
                const arr = Array.isArray(servings) ? servings : (servings ? [servings] : []);
                if (!arr.length) return;
                const def = arr.find((s) => String(s?.is_default || '') === '1') || arr[0];
                if (!cancelled) setApiServing(def || null);
            } catch {}
        })();
        return () => { cancelled = true; };
    }, [mode, food?.food_id, entry?.foodId, entry?.food_id]);

    const extras = useMemo(() => {
        const qty = Number(servings) || 1;
        if (apiServing) {
            const toNum = (v) => {
                const n = Number(v);
                return Number.isFinite(n) ? n : null;
            };
            const sugar = toNum(apiServing.sugar);
            const fiber = toNum(apiServing.fiber);
            const sodium = toNum(apiServing.sodium);
            const satFat = toNum(apiServing.saturated_fat);
            const chol = toNum(apiServing.cholesterol);
            return {
                sugar_g: sugar == null ? null : sugar * qty,
                fiber_g: fiber == null ? null : fiber * qty,
                sodium_mg: sodium == null ? null : sodium * qty,
                satFat_g: satFat == null ? null : satFat * qty,
                cholesterol_mg: chol == null ? null : chol * qty,
            };
        }
        return parseExtraNutrientsFromDescription(baseDesc, qty);
    }, [apiServing, baseDesc, servings]);

    // Extract a compact serving label from the description (e.g., "100 g", "1/2 cup", "1 serving")
    const servingLabel = useMemo(() => {
        const text = String(baseDesc || '');
        // Prefer explicit "Per ..." header until '-' or '|'
        const per = text.match(/\bper\b\s*([^\-|]+)/i);
        if (per) {
            return per[1].trim().replace(/\s+/g, ' ');
        }
        // Fallback to a bare unit like "100 g" or "240 ml"
        const bare = text.match(/(\d+(?:\s*\/\s*\d+)?(?:\.\d+)?)\s*(g|ml|oz|cup|cups|tbsp|tablespoon|tsp|teaspoon|slice|piece|serving)s?/i);
        if (bare) return `${bare[1].replace(/\s+/g, '')} ${bare[2]}`.replace('  ', ' ');
        return '';
    }, [baseDesc]);

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
                // Keep existing foodId if already stored; otherwise omit
                ...(entry?.foodId || entry?.food_id ? { foodId: String(entry.foodId || entry.food_id) } : {}),
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
                // no serving-specific storage; we rely on description default
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

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                {/* Top summary section spanning full width */}
                <View style={styles.topSummary}>
                    <Text style={styles.title} numberOfLines={2}>{displayName}</Text>
                    {/* Tagline: brand + default serving from description */}
                    {(() => {
                        const parts = [];
                        if (displayBrand) parts.push(displayBrand);
                        if (servingLabel) parts.push(servingLabel);
                        const line = parts.join(', ');
                        return line ? (<Text style={styles.desc} numberOfLines={1}>{line}</Text>) : null;
                    })()}
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
                <View style={{ paddingTop: 16, paddingBottom: 16 }}>
                    <MacroRow m={macros} />
                </View>

                {/* Nutrition facts (collapsible) */}
                <NutritionFacts extras={extras} />
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

    // Truncate macro grams for ring rendering only
    const pInt = Math.floor(p);
    const cInt = Math.floor(c);
    const fInt = Math.floor(f);

    const pCal = pInt * 4;
    const cCal = cInt * 4;
    const fCal = fInt * 9;
    const totalFromMacros = pCal + cCal + fCal;

    // Always fill the ring using macro proportions only, but only when > 0.
    // Zero-gram groups do not render; if total is zero, show empty track.
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

    // Segment lengths. We'll compute from fractions then push rounding
    // remainder into the last non-zero segment so the ring fully covers.
    let dashP = pInt > 0 ? Math.max(0, fracP * circ) : 0;
    let dashC = cInt > 0 ? Math.max(0, fracC * circ) : 0;
    let dashF = fInt > 0 ? Math.max(0, fracF * circ) : 0;

    if (totalFromMacros > 0) {
        const current = dashP + dashC + dashF;
        const remainder = Math.max(0, circ - current);
        if (fInt > 0) dashF += remainder; // prefer last in order
        else if (cInt > 0) dashC += remainder;
        else if (pInt > 0) dashP += remainder;
    } else {
        dashP = 0; dashC = 0; dashF = 0; // empty ring when all zero
    }

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
                        {pInt > 0 && dashP > 0 && (
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
                        {cInt > 0 && dashC > 0 && (
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
                        {fInt > 0 && dashF > 0 && (
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

function NutritionFacts({ extras }) {
    const [open, setOpen] = useState(true);

    // Daily Values (FDA 2016 update)
    const DV = {
        fiber_g: 28,
        sodium_mg: 2300,
        satFat_g: 20,
        cholesterol_mg: 300,
    };

    const rows = [
        {
            key: 'sugar_g',
            label: 'Sugars',
            unit: 'g',
            value: extras?.sugar_g,
            dv: null, // No established %DV for total sugars
        },
        { key: 'fiber_g', label: 'Dietary Fiber', unit: 'g', value: extras?.fiber_g, dv: DV.fiber_g },
        { key: 'sodium_mg', label: 'Sodium', unit: 'mg', value: extras?.sodium_mg, dv: DV.sodium_mg },
        { key: 'satFat_g', label: 'Saturated Fat', unit: 'g', value: extras?.satFat_g, dv: DV.satFat_g },
        { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg', value: extras?.cholesterol_mg, dv: DV.cholesterol_mg },
    ];

    const anyProvided = rows.some((r) => Number.isFinite(r.value));

    return (
        <View>
            <Pressable onPress={() => setOpen((v) => !v)} style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Nutrition Facts</Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.subtext} />
            </Pressable>
            <View style={styles.hairline} />
            {open && (
                <View style={styles.factsWrap}>
                    {anyProvided ? (
                        rows.map((r) => {
                            if (!Number.isFinite(r.value)) return null;
                            const val = r.unit === 'mg' ? Math.round(r.value) : Math.round(r.value * 10) / 10;
                            let pct = null;
                            if (r.dv && r.dv > 0) pct = Math.round((val / r.dv) * 100);
                            return (
                                <View key={r.key} style={styles.factRow}>
                                    <Text style={styles.factLabel}>{r.label}</Text>
                                    <View style={styles.factRight}>
                                        <Text style={styles.factValue}>{val}<Text style={styles.factUnit}> {r.unit}</Text></Text>
                                        {pct != null && (<Text style={styles.factPercentSub}>{`${pct}% DV`}</Text>)}
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.factsEmpty}>Not provided by source</Text>
                    )}
                </View>
            )}
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
    sectionHeader: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionHeaderText: { color: COLORS.subtext, fontFamily: 'Nunito_800ExtraBold', fontSize: 13, letterSpacing: 0.3 },
    factsWrap: { paddingHorizontal: 18, paddingVertical: 14, gap: 14 },
    factRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 47, paddingVertical: 6 },
    factLabel: { color: COLORS.text, fontFamily: 'Nunito_700Bold', fontSize: 14 },
    factValue: { color: COLORS.text, fontFamily: 'Outfit_800ExtraBold', fontSize: 16, letterSpacing: 0.2 },
    factUnit: { color: COLORS.subtext, fontFamily: 'Outfit_700Bold', fontSize: 12 },
    factRight: { alignItems: 'flex-end', minWidth: 110, justifyContent: 'center' },
    factPercentSub: { color: COLORS.accentSoft, fontFamily: 'Outfit_800ExtraBold', fontSize: 11, marginTop: 2 },
    factsEmpty: { color: COLORS.subtext, fontFamily: 'Nunito_700Bold', fontSize: 13, paddingVertical: 6 },
});
