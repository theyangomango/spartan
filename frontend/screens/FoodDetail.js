// screens/FoodDetail.js
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, SafeAreaView, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/mfpDark';
import { db } from '../../firebase.config';
import { doc, updateDoc, serverTimestamp, setDoc, deleteField } from 'firebase/firestore';
import { parseMacrosFromDescription, parseExtraNutrientsFromDescription } from '../utils/nutrition';
import { getFoodById } from './fatsecretClient';
import Svg, { Circle } from 'react-native-svg';

import scaleSize from "../helper/scaleSize";

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
    const round2 = (n) => {
        const x = Number(n);
        if (!Number.isFinite(x)) return 0;
        return Math.round(x * 100) / 100;
    };
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
        const qty = round2(Number(servings) || 1);
        return parseMacrosFromDescription(baseDesc, qty);
    }, [baseDesc, servings]);
    const [saving, setSaving] = useState(false);
    const [apiServing, setApiServing] = useState(null); // temp holder when fetched from API
    const [extrasPS, setExtrasPS] = useState(null); // cached micronutrients per default serving

    // Load extras per serving from entry cache → API (no Firestore caches)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const fid = mode === 'add'
                    ? String(food?.food_id || '').trim()
                    : String(entry?.foodId || entry?.food_id || '').trim();
                if (!fid) return;

                // 1) If editing and entry already has per-serving extras cached, use them
                if (mode === 'edit' && entry?.extrasPerServing) {
                    if (!cancelled) setExtrasPS(entry.extrasPerServing);
                    return;
                }

                // 2) Fetch from FatSecret API
                const res = await getFoodById(fid).catch(() => null);
                const f = res?.food || null;
                const servings = f?.servings?.serving;
                const arr = Array.isArray(servings) ? servings : (servings ? [servings] : []);
                if (!arr?.length) return;
                const def = arr.find((s) => String(s?.is_default || '') === '1') || arr[0];
                if (!def) return;
                const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
                const cached = {
                    sugar_g: toNum(def.sugar),
                    fiber_g: toNum(def.fiber),
                    sodium_mg: toNum(def.sodium),
                    potassium_mg: toNum(def.potassium),
                    satFat_g: toNum(def.saturated_fat),
                    transFat_g: toNum(def.trans_fat),
                    monoFat_g: toNum(def.monounsaturated_fat),
                    polyFat_g: toNum(def.polyunsaturated_fat),
                    cholesterol_mg: toNum(def.cholesterol),
                };
                if (!cancelled) {
                    setApiServing(def);
                    setExtrasPS(cached);
                }

                // Do not persist extras to Firestore caches
            } catch {}
        })();
        return () => { cancelled = true; };
    }, [mode, food?.food_id, entry?.foodId, entry?.food_id]);

    const extras = useMemo(() => {
        const qty = round2(Number(servings) || 1);
        if (extrasPS) {
            return {
                sugar_g: extrasPS.sugar_g == null ? null : extrasPS.sugar_g * qty,
                fiber_g: extrasPS.fiber_g == null ? null : extrasPS.fiber_g * qty,
                sodium_mg: extrasPS.sodium_mg == null ? null : extrasPS.sodium_mg * qty,
                potassium_mg: extrasPS.potassium_mg == null ? null : extrasPS.potassium_mg * qty,
                satFat_g: extrasPS.satFat_g == null ? null : extrasPS.satFat_g * qty,
                transFat_g: extrasPS.transFat_g == null ? null : extrasPS.transFat_g * qty,
                monoFat_g: extrasPS.monoFat_g == null ? null : extrasPS.monoFat_g * qty,
                polyFat_g: extrasPS.polyFat_g == null ? null : extrasPS.polyFat_g * qty,
                cholesterol_mg: extrasPS.cholesterol_mg == null ? null : extrasPS.cholesterol_mg * qty,
            };
        }
        return parseExtraNutrientsFromDescription(baseDesc, qty);
    }, [extrasPS, baseDesc, servings]);

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
            let v = round2((Number(s) || 0) + delta);
            if (!Number.isFinite(v) || v <= 0) v = 0.5;
            return v;
        });
    };

    const onChangeText = (t) => {
        const cleaned = String(t).replace(/[^0-9.]/g, '');
        if (cleaned === '') { setServings(''); return; }
        const n = parseFloat(cleaned);
        if (!Number.isNaN(n)) setServings(n);
    };

    const save = async () => {
        if (!entry?.key || !dayKey) { navigation.goBack(); return; }
        const uid = global?.userData?.uid || global?.userData?.id;
        if (!uid) { navigation.goBack(); return; }
        setSaving(true);
        try {
            const qty = round2(Number(servings) || 1);
            const m = parseMacrosFromDescription(entry?.desc || '', qty);

            // 1) Update global mirror (support nested-by-day and flat shapes)
            try {
                global.userData = global.userData || {};
                const map = global.userData.loggedFoods = global.userData.loggedFoods || {};
                const patch = {
                    dayKey,
                    meal: String(meal || mealNameInit || 'Dinner'),
                    name: entry?.name || '',
                    brand: entry?.brand || '',
                    desc: entry?.desc || '',
                    foodId: entry?.foodId || entry?.food_id || '',
                    quantity: qty,
                    macros: {
                        calories: Math.round(m.calories || 0),
                        protein: Math.round(m.protein || 0),
                        carbs: Math.round(m.carbs || 0),
                        fat: Math.round(m.fat || 0),
                    },
                    ...(extrasPS ? { extrasPerServing: extrasPS } : {}),
                    updatedAt: Date.now(),
                };
                if (map[dayKey] && typeof map[dayKey] === 'object') {
                    map[dayKey][entry.key] = { ...(map[dayKey][entry.key] || {}), ...patch };
                } else {
                    map[entry.key] = { ...(map[entry.key] || {}), ...patch };
                }
                try { global.__loggedFoodsSig = (global.__loggedFoodsSig || 0) + 1; } catch {}
            } catch { }

            // 2) Persist to user doc under loggedFoods.<dayKey>.<entryId>
            try {
                const uref = doc(db, 'users', uid);
                const fieldPath = `loggedFoods.${dayKey}.${entry.key}`;
                await updateDoc(uref, { [fieldPath]: {
                    dayKey,
                    meal: String(meal || mealNameInit || 'Dinner'),
                    name: entry?.name || '',
                    brand: entry?.brand || '',
                    desc: entry?.desc || '',
                    foodId: entry?.foodId || entry?.food_id || '',
                    quantity: qty,
                    macros: {
                        calories: Math.round(m.calories || 0),
                        protein: Math.round(m.protein || 0),
                        carbs: Math.round(m.carbs || 0),
                        fat: Math.round(m.fat || 0),
                    },
                    ...(extrasPS ? { extrasPerServing: extrasPS } : {}),
                    updatedAt: serverTimestamp(),
                } });
                // also remove any legacy flat key if present
                const flatPath = `loggedFoods.${entry.key}`;
                await updateDoc(uref, { [flatPath]: deleteField() }).catch(() => {});
            } catch { }
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
            const qty = round2(Number(servings) || 1);
            const m = parseMacrosFromDescription(food?.food_description || '', qty);

            // generate an id similar to MacroTracking
            const newId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
            const flat = {
                dayKey,
                meal: String(meal || mealNameInit || 'Dinner'),
                name: food?.food_name || '',
                brand: food?.brand_name || '',
                desc: food?.food_description || '',
                foodId: String(food?.food_id ?? ''),
                quantity: qty,
                macros: {
                    calories: Math.round(m.calories || 0),
                    protein: Math.round(m.protein || 0),
                    carbs: Math.round(m.carbs || 0),
                    fat: Math.round(m.fat || 0),
                },
                ...(extrasPS ? { extrasPerServing: extrasPS } : {}),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            // 1) Update global mirror (nested preferred)
            try {
                global.userData = global.userData || {};
                const map = global.userData.loggedFoods = global.userData.loggedFoods || {};
                map[dayKey] = map[dayKey] || {};
                map[dayKey][newId] = { ...flat, createdAt: Date.now(), updatedAt: Date.now() };
                try { global.__loggedFoodsSig = (global.__loggedFoodsSig || 0) + 1; } catch {}
            } catch { }

            // 2) Persist to user doc under loggedFoods.<dayKey>.<newId>
            try {
                const uref = doc(db, 'users', uid);
                const fieldPath = `loggedFoods.${dayKey}.${newId}`;
                await updateDoc(uref, { [fieldPath]: flat });
            } catch {
                // Fallback with setDoc merge if user doc missing
                try {
                    await setDoc(doc(db, 'users', uid), { loggedFoods: { [dayKey]: { [newId]: flat } } }, { merge: true });
                } catch { }
            }

            // No writes to other collections
        } catch (e) {
            console.log('Failed to add food entry:', e?.message || e);
        }
        setSaving(false);
        navigation.goBack();
    };

    const MEAL_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

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
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: scaleSize(24) }} showsVerticalScrollIndicator={false}>
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
                            onBlur={() => {
                                if (servings === '') return;
                                setServings((s) => round2(Number(s) || 0) || 1);
                            }}
                            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                            inputMode="decimal"
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
                <View style={{ paddingTop: scaleSize(16), paddingBottom: scaleSize(16) }}>
                    <MacroRow m={macros} />
                </View>

                {/* Nutrition facts (collapsible) */}
                <NutritionFacts extras={extras} />
            </ScrollView>
        </SafeAreaView>
    );
}

