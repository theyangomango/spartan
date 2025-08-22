// components/2_MacroTracking/FoodSearchOverlay.js
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    Modal,
    KeyboardAvoidingView,
    Platform,
    FlatList,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RNBounceable from '@freakycoder/react-native-bounceable';
import SearchResultCard from './SearchResultCard';

// 🔥 FIREBASE (adjust path if your firebase.config is elsewhere)
import { db } from '../../../firebase.config';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';

export default function FoodSearchOverlay({
    visible,
    activeMeal,
    searchQuery,
    setSearchQuery,
    searchResults,
    onClose,
    COLORS,
    onSelectResult, // parent still handles add + closing overlay
}) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

    // ---- Recent foods state
    const [recentFoods, setRecentFoods] = useState([]);

    const loadRecentFoods = useCallback(async () => {
        try {
            const userId = global?.userData?.id || global?.userData?.uid;
            if (!userId) return;

            // users/{uid}/recentFoods : { name, brand, description, foodId, usedCount, lastUsedAt }
            const recentRef = collection(db, 'users', userId, 'recentFoods');
            const qy = query(recentRef, orderBy('lastUsedAt', 'desc'), limit(20));
            const snap = await getDocs(qy);

            const items = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() || {}),
            }));

            setRecentFoods(items);
        } catch {
            setRecentFoods([]);
        }
    }, []);

    useEffect(() => {
        if (!visible) return;
        loadRecentFoods();
    }, [visible, loadRecentFoods]);

    /* ---------------- Portion parse helper (fractions/decimals) ---------------- */
    const parsePortion = (s) => {
        const t = String(s || '').trim();
        if (!t) return 1;
        if (t.includes('/')) {
            const [a, b] = t.split('/').map((x) => parseFloat(x));
            const v = (a && b) ? (a / b) : NaN;
            return Number.isFinite(v) && v > 0 ? v : 1;
        }
        const v = parseFloat(t);
        return Number.isFinite(v) && v > 0 ? v : 1;
    };

    /* ---------------- Portion picker (for search results) ---------------- */
    const [portionVisible, setPortionVisible] = useState(false);
    const [pendingFood, setPendingFood] = useState(null);
    const [portionInput, setPortionInput] = useState('1');
    const openPortion = (food) => {
        setPendingFood(food);
        setPortionInput('1');
        setPortionVisible(true);
    };
    const cancelPortion = () => {
        setPortionVisible(false);
        setPendingFood(null);
    };
    const quickSet = (v) => setPortionInput(v);
    const confirmPortion = () => {
        const factor = parsePortion(portionInput);
        onSelectResult?.({ ...pendingFood, __portionMultiplier: factor });
        setPortionVisible(false);
        setPendingFood(null);
    };

    /* ---------------- QUICK ADD (custom macros) ---------------- */
    const [quickVisible, setQuickVisible] = useState(false);
    const [qaName, setQaName] = useState('');
    const [qaBrand, setQaBrand] = useState('');
    const [qaCalories, setQaCalories] = useState('');
    const [qaProtein, setQaProtein] = useState('');
    const [qaCarbs, setQaCarbs] = useState('');
    const [qaFat, setQaFat] = useState('');
    const [qaPortion, setQaPortion] = useState('1');

    const openQuick = () => {
        setQaName('');
        setQaBrand('');
        setQaCalories('');
        setQaProtein('');
        setQaCarbs('');
        setQaFat('');
        setQaPortion('1');
        setQuickVisible(true);
    };
    const closeQuick = () => {
        Keyboard.dismiss();
        setQuickVisible(false);
    };

    const num = (s) => {
        const n = parseFloat(String(s || '').replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    };

    const submitQuickAdd = () => {
        const name = qaName?.trim() || 'Custom item';
        const brand = qaBrand?.trim() || '';
        const cals = Math.max(0, num(qaCalories));
        const prot = Math.max(0, num(qaProtein));
        const carbs = Math.max(0, num(qaCarbs));
        const fat = Math.max(0, num(qaFat));
        const factor = parsePortion(qaPortion);

        // Build a parser-friendly description
        const desc = `Calories: ${cals}, Protein: ${prot} g, Carbs: ${carbs} g, Fat: ${fat} g`;

        const item = {
            food_id: `custom-${Date.now()}`,
            food_name: name,
            brand_name: brand,
            food_description: desc,
            source: 'custom',
            __portionMultiplier: factor,
        };

        onSelectResult?.(item);
        setQuickVisible(false);
    };

    // ---- Renderers
    const renderSearchItem = ({ item }) => (
        <SearchResultCard item={item} onPressPlus={() => openPortion(item)} />
    );

    const renderHistoryItem = ({ item }) => {
        const mapped = {
            food_id: item.foodId || item.id,
            food_name: item.name || '',
            brand_name: item.brand || '',
            food_description: item.description || '',
        };
        return <SearchResultCard item={mapped} onPressPlus={() => openPortion(mapped)} />;
    };

    const HistoryFooter = () => {
        if (!visible || (searchQuery && searchQuery.trim().length > 0)) return null;
        if (!recentFoods?.length) return null;

        return (
            <View style={{ marginTop: 10 }}>
                <Text style={styles.historyHeader}>Recent foods</Text>
                <FlatList
                    data={recentFoods}
                    keyExtractor={(it, idx) => String(it.id ?? idx)}
                    renderItem={renderHistoryItem}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingBottom: 12 }}
                />
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            {/* Tap anywhere blank to dismiss keyboard */}
            <Pressable style={styles.overlayContainer} onPress={Keyboard.dismiss}>
                {/* Header */}
                <View style={styles.overlayHeader}>
                    {/* Left: back */}
                    <Pressable onPress={onClose} hitSlop={10} style={styles.headerLeft}>
                        <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
                    </Pressable>

                    {/* Centered title (absolute so it stays centered regardless of right content width) */}
                    <View style={styles.titleCenterWrap} pointerEvents="none">
                        <Text style={styles.overlayTitle}>
                            {activeMeal ? `Add to ${activeMeal}` : 'Add food'}
                        </Text>
                    </View>

                    {/* Right: Quick Add */}
                    <Pressable onPress={openQuick} hitSlop={8} style={styles.headerRight}>
                        <Text style={styles.headerActionText}>Quick Add</Text>
                    </Pressable>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={18} color="#999" style={{ marginRight: 10 }} />
                        <TextInput
                            autoFocus
                            placeholder="Search for a food..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={styles.searchInput}
                            returnKeyType="search"
                        />
                        {searchQuery?.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#999" style={{ marginRight: 5 }} />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Results + History */}
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <FlatList
                        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
                        data={searchResults}
                        keyExtractor={(item) => String(item.food_id)}
                        keyboardShouldPersistTaps="handled"
                        renderItem={renderSearchItem}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'Searching…' : 'Start typing to search foods'}
                            </Text>
                        }
                        ListFooterComponent={<HistoryFooter />}
                    />
                </KeyboardAvoidingView>

                {/* -------- Portion Picker (for search results) -------- */}
                <Modal
                    visible={portionVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={cancelPortion}
                >
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>How much did you eat?</Text>

                            <View style={styles.quickRow}>
                                {['1/4', '1/3', '1/2', '2/3', '3/4', '1'].map((v) => (
                                    <RNBounceable
                                        key={v}
                                        style={[styles.chip, portionInput === v && styles.chipActive]}
                                        onPress={() => quickSet(v)}
                                    >
                                        <Text style={[styles.chipText, portionInput === v && styles.chipTextActive]}>
                                            {v}
                                        </Text>
                                    </RNBounceable>
                                ))}
                            </View>

                            <View style={styles.customRow}>
                                <Text style={styles.customLabel}>Custom</Text>
                                <TextInput
                                    value={portionInput}
                                    onChangeText={setPortionInput}
                                    placeholder="e.g. 0.4 or 1/3"
                                    placeholderTextColor="#aaa"
                                    style={styles.customInput}
                                    keyboardType="decimal-pad"
                                />
                            </View>

                            <View style={styles.modalButtons}>
                                <RNBounceable style={[styles.modalBtn, styles.cancelBtn]} onPress={cancelPortion}>
                                    <Text style={[styles.modalBtnText, styles.cancelBtnText]}>Cancel</Text>
                                </RNBounceable>
                                <RNBounceable
                                    style={[styles.modalBtn, styles.confirmBtn]}
                                    onPress={confirmPortion}
                                >
                                    <Text style={[styles.modalBtnText, styles.confirmBtnText]}>Add</Text>
                                </RNBounceable>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* -------- QUICK ADD modal (custom macros) -------- */}
                <Modal
                    visible={quickVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={closeQuick}
                >
                    {/* Backdrop: tap to close quick add */}
                    <Pressable style={styles.modalBackdrop} onPress={closeQuick}>
                        {/* Card: tap inside to dismiss keyboard only */}
                        <Pressable style={styles.modalCard} onPress={Keyboard.dismiss}>
                            <Text style={styles.modalTitle}>Quick add</Text>

                            <Text style={styles.inputLabel}>Name</Text>
                            <TextInput
                                value={qaName}
                                onChangeText={setQaName}
                                placeholder="e.g., Homemade smoothie"
                                placeholderTextColor="#aaa"
                                style={styles.inputField}
                            />

                            <Text style={styles.inputLabel}>Brand (optional)</Text>
                            <TextInput
                                value={qaBrand}
                                onChangeText={setQaBrand}
                                placeholder="e.g., Custom"
                                placeholderTextColor="#aaa"
                                style={styles.inputField}
                            />

                            <View style={styles.row2}>
                                <View style={styles.col}>
                                    <Text style={styles.inputLabel}>Calories</Text>
                                    <TextInput
                                        value={qaCalories}
                                        onChangeText={setQaCalories}
                                        placeholder="kcal"
                                        placeholderTextColor="#aaa"
                                        style={styles.inputField}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.col}>
                                    <Text style={styles.inputLabel}>Protein</Text>
                                    <TextInput
                                        value={qaProtein}
                                        onChangeText={setQaProtein}
                                        placeholder="g"
                                        placeholderTextColor="#aaa"
                                        style={styles.inputField}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={styles.row2}>
                                <View className="col" style={styles.col}>
                                    <Text style={styles.inputLabel}>Carbs</Text>
                                    <TextInput
                                        value={qaCarbs}
                                        onChangeText={setQaCarbs}
                                        placeholder="g"
                                        placeholderTextColor="#aaa"
                                        style={styles.inputField}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.col}>
                                    <Text style={styles.inputLabel}>Fat</Text>
                                    <TextInput
                                        value={qaFat}
                                        onChangeText={setQaFat}
                                        placeholder="g"
                                        placeholderTextColor="#aaa"
                                        style={styles.inputField}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <Text style={[styles.inputLabel, { marginTop: 6 }]}>Portion</Text>
                            <View style={styles.quickRow}>
                                {['1/4', '1/3', '1/2', '2/3', '3/4', '1'].map((v) => (
                                    <RNBounceable
                                        key={v}
                                        style={[styles.chip, qaPortion === v && styles.chipActive]}
                                        onPress={() => setQaPortion(v)}
                                    >
                                        <Text style={[styles.chipText, qaPortion === v && styles.chipTextActive]}>
                                            {v}
                                        </Text>
                                    </RNBounceable>
                                ))}
                            </View>

                            <View style={styles.customRow}>
                                <Text style={styles.customLabel}>Custom</Text>
                                <TextInput
                                    value={qaPortion}
                                    onChangeText={setQaPortion}
                                    placeholder="e.g. 0.5 or 1/3"
                                    placeholderTextColor="#aaa"
                                    style={styles.customInput}
                                    keyboardType="decimal-pad"
                                />
                            </View>

                            <View style={styles.modalButtons}>
                                <RNBounceable style={[styles.modalBtn, styles.cancelBtn]} onPress={closeQuick}>
                                    <Text style={[styles.modalBtnText, styles.cancelBtnText]}>Cancel</Text>
                                </RNBounceable>
                                <RNBounceable style={[styles.modalBtn, styles.confirmBtn]} onPress={submitQuickAdd}>
                                    <Text style={[styles.modalBtnText, styles.confirmBtnText]}>Add</Text>
                                </RNBounceable>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>
            </Pressable>
        </Modal>
    );
}

