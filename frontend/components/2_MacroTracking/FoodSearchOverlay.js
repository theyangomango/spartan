// components/2_MacroTracking/FoodSearchOverlay.js
import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
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
    InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { CameraView } from 'expo-camera/next';
import SearchResultCard from './SearchResultCard';
import PortionPickerModal from './PortionPickerModal';
import QuickAddModal from './QuickAddModal';
import { searchFood, lookupBarcode } from '../../screens/fatsecretClient';
import { useNavigation } from '@react-navigation/native';

// 🔥 FIREBASE (adjust path if your firebase.config is elsewhere)
// No Firestore reads/writes for recent foods; build from global.userData.loggedFoods

import scaleSize from "../../helper/scaleSize";

export default function FoodSearchOverlay({
    visible,
    activeMeal,
    onClose,
    COLORS,
    onSelectResult, // parent still handles add + closing overlay
    dayKey, // pass focused day key so details screen can add to correct date
}) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
    const navigation = useNavigation();

    // ---- Recent foods state
    const [recentFoods, setRecentFoods] = useState([]);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    // ---- Barcode scanner state
    const [scannerVisible, setScannerVisible] = useState(false);
    const [permission, requestPermission] = Camera.useCameraPermissions();
    const [scanBusy, setScanBusy] = useState(false);
    const [scanError, setScanError] = useState('');
    const [scanLocked, setScanLocked] = useState(false); // throttle duplicate scans

    const loadRecentFoods = useCallback(async () => {
        try {
            const map = global?.userData?.loggedFoods || {};
            const entries = [];
            const pushEntry = (e) => {
                if (!e) return;
                entries.push({
                    id: String(e.foodId || e.name || ''),
                    foodId: e.foodId || '',
                    name: e.name || '',
                    brand: e.brand || '',
                    description: e.desc || '',
                    _ts: Number(e.updatedAt || e.createdAt || 0) || 0,
                });
            };
            const looksNested = Object.values(map)[0] && typeof Object.values(map)[0] === 'object' && !('dayKey' in Object.values(map)[0]);
            if (looksNested) {
                Object.values(map).forEach((byDay) => {
                    Object.values(byDay || {}).forEach(pushEntry);
                });
            } else {
                Object.values(map).forEach(pushEntry);
            }
            // Dedupe by id (foodId if present, else name)
            const seen = new Set();
            const uniq = [];
            entries.sort((a, b) => (b._ts || 0) - (a._ts || 0));
            for (const e of entries) {
                const key = String(e.foodId || e.name || '');
                if (!key || seen.has(key)) continue;
                seen.add(key);
                uniq.push(e);
                if (uniq.length >= 20) break;
            }
            setRecentFoods(uniq);
        } catch { setRecentFoods([]); }
    }, []);

    useEffect(() => {
        if (!visible) return;
        const task = InteractionManager.runAfterInteractions(() => {
            loadRecentFoods();
            // Reset state for a fresh session and focus the input after animation completes
            setQuery('');
            setResults([]);
            setLoading(false);
            // slight timeout to allow Modal to attach before focusing
            setTimeout(() => inputRef.current?.focus?.(), 40);
        });
        return () => task?.cancel?.();
    }, [visible, loadRecentFoods, (global?.__loggedFoodsSig || 0)]);

    // Debounced search to avoid spamming network and re-renders
    useEffect(() => {
        if (!visible) return;
        const q = (query || '').trim();
        if (q.length === 0) { setResults([]); setLoading(false); return; }
        let cancelled = false;
        const handle = setTimeout(async () => {
            try {
                setLoading(true);
                const res = await searchFood(q);
                if (cancelled) return;
                if (res?.foods && 'food' in res.foods) setResults(res.foods.food);
                else setResults([]);
            } catch {
                if (!cancelled) setResults([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(handle); };
    }, [query, visible]);

    /* ---------------- Portion picker (for search results) ---------------- */
    const [portionVisible, setPortionVisible] = useState(false);
    const [pendingFood, setPendingFood] = useState(null);
    const openPortion = (food) => { setPendingFood(food); setPortionVisible(true); };
    const cancelPortion = () => { setPortionVisible(false); setPendingFood(null); };

    /* ---------------- QUICK ADD (custom macros) ---------------- */
    const [quickVisible, setQuickVisible] = useState(false);
    const openQuick = () => setQuickVisible(true);
    const closeQuick = () => { Keyboard.dismiss(); setQuickVisible(false); };

    // ---- Renderers
    const goToDetails = useCallback((food) => {
        try { onClose?.(); } catch {}
        // Give the modal a tick to close before navigating, avoiding stacking it above
        setTimeout(() => {
            navigation.navigate('FoodDetail', {
                mode: 'add',
                food,
                mealName: activeMeal,
                dayKey,
            });
        }, 80);
    }, [navigation, onClose, activeMeal, dayKey]);

    const renderSearchItem = useCallback(({ item }) => (
        <SearchResultCard
            item={item}
            onPressPlus={() => openPortion(item)}
            onPressCard={() => goToDetails(item)}
            COLORS={COLORS}
        />
    ), [openPortion, goToDetails, COLORS]);

    const renderHistoryItem = useCallback(({ item }) => {
        const mapped = {
            food_id: item.foodId || item.id,
            food_name: item.name || '',
            brand_name: item.brand || '',
            food_description: item.description || '',
        };
        return (
            <SearchResultCard
                item={mapped}
                onPressPlus={() => openPortion(mapped)}
                onPressCard={() => goToDetails(mapped)}
                COLORS={COLORS}
            />
        );
    }, [openPortion, goToDetails, COLORS]);

    const HistoryFooter = () => {
        if (!visible) return null;
        if (!recentFoods?.length) return null;

        return (
            <View style={{ marginTop: scaleSize(10) }}>
                <Text style={styles.historyHeader}>Recent foods</Text>
                <FlatList
                    data={recentFoods}
                    keyExtractor={(it, idx) => String(it.id ?? idx)}
                    renderItem={renderHistoryItem}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingBottom: scaleSize(12) }}
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
            hardwareAccelerated
        >
            {/* Tap anywhere blank to dismiss keyboard */}
            <Pressable style={styles.overlayContainer} onPress={Keyboard.dismiss}>
                {/* Header */}
                <View style={styles.overlayHeader}>
                    {/* Left: barcode scanner trigger */}
                    <Pressable
                        style={styles.headerLeft}
                        onPress={async () => {
                            setScanError('');
                            if (!permission || !permission.granted) {
                                const perm = await requestPermission();
                                if (!perm?.granted) return;
                            }
                            setScannerVisible(true);
                            // dismiss keyboard to reduce jank
                            try { Keyboard.dismiss(); } catch {}
                        }}
                        hitSlop={8}
                        accessibilityLabel="Open barcode scanner"
                    >
                        <Ionicons name="barcode-outline" size={24} color={'#2D92FF'} />
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
                        <TextInput
                            ref={inputRef}
                            autoFocus={false}
                            placeholder="Search for a food..."
                            placeholderTextColor="#999"
                            value={query}
                            onChangeText={setQuery}
                            style={styles.searchInput}
                            returnKeyType="search"
                        />
                        {/* Close overlay button at end of input */}
                        <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close search overlay">
                            <Ionicons name="close" size={18} color="#999" style={{ marginLeft: scaleSize(10) }} />
                        </Pressable>
                    </View>
                </View>

                {/* Results + History */}
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <FlatList
                        contentContainerStyle={{ paddingBottom: scaleSize(24) }}
                        data={results}
                        keyExtractor={(item) => String(item.food_id)}
                        keyboardShouldPersistTaps="handled"
                        renderItem={renderSearchItem}
                        removeClippedSubviews
                        initialNumToRender={8}
                        windowSize={7}
                        maxToRenderPerBatch={8}
                        updateCellsBatchingPeriod={32}
                        keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>
                                {query ? (loading ? 'Searching…' : 'No results') : 'Start typing to search foods'}
                            </Text>
                        }
                        ListFooterComponent={<HistoryFooter />}
                    />
                </KeyboardAvoidingView>

                <PortionPickerModal
                    visible={portionVisible}
                    onCancel={cancelPortion}
                    onConfirm={(factor) => {
                        if (pendingFood) onSelectResult?.({ ...pendingFood, __portionMultiplier: factor });
                        setPortionVisible(false);
                        setPendingFood(null);
                    }}
                    COLORS={COLORS}
                />

                <QuickAddModal
                    visible={quickVisible}
                    onClose={closeQuick}
                    onSubmit={(item) => { onSelectResult?.(item); setQuickVisible(false); }}
                    COLORS={COLORS}
                />

                {/* Barcode Scanner Modal */}
                <Modal
                    visible={scannerVisible}
                    animationType="slide"
                    presentationStyle="fullScreen"
                    onRequestClose={() => { setScannerVisible(false); setScanBusy(false); setScanLocked(false); }}
                >
                    <View style={{ flex: 1, backgroundColor: 'black' }}>
                        {/* Camera */}
                        {permission?.granted ? (
                            <CameraView
                                style={{ flex: 1 }}
                                facing="back"
                                barcodeScannerSettings={{
                                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39']
                                }}
                                onBarcodeScanned={async (scan) => {
                                    if (!scan || scanLocked || scanBusy) return;
                                    const data = String(scan?.data || '').trim();
                                    if (!data) return;
                                    setScanLocked(true);
                                    setScanBusy(true);
                                    setScanError('');
                                    try {
                                        // Keep only digits; pad to GTIN-13 on server
                                        const digits = data.replace(/\D/g, '');
                                        if (!digits) {
                                            setScanError('Invalid barcode');
                                            setScanLocked(false);
                                            setScanBusy(false);
                                            return;
                                        }
                                        const resp = await lookupBarcode(digits);
                                        const food = resp?.food;
                                        if (food && food.food_id) {
                                            setScannerVisible(false);
                                            // Open details screen directly to add
                                            goToDetails(food);
                                        } else {
                                            setScanError('No match found for this barcode');
                                            setScanLocked(false);
                                        }
                                    } catch (e) {
                                        setScanError(String(e?.message || 'Lookup failed'));
                                        setScanLocked(false);
                                    } finally {
                                        setScanBusy(false);
                                    }
                                }}
                            >
                                {/* Overlay header */}
                                <View style={styles.scannerHeader}>
                                    <Pressable onPress={() => { setScannerVisible(false); setScanBusy(false); setScanLocked(false); }} hitSlop={12}>
                                        <Ionicons name="close" size={26} color="#fff" />
                                    </Pressable>
                                    <Text style={styles.scannerTitle}>Scan a barcode</Text>
                                    <View style={{ width: scaleSize(26) }} />
                                </View>
                                {/* Bottom hint */}
                                <View style={styles.scannerFooter}>
                                    <Text style={styles.scannerHint}>{scanBusy ? 'Looking up…' : (scanError || 'Align the barcode within the frame')}</Text>
                                </View>
                            </CameraView>
                        ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
                                <Text style={{ color: 'white', marginBottom: scaleSize(12), fontSize: scaleSize(14) }}>Camera permission is required</Text>
                                <Pressable
                                    onPress={requestPermission}
                                    style={{ paddingHorizontal: scaleSize(16), paddingVertical: scaleSize(10), backgroundColor: '#2D92FF', borderRadius: scaleSize(8) }}
                                >
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: scaleSize(14) }}>Grant Permission</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </Modal>
            </Pressable>
        </Modal>
    );
}

const makeStyles = (COLORS) =>
    StyleSheet.create({
        overlayContainer: { flex: 1, backgroundColor: COLORS.bg || COLORS.background || '#131521' },
        overlayHeader: {
            paddingTop: scaleSize(56),
            paddingBottom: scaleSize(12),
            paddingHorizontal: scaleSize(16),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: COLORS.bg || COLORS.background || '#131521',
            position: 'relative',          // <-- important for absolute title
        },
        headerLeft: {
            padding: scaleSize(6),
        },
        headerRight: {
            paddingHorizontal: scaleSize(6),
            paddingVertical: scaleSize(4),
        },
        titleCenterWrap: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: scaleSize(62),                        // matches paddingTop so it sits in the header line
            alignItems: 'center',
        },
        overlayTitle: {
            fontSize: scaleSize(17),
            color: COLORS.text || COLORS.textPrimary || '#E5E7EB',
            fontFamily: 'Outfit_600SemiBold',
        },
        headerActionText: {
            fontFamily: 'Outfit_600SemiBold',
            fontSize: scaleSize(14),
            color: '#2D92FF',
        },

        searchContainer: { paddingHorizontal: scaleSize(18), marginBottom: scaleSize(12) },
        searchBox: {
            backgroundColor: COLORS.fieldBg || COLORS.card || '#252733',
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: scaleSize(20),
            paddingHorizontal: scaleSize(14),
            paddingVertical: scaleSize(13),
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowOffset: { width: 0, height: scaleSize(1) },
            shadowRadius: scaleSize(3),
            elevation: 2,
        },
        searchInput: {
            flex: 1,
            fontFamily: 'Outfit_400Regular',
            fontSize: scaleSize(15),
            color: COLORS.text || COLORS.textPrimary || '#E5E7EB',
            paddingVertical: 0,
        },
        emptyText: {
            textAlign: 'center',
            marginTop: scaleSize(12),
            marginBottom: scaleSize(4),
            color: COLORS.subtext || COLORS.textSecondary || '#A1A7B3',
            fontFamily: 'Outfit_400Regular',
            fontSize: scaleSize(13),
        },
        historyHeader: {
            marginTop: scaleSize(8),
            marginBottom: scaleSize(8),
            paddingHorizontal: scaleSize(26),
            fontSize: scaleSize(14),
            color: COLORS.subtext || COLORS.textSecondary || '#A1A7B3',
            fontFamily: 'Outfit_600SemiBold',
        },

        // Modal-related styles moved to extracted components
        scannerHeader: {
            position: 'absolute',
            top: scaleSize(54),
            left: scaleSize(16),
            right: scaleSize(16),
            zIndex: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        scannerTitle: {
            color: '#fff',
            fontSize: scaleSize(16),
            fontFamily: 'Outfit_600SemiBold',
        },
        scannerFooter: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: scaleSize(48),
            alignItems: 'center',
        },
        scannerHint: {
            color: 'rgba(255,255,255,0.9)',
            fontSize: scaleSize(14),
            paddingHorizontal: scaleSize(16),
            paddingVertical: scaleSize(8),
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: scaleSize(12),
            overflow: 'hidden'
        }
    });