// Lightweight inline variant for embedding inside other views (e.g., bottom sheets).
// Displays summary + macro ring + nutrition facts; no save/add controls.
export function FoodDetailInline({ entry = {}, onClose, containerStyle }) {
    const baseDesc = entry?.desc || entry?.description || '';
    const displayName = entry?.name || 'Food Item';
    const displayBrand = entry?.brand || '';
    const qty = Number(entry?.quantity || entry?.qty || 1) || 1;
    const macros = useMemo(() => parseMacrosFromDescription(baseDesc, qty), [baseDesc, qty]);
    const [extrasPS, setExtrasPS] = useState(null);
    const extras = useMemo(() => {
        if (extrasPS) {
            return {
                sugar_g: extrasPS.sugar_g == null ? null : extrasPS.sugar_g * qty,
                fiber_g: extrasPS.fiber_g == null ? null : extrasPS.fiber_g * qty,
                sodium_mg: extrasPS.sodium_mg == null ? null : extrasPS.sodium_mg * qty,
                potassium_mg: extrasPS.potassium_mg == null ? null : extrasPS.potassium_mg * qty,
                satFat_g: extrasPS.satFat_g == null ? null : extrasPS.satFat_g * qty,
                transFat_g: extrasPS.transFat_g == null ? null : extrasPS.transFat_g * qty,
                monoFat_g: extrasPS.monoFat_g == null ? null : extrasPS.monoFat_g * qty,
                polyFat_g: extrasPS.polyFat_g == null ? null : extrasPS.polyFat_g * qty,
                cholesterol_mg: extrasPS.cholesterol_mg == null ? null : extrasPS.cholesterol_mg * qty,
            };
        }
        return parseExtraNutrientsFromDescription(baseDesc, qty);
    }, [extrasPS, baseDesc, qty]);

    // Fetch extras per serving if we have a foodId; otherwise parse from description
    useEffect(() => {
        const fid = String(entry?.foodId || entry?.food_id || '').trim();
        if (!fid) return; // fall back to parsing from desc only
        let cancelled = false;
        (async () => {
            try {
                // Fetch from FatSecret
                const res = await getFoodById(fid).catch(() => null);
                const f = res?.food || null;
                const servings = f?.servings?.serving;
                const arr = Array.isArray(servings) ? servings : (servings ? [servings] : []);
                if (!arr?.length) return;
                const def = arr.find((s) => String(s?.is_default || '') === '1') || arr[0];
                if (!def) return;
                const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
                const cached = {
                    sugar_g: toNum(def.sugar),
                    fiber_g: toNum(def.fiber),
                    sodium_mg: toNum(def.sodium),
                    potassium_mg: toNum(def.potassium),
                    satFat_g: toNum(def.saturated_fat),
                    transFat_g: toNum(def.trans_fat),
                    monoFat_g: toNum(def.monounsaturated_fat),
                    polyFat_g: toNum(def.polyunsaturated_fat),
                    cholesterol_mg: toNum(def.cholesterol),
                };
                if (!cancelled) setExtrasPS(cached);
            } catch {}
        })();
        return () => { cancelled = true; };
    }, [entry?.foodId, entry?.food_id]);

    const servingLabel = useMemo(() => {
        const text = String(baseDesc || '');
        const per = text.match(/\bper\b\s*([^\-|]+)/i);
        if (per) return per[1].trim().replace(/\s+/g, ' ');
        const bare = text.match(/(\d+(?:\s*\/\s*\d+)?(?:\.\d+)?)\s*(g|ml|oz|cup|cups|tbsp|tablespoon|tsp|teaspoon|slice|piece|serving)s?/i);
        if (bare) return `${bare[1].replace(/\s+/g, '')} ${bare[2]}`.replace('  ', ' ');
        return '';
    }, [baseDesc]);

    return (
        <View style={[{ flex: 1 }, containerStyle != null ? containerStyle : { backgroundColor: COLORS.bg }]}>
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={onClose} hitSlop={8}>
                    <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>Food Details</Text>
                <View style={styles.saveBtn} />
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: scaleSize(24) }} showsVerticalScrollIndicator={false}>
                <View style={styles.topSummary}>
                    <Text style={styles.title} numberOfLines={2}>{displayName}</Text>
                    {(() => {
                        const parts = [];
                        if (displayBrand) parts.push(displayBrand);
                        if (servingLabel) parts.push(servingLabel);
                        const line = parts.join(', ');
                        return line ? (<Text style={styles.desc} numberOfLines={1}>{line}</Text>) : null;
                    })()}
                </View>
                <View style={styles.hairline} />

                <View style={{ paddingTop: scaleSize(16), paddingBottom: scaleSize(16) }}>
                    <MacroRow m={macros} />
                </View>

                <NutritionFacts extras={extras} />
            </ScrollView>
        </View>
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
    // Daily Values (FDA 2016 update)
    const DV = {
        fiber_g: 28,
        sodium_mg: 2300,
        satFat_g: 20,
        cholesterol_mg: 300,
        potassium_mg: 4700,
    };

    const rows = [
        { key: 'sugar_g', label: 'Sugars', unit: 'g', value: extras?.sugar_g, dv: null },
        { key: 'fiber_g', label: 'Dietary Fiber', unit: 'g', value: extras?.fiber_g, dv: DV.fiber_g },
        { key: 'sodium_mg', label: 'Sodium', unit: 'mg', value: extras?.sodium_mg, dv: DV.sodium_mg },
        { key: 'potassium_mg', label: 'Potassium', unit: 'mg', value: extras?.potassium_mg, dv: DV.potassium_mg },
        { key: 'satFat_g', label: 'Saturated Fat', unit: 'g', value: extras?.satFat_g, dv: DV.satFat_g },
        { key: 'transFat_g', label: 'Trans Fat', unit: 'g', value: extras?.transFat_g, dv: null },
        { key: 'monoFat_g', label: 'Monounsaturated Fat', unit: 'g', value: extras?.monoFat_g, dv: null },
        { key: 'polyFat_g', label: 'Polyunsaturated Fat', unit: 'g', value: extras?.polyFat_g, dv: null },
        { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg', value: extras?.cholesterol_mg, dv: DV.cholesterol_mg },
    ];

    const anyProvided = rows.some((r) => Number.isFinite(r.value));

    return (
        <View>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Nutrition Facts</Text>
            </View>
            <View style={styles.hairline} />
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
        </View>
    );
}