const makeStyles = (COLORS) =>
    StyleSheet.create({
        overlayContainer: { flex: 1, backgroundColor: COLORS.background },
        overlayHeader: {
            paddingTop: 56,
            paddingBottom: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: COLORS.background,
            position: 'relative',          // <-- important for absolute title
        },
        headerLeft: {
            padding: 6,
        },
        headerRight: {
            paddingHorizontal: 6,
            paddingVertical: 4,
        },
        titleCenterWrap: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 62,                        // matches paddingTop so it sits in the header line
            alignItems: 'center',
        },
        overlayTitle: {
            fontSize: 18,
            color: COLORS.textPrimary,
            fontFamily: 'Outfit_600SemiBold',
        },
        headerActionText: {
            fontFamily: 'Outfit_600SemiBold',
            fontSize: 14,
            color: '#2D92FF',
        },

        searchContainer: { paddingHorizontal: 18, marginBottom: 12 },
        searchBox: {
            backgroundColor: '#fff',
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 13,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 3,
            elevation: 2,
        },
        searchInput: {
            flex: 1,
            fontFamily: 'Outfit_400Regular',
            fontSize: 15,
            color: COLORS.textPrimary,
            paddingVertical: 0,
        },
        emptyText: {
            textAlign: 'center',
            marginTop: 12,
            marginBottom: 4,
            color: COLORS.textSecondary,
            fontFamily: 'Outfit_400Regular',
        },
        historyHeader: {
            marginTop: 8,
            marginBottom: 8,
            paddingHorizontal: 2,
            fontSize: 14,
            color: COLORS.textSecondary,
            fontFamily: 'Outfit_600SemiBold',
        },

        /* Shared modal styles */
        modalBackdrop: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
        },
        modalCard: {
            width: '86%',
            backgroundColor: '#fff',
            borderRadius: 18,
            paddingVertical: 18,
            paddingHorizontal: 16,
        },
        modalTitle: {
            fontFamily: 'Outfit_600SemiBold',
            fontSize: 16,
            color: '#111',
            marginBottom: 12,
        },
        quickRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 12,
        },
        chip: {
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: '#f1f4f7',
        },
        chipActive: { backgroundColor: '#dbeafe' },
        chipText: { fontFamily: 'Outfit_500Medium', color: '#333' },
        chipTextActive: { color: '#1d4ed8' },
        customRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
        },
        customLabel: { fontFamily: 'Outfit_500Medium', color: '#555' },
        customInput: {
            flex: 1,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: '#f6f6f6',
            fontFamily: 'Outfit_500Medium',
            color: '#111',
        },
        modalButtons: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 10,
        },
        modalBtn: {
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 10,
        },
        cancelBtn: { backgroundColor: '#efefef' },
        confirmBtn: { backgroundColor: '#55A8FF' },
        modalBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 14 },
        cancelBtnText: { color: '#333' },
        confirmBtnText: { color: '#fff' },

        // Quick add inputs
        inputLabel: {
            fontFamily: 'Outfit_600SemiBold',
            color: '#333',
            marginBottom: 6,
            marginTop: 4,
            fontSize: 12.5,
        },
        inputField: {
            backgroundColor: '#f6f6f6',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontFamily: 'Outfit_500Medium',
            color: '#111',
            marginBottom: 10,
        },
        row2: { flexDirection: 'row', gap: 10 },
        col: { flex: 1 },
    });
