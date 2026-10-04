// screens/FoodDetail.js
import React, { useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StatusBar, SafeAreaView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, serverTimestamp, setDoc, deleteField } from 'firebase/firestore';

import { db } from '../../firebase.config';
import { touchRecentFood } from '../utils/recentFoods';
import { parseMacrosFromDescription, parseExtraNutrientsFromDescription } from '../utils/nutrition';
import { makeFoodFavoriteKey } from '../utils/favoriteFoods';
import { strong as haptic } from '../utils/haptics';
import scaleSize from "../helper/scaleSize";
import DismissableTextInput from "../components/common/DismissableTextInput";
import styles, { COLORS } from './foodDetail/foodDetailStyles';
import FavoriteFoodButton from './foodDetail/FavoriteFoodButton';
import MacroRow from './foodDetail/MacroRow';
import NutritionFacts from './foodDetail/NutritionFacts';
import useFoodExtrasPerServing from './foodDetail/useFoodExtrasPerServing';

const round2 = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.round(x * 100) / 100;
};

const MEAL_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function FoodDetail({ navigation, route }) {
    const mode = route?.params?.mode || 'edit'; // 'edit' | 'add'
    const readOnly = !!route?.params?.readOnly;
    const food = route?.params?.food || null;   // FatSecret-shaped when adding
    const entry = route?.params?.entry || {};
    const mealNameInit = route?.params?.mealName || 'Dinner';
    const dayKey = route?.params?.dayKey || '';
    const [servings, setServings] = useState(() => {
        const n = Number(entry?.quantity ?? entry?.qty ?? 1);
        return Number.isFinite(n) && n > 0 ? n : 1;
    });
    const [meal, setMeal] = useState(mealNameInit);
    const [showDiscardChangesModal, setShowDiscardChangesModal] = useState(false);
    const initialServingsRef = useRef((() => {
        const n = Number(entry?.quantity ?? entry?.qty ?? 1);
        return Number.isFinite(n) && n > 0 ? round2(n) : 1;
    })());
    const initialMealRef = useRef(String(mealNameInit || 'Dinner'));
    // Choose description source based on mode

    const baseDesc = mode === 'add' ? (food?.food_description || '') : (entry?.desc || '');
    const displayName = mode === 'add' ? (food?.food_name || 'Food Item') : (entry?.name || 'Food Item');
    const displayBrand = mode === 'add' ? (food?.brand_name || '') : (entry?.brand || '');
    const macros = useMemo(() => {
        const qty = round2(Number(servings) || 1);
        return parseMacrosFromDescription(baseDesc, qty);
    }, [baseDesc, servings]);
    const extrasPS = useFoodExtrasPerServing(mode, food, entry);

    const favoritePayload = useMemo(() => ({
        foodId: String(mode === 'add' ? (food?.food_id || '') : (entry?.foodId || entry?.food_id || '')).trim(),
        name: String(mode === 'add' ? (food?.food_name || '') : (entry?.name || '')).trim(),
        brand: String(mode === 'add' ? (food?.brand_name || '') : (entry?.brand || '')).trim(),
        description: String(mode === 'add' ? (food?.food_description || '') : (entry?.desc || '')).trim(),
    }), [mode, food?.food_id, food?.food_name, food?.brand_name, food?.food_description, entry?.foodId, entry?.food_id, entry?.name, entry?.brand, entry?.desc]);

    const favoriteKey = useMemo(
        () => makeFoodFavoriteKey(favoritePayload),
        [favoritePayload],
    );

    const extras = useMemo(() => {
        const qty = round2(Number(servings) || 1);
        if (extrasPS) {
            return {
                sugar_g: extrasPS.sugar_g == null ? null : extrasPS.sugar_g * qty,
                added_sugars: extrasPS.added_sugars == null ? null : extrasPS.added_sugars * qty,
                fiber_g: extrasPS.fiber_g == null ? null : extrasPS.fiber_g * qty,
                sodium_mg: extrasPS.sodium_mg == null ? null : extrasPS.sodium_mg * qty,
                potassium_mg: extrasPS.potassium_mg == null ? null : extrasPS.potassium_mg * qty,
                satFat_g: extrasPS.satFat_g == null ? null : extrasPS.satFat_g * qty,
                transFat_g: extrasPS.transFat_g == null ? null : extrasPS.transFat_g * qty,
                monoFat_g: extrasPS.monoFat_g == null ? null : extrasPS.monoFat_g * qty,
                polyFat_g: extrasPS.polyFat_g == null ? null : extrasPS.polyFat_g * qty,
                cholesterol_mg: extrasPS.cholesterol_mg == null ? null : extrasPS.cholesterol_mg * qty,
                vitamin_d: extrasPS.vitamin_d == null ? null : extrasPS.vitamin_d * qty,
                vitamin_a: extrasPS.vitamin_a == null ? null : extrasPS.vitamin_a * qty,
                vitamin_c: extrasPS.vitamin_c == null ? null : extrasPS.vitamin_c * qty,
                calcium: extrasPS.calcium == null ? null : extrasPS.calcium * qty,
                iron: extrasPS.iron == null ? null : extrasPS.iron * qty,
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

    const currentServingsForCompare = useMemo(() => {
        const n = Number(servings);
        return Number.isFinite(n) && n > 0 ? round2(n) : null;
    }, [servings]);

    const hasUnsavedChanges = useMemo(() => {
        if (readOnly || mode !== 'edit') return false;
        const currentMeal = String(meal || '').trim();
        const initialMeal = String(initialMealRef.current || '').trim();
        const mealChanged = currentMeal !== initialMeal;
        const servingChanged = currentServingsForCompare == null
            ? String(servings ?? '') !== String(initialServingsRef.current)
            : currentServingsForCompare !== initialServingsRef.current;
        return mealChanged || servingChanged;
    }, [readOnly, mode, meal, servings, currentServingsForCompare]);

    const handleCloseDiscardChangesModal = useCallback(() => {
        setShowDiscardChangesModal(false);
    }, []);

    const handleDiscardChanges = useCallback(() => {
        setShowDiscardChangesModal(false);
        try { navigation.goBack(); } catch { }
    }, [navigation]);

    const handleBackPress = useCallback(() => {
        if (hasUnsavedChanges) {
            setShowDiscardChangesModal(true);
            return;
        }
        try { navigation.goBack(); } catch { }
    }, [hasUnsavedChanges, navigation]);

    const adjust = (delta) => {
        if (readOnly) return;
        setServings((s) => {
            let v = round2((Number(s) || 0) + delta);
            if (!Number.isFinite(v) || v <= 0) v = 0.5;
            return v;
        });
    };

    const onChangeText = (t) => {
        if (readOnly) return;
        // Allow intermediate decimal input states like "." or "1."
        // 1) strip invalid chars, 2) keep only first dot, 3) store as string
        let v = String(t).replace(/[^0-9.]/g, '');
        if (v === '') { setServings(''); return; }
        const firstDot = v.indexOf('.');
        if (firstDot !== -1) {
            v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
        }
        // Accept single "." or numbers like "1." or "1.5"
        if (/^\d*\.?\d*$/.test(v)) {
            setServings(v);
        }
    };

    const save = () => {
        if (!entry?.key || !dayKey) { try { navigation.goBack(); } catch { } return; }
        const uid = global?.userData?.uid || global?.userData?.id;
        if (!uid) { try { navigation.goBack(); } catch { } return; }

        // Build patch synchronously and optimistically update local mirror for instant UI
        const qty = round2(Number(servings) || 1);
        const m = parseMacrosFromDescription(entry?.desc || '', qty);
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

        try {
            global.userData = global.userData || {};
            const map = (global.userData.loggedFoods = global.userData.loggedFoods || {});
            if (map[dayKey] && typeof map[dayKey] === 'object') {
                map[dayKey][entry.key] = { ...(map[dayKey][entry.key] || {}), ...patch };
            } else {
                map[entry.key] = { ...(map[entry.key] || {}), ...patch };
            }
            try { global.__loggedFoodsSig = (global.__loggedFoodsSig || 0) + 1; } catch { }
        } catch { }

        // Navigate back immediately
        try { navigation.goBack(); } catch { }

        // Persist in background
        (async () => {
            try {
                const uref = doc(db, 'usersPrivate', uid);
                const fieldPath = `loggedFoods.${dayKey}.${entry.key}`;
                await updateDoc(uref, {
                    [fieldPath]: {
                        ...patch,
                        updatedAt: serverTimestamp(),
                    }
                });
                // remove any legacy flat key if present
                const flatPath = `loggedFoods.${entry.key}`;
                await updateDoc(uref, { [flatPath]: deleteField() }).catch(() => { });
                // Touch recent foods
                await touchRecentFood(uid, {
                    foodId: entry?.foodId || entry?.food_id || '',
                    name: entry?.name || '',
                    brand: entry?.brand || '',
                    description: entry?.desc || '',
                }, extrasPS || null).catch(() => { });
            } catch (e) {
                console.log('Failed to update food entry (async):', e?.message || e);
            }
        })();
    };

    const addNew = () => {
        const uid = global?.userData?.uid || global?.userData?.id;
        if (!uid || !dayKey || !food) { try { navigation.goBack(); } catch { } return; }

        // Build flat entry synchronously for instant UI update
        const qty = round2(Number(servings) || 1);
        const m = parseMacrosFromDescription(food?.food_description || '', qty);
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

        // Optimistic global mirror update (immediate UI feedback)
        try {
            global.userData = global.userData || {};
            const map = (global.userData.loggedFoods = global.userData.loggedFoods || {});
            map[dayKey] = map[dayKey] || {};
            map[dayKey][newId] = { ...flat, createdAt: Date.now(), updatedAt: Date.now() };
            try { global.__loggedFoodsSig = (global.__loggedFoodsSig || 0) + 1; } catch { }
        } catch { }

        // Navigate back instantly; persist in background
        try { navigation.goBack(); } catch { }

        // Persist to Firestore + recent foods asynchronously
        (async () => {
            try {
                const uref = doc(db, 'usersPrivate', uid);
                const fieldPath = `loggedFoods.${dayKey}.${newId}`;
                await updateDoc(uref, { [fieldPath]: flat });
            } catch {
                try {
                    await setDoc(doc(db, 'usersPrivate', uid), { loggedFoods: { [dayKey]: { [newId]: flat } } }, { merge: true });
                } catch { }
            }
            try {
                await touchRecentFood(uid, { foodId: flat.foodId, name: flat.name, brand: flat.brand, description: flat.desc }, extrasPS || null);
            } catch { }
        })().catch((e) => console.log('Add food async error:', e?.message || e));
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            {/* Header inside safe area */}
            <View style={[styles.header, styles.headerScreenOffset]}>
                <Pressable style={styles.backBtn} onPress={handleBackPress} hitSlop={8}>
                    <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {readOnly ? 'Food Details' : (mode === 'add' ? 'Add Food' : 'Edit Food')}
                </Text>
                {readOnly ? (
                    <View style={styles.saveBtn} />
                ) : mode === 'add' ? (
                    <Pressable style={styles.saveBtn} onPress={() => { try { haptic(); } catch { } addNew(); }} hitSlop={8}>
                        <Ionicons name="add" size={22} color={COLORS.text} />
                    </Pressable>
                ) : (
                    <Pressable style={styles.saveBtn} onPress={() => { try { haptic(); } catch { } save(); }} hitSlop={8}>
                        <Ionicons name="checkmark" size={22} color={COLORS.text} />
                    </Pressable>
                )}
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: scaleSize(24) }} showsVerticalScrollIndicator={false}>
                {/* Top summary section spanning full width */}
                <View style={styles.topSummary}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={2}>{displayName}</Text>
                        <FavoriteFoodButton favoritePayload={favoritePayload} favoriteKey={favoriteKey} />
                    </View>
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
                    <View style={[styles.inputWrap, readOnly && styles.inputWrapReadOnly]}>
                        <Pressable
                            style={[styles.stepBtn, styles.stepLeft, readOnly && styles.stepBtnDisabled]}
                            onPress={!readOnly ? () => { try { haptic(); } catch { } adjust(-0.5); } : undefined}
                            disabled={readOnly}
                        >
                            <Ionicons name="remove" size={16} color={COLORS.text} />
                        </Pressable>
                        <DismissableTextInput
                            value={String(servings)}
                            onChangeText={onChangeText}
                            onBlur={!readOnly ? () => {
                                if (servings === '') return;
                                setServings((s) => round2(Number(s) || 0) || 1);
                            } : undefined}
                            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                            inputMode="decimal"
                            style={styles.input}
                            placeholder="1"
                            placeholderTextColor={COLORS.subtext}
                            returnKeyType="done"
                            editable={!readOnly}
                            selectTextOnFocus={!readOnly}
                            pointerEvents={readOnly ? 'none' : 'auto'}
                        />
                        <Pressable
                            style={[styles.stepBtn, styles.stepRight, readOnly && styles.stepBtnDisabled]}
                            onPress={!readOnly ? () => { try { haptic(); } catch { } adjust(+0.5); } : undefined}
                            disabled={readOnly}
                        >
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
                                onPress={!readOnly ? () => { try { haptic(); } catch { } setMeal(opt); } : undefined}
                                disabled={readOnly}
                                style={[styles.mealChip, meal === opt && styles.mealChipActive, readOnly && meal !== opt && styles.mealChipReadOnly]}
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

                {/* Nutrition facts */}
                <NutritionFacts extras={extras} />
            </ScrollView>
            <Modal
                transparent
                visible={showDiscardChangesModal}
                animationType="fade"
                onRequestClose={handleCloseDiscardChangesModal}
            >
                <Pressable style={styles.confirmBackdrop} onPress={handleCloseDiscardChangesModal}>
                    <Pressable style={styles.confirmCard}>
                        <Text style={styles.confirmTitle}>Discard changes?</Text>
                        <Text style={styles.confirmMessage}>
                            You have unsaved edits on this food item.
                        </Text>
                        <View style={styles.confirmActions}>
                            <Pressable
                                style={[styles.confirmBtn, styles.confirmBtnCancel]}
                                onPress={() => {
                                    try { haptic(); } catch { }
                                    handleCloseDiscardChangesModal();
                                }}
                            >
                                <Text style={[styles.confirmBtnText, styles.confirmBtnCancelText]}>Keep Editing</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.confirmBtn, styles.confirmBtnDestructive]}
                                onPress={() => {
                                    try { haptic(); } catch { }
                                    handleDiscardChanges();
                                }}
                            >
                                <Text style={[styles.confirmBtnText, styles.confirmBtnDestructiveText]}>Discard</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