const styles = StyleSheet.create({
    header: { height: scaleSize(52), flexDirection: 'row', alignItems: 'center', paddingHorizontal: scaleSize(8) },
    backBtn: {
        width: scaleSize(42),
        height: scaleSize(42),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scaleSize(999),
    },
    headerTitle: { flex: 1, color: COLORS.text, fontFamily: 'Nunito_800ExtraBold', fontSize: scaleSize(16), textAlign: 'center' },
    saveBtn: { width: scaleSize(42), height: scaleSize(42), alignItems: 'center', justifyContent: 'center', borderRadius: scaleSize(999) },
    topSummary: { paddingHorizontal: scaleSize(18), paddingTop: scaleSize(10), paddingBottom: scaleSize(14) },
    brand: { color: COLORS.subtext, fontFamily: 'Nunito_700Bold', fontSize: scaleSize(12), marginBottom: scaleSize(4) },
    title: { color: COLORS.text, fontFamily: 'Nunito_800ExtraBold', fontSize: scaleSize(18), marginBottom: scaleSize(6) },
    desc: { color: COLORS.subtext, fontFamily: 'Nunito_600SemiBold', fontSize: scaleSize(12.5) },
    hairline: { height: scaleSize(1), backgroundColor: COLORS.hairline, opacity: 0.7 },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.hairline,
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(12),
        borderRadius: scaleSize(12),
        minWidth: scaleSize(120),
    },
    badgeLabel: { color: COLORS.subtext, fontFamily: 'Nunito_700Bold', fontSize: scaleSize(12) },
    badgeValue: { color: COLORS.text, fontFamily: 'Outfit_800ExtraBold', fontSize: scaleSize(16), marginTop: scaleSize(2) },
    badgeSuffix: { color: COLORS.subtext, fontFamily: 'Outfit_700Bold', fontSize: scaleSize(12) },

    rowWrap: {
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(14),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rowLabel: { color: COLORS.text, fontFamily: 'Nunito_700Bold', fontSize: scaleSize(14) },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.field,
        borderRadius: scaleSize(10),
        borderWidth: scaleSize(1),
        borderColor: COLORS.hairline,
    },
    input: {
        width: scaleSize(80),
        color: COLORS.text,
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14),
        textAlign: 'center',
        paddingVertical: scaleSize(8),
    },
    stepBtn: { width: scaleSize(36), height: scaleSize(36), alignItems: 'center', justifyContent: 'center' },
    stepLeft: { borderRightWidth: 1, borderRightColor: COLORS.hairline },
    stepRight: { borderLeftWidth: 1, borderLeftColor: COLORS.hairline },
    mealChipsRow: { flexDirection: 'row', gap: scaleSize(8) },
    mealChip: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(8),
        borderRadius: scaleSize(999),
        borderWidth: scaleSize(1),
        borderColor: COLORS.hairline,
        backgroundColor: theme.field,
    },
    mealChipActive: { backgroundColor: 'rgba(45,158,255,0.16)', borderColor: theme.primaryHairline },
    mealChipText: { color: COLORS.text, fontFamily: 'Outfit_700Bold', fontSize: scaleSize(12) },
    mealChipTextActive: { color: theme.primary },

    macroFourRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scaleSize(5) },
    ringBoxFour: { alignItems: 'center', justifyContent: 'center', paddingVertical: scaleSize(4), marginRight: scaleSize(12) },
    centerLabel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    centerCal: { color: COLORS.text, fontFamily: 'Outfit_800ExtraBold', fontSize: scaleSize(20) },
    centerSub: { color: COLORS.subtext, fontFamily: 'Outfit_700Bold', fontSize: scaleSize(13) },
    macroStat: { paddingVertical: scaleSize(2), paddingHorizontal: scaleSize(2), flexDirection: 'row', alignItems: 'center', gap: scaleSize(6) },
    macroStatDot: { width: scaleSize(8), height: scaleSize(8), borderRadius: scaleSize(4), marginRight: scaleSize(2) },
    macroStatLabel: { color: COLORS.subtext, fontFamily: 'Nunito_700Bold', fontSize: scaleSize(12) },
    macroStatValue: { color: COLORS.text, fontFamily: 'Outfit_800ExtraBold', fontSize: scaleSize(18) },
    sectionHeader: { paddingHorizontal: scaleSize(18), paddingVertical: scaleSize(12), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionHeaderText: { color: COLORS.subtext, fontFamily: 'Nunito_800ExtraBold', fontSize: scaleSize(13), letterSpacing: 0.3 },
    factsWrap: { paddingHorizontal: scaleSize(18), paddingVertical: scaleSize(14), gap: scaleSize(14) },
    factRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: scaleSize(47), paddingVertical: scaleSize(6) },
    factLabel: { color: COLORS.text, fontFamily: 'Nunito_700Bold', fontSize: scaleSize(14) },
    factValue: { color: COLORS.text, fontFamily: 'Outfit_800ExtraBold', fontSize: scaleSize(16), letterSpacing: 0.2 },
    factUnit: { color: COLORS.subtext, fontFamily: 'Outfit_700Bold', fontSize: scaleSize(12) },
    factRight: { alignItems: 'flex-end', minWidth: scaleSize(110), justifyContent: 'center' },
    factPercentSub: { color: COLORS.accentSoft, fontFamily: 'Outfit_800ExtraBold', fontSize: scaleSize(11), marginTop: scaleSize(2) },
    factsEmpty: { color: COLORS.subtext, fontFamily: 'Nunito_700Bold', fontSize: scaleSize(13), paddingVertical: scaleSize(6) },
});
