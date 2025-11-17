// components/2_MacroTracking/FoodSearchOverlay.js
import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Modal,
    KeyboardAvoidingView,
    Platform,
    FlatList,
    Keyboard,
    BackHandler,
    InteractionManager,
    ActivityIndicator,
    AppState,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Camera } from 'expo-camera';
import { CameraView } from 'expo-camera/next';
import { runOnJS, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import SearchResultCard from './SearchResultCard';
import PortionPickerModal from './PortionPickerModal';
import QuickAddModal from './QuickAddModal';
import { searchFood, lookupBarcode } from '../../screens/fatsecretClient';
import { useNavigation } from '@react-navigation/native';
import { fetchRecentFoods, deleteRecentFood } from '../../utils/recentFoods';

// 🔥 FIREBASE (adjust path if your firebase.config is elsewhere)
// Recent foods now backed by Firestore subcollection users/{uid}/recentFoods

import scaleSize from "../../helper/scaleSize";
import { strong as haptic } from '../../utils/haptics';
import DismissableTextInput from '../common/DismissableTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const foodKey = (item) => {
    if (!item) return '';
    const id = String(item.food_id ?? item.id ?? '').trim();
    if (id) return id;
    const name = String(item.food_name ?? item.name ?? '').trim().toLowerCase();
    const brand = String(item.brand_name ?? item.brand ?? '').trim().toLowerCase();
    if (!name && !brand) return '';
    return `${name}|${brand}`;
};

const mergeUniqueFoods = (prev = [], next = []) => {
    const merged = Array.isArray(prev) ? [...prev] : [];
    const seen = new Set();
    for (const item of merged) {
        const key = foodKey(item);
        if (key) seen.add(key);
    }
    if (!Array.isArray(next)) return merged;
    for (const item of next) {
        if (!item) continue;
        const key = foodKey(item);
        if (!key) {
            merged.push(item);
            continue;
        }
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
    }
    return merged;
};

const SCAN_RETRY_DELAY_MS = 500;

export default function FoodSearchOverlay({
    visible,
    activeMeal,
    onClose,
    COLORS,
    onSelectResult, // parent still handles add + closing overlay
    dayKey, // pass focused day key so details screen can add to correct date
    scannerAutoOpenKey = null,
    onScannerAutoOpenComplete,
}) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const sheetRef = useRef(null);
    const [sheetMounted, setSheetMounted] = useState(visible);
    const [headerMealTitle, setHeaderMealTitle] = useState(activeMeal || '');
    const shouldRenderSheet = sheetMounted || visible;
    const sheetSnapPoints = useMemo(() => ['96%'], []);
    const sheetAnimatedIndex = useSharedValue(visible ? 0 : -1);
    const headerPaddingTop = 0
    const headerTitleOffset = useMemo(
        () => headerPaddingTop + scaleSize(6),
        [headerPaddingTop],
    );
    const sheetBottomPadding = useMemo(
        () => Math.max(scaleSize(24), (insets?.bottom || 0) + scaleSize(16)),
        [insets?.bottom],
    );

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                pressBehavior="close"
                opacity={0.45}
            />
        ),
        [],
    );

    useEffect(() => {
        if (activeMeal) {
            setHeaderMealTitle(activeMeal);
        } else if (!visible) {
            setHeaderMealTitle('');
        }
    }, [activeMeal, visible]);

    useEffect(() => {
        if (visible) {
            setSheetMounted(true);
            return;
        }
        const timer = setTimeout(() => setSheetMounted(false), 320);
        return () => clearTimeout(timer);
    }, [visible]);

    useEffect(() => {
        if (!shouldRenderSheet) return;
        const schedule = typeof requestAnimationFrame === 'function'
            ? requestAnimationFrame
            : (cb) => setTimeout(cb, 0);
        schedule(() => {
            try {
                if (visible) sheetRef.current?.snapToIndex?.(0);
                else sheetRef.current?.close?.();
            } catch { }
        });
    }, [visible, shouldRenderSheet]);

    useEffect(() => {
        if (!visible) return undefined;
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            onClose?.();
            return true;
        });
        return () => subscription.remove();
    }, [visible, onClose]);

    const dismissKeyboardNow = useCallback(() => {
        try { Keyboard.dismiss(); } catch {}
    }, []);

    useAnimatedReaction(
        () => sheetAnimatedIndex.value,
        (current, previous) => {
            if (previous == null) return;
            if (current < 0 && previous >= 0) {
                runOnJS(dismissKeyboardNow)();
            }
        },
        [dismissKeyboardNow],
    );

    // ---- Recent foods state
    const [recentFoods, setRecentFoods] = useState([]);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(0);
    const [loadingMorePage, setLoadingMorePage] = useState(null);
    const inputRef = useRef(null);
    const searchTokenRef = useRef(0);
    const latestQueryRef = useRef('');

    // ---- Barcode scanner state
    const [scannerVisible, setScannerVisible] = useState(false);
    const [permission, requestPermission, getPermission] = Camera.useCameraPermissions();
    const [scanBusy, setScanBusy] = useState(false);
    const [scanError, setScanError] = useState('');
    const [scanLocked, setScanLocked] = useState(false); // throttle duplicate scans
    const scanRetryTimeoutRef = useRef(null);
    const autoOpenScheduledKeyRef = useRef(null);
    const autoOpenTimerRef = useRef(null);
    const autoOpenConsumedKeyRef = useRef(null);

    const clearScanRetry = useCallback(() => {
        if (scanRetryTimeoutRef.current) {
            clearTimeout(scanRetryTimeoutRef.current);
            scanRetryTimeoutRef.current = null;
        }
    }, []);

    const scheduleScanRetry = useCallback(() => {
        clearScanRetry();
        scanRetryTimeoutRef.current = setTimeout(() => {
            setScanLocked(false);
            scanRetryTimeoutRef.current = null;
        }, SCAN_RETRY_DELAY_MS);
    }, [clearScanRetry]);

    const openScanner = useCallback(async (withHaptic = true) => {
        if (withHaptic) {
            try { haptic(); } catch {}
        }
        setScanError('');
        try {
            let perm = permission;
            if (!perm || !perm.granted) {
                const granted = await requestPermission();
                perm = granted;
            }
            clearScanRetry();
            setScanLocked(false);
            setScanBusy(false);
            setScannerVisible(true);
            try { Keyboard.dismiss(); } catch {}
            if (!perm?.granted) {
                return false;
            }
            return true;
        } catch {
            try {
                setScannerVisible(true);
            } catch { }
            return false;
        }
    }, [permission, requestPermission, clearScanRetry]);

    const refreshPermission = useCallback(async () => {
        try {
            if (typeof getPermission === 'function') {
                await getPermission();
            } else {
                await requestPermission();
            }
        } catch {
            // ignore refresh errors
        }
    }, [getPermission, requestPermission]);

    const openSystemSettings = useCallback(() => {
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:')
                .catch(() => {
                    requestPermission();
                });
        } else {
            Linking.openSettings()
                .catch(() => {
                    requestPermission();
                });
        }
    }, [requestPermission]);

    useEffect(() => {
        if (!scannerVisible) return undefined;
        const handleAppStateChange = (state) => {
            if (state === 'active') {
                refreshPermission();
            }
        };
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription?.remove?.();
        };
    }, [scannerVisible, refreshPermission]);

    useEffect(() => {
        if (!scannerVisible) {
            clearScanRetry();
            setScanLocked(false);
            setScanBusy(false);
        }

        return () => {
            clearScanRetry();
        };
    }, [scannerVisible, clearScanRetry]);

    useEffect(() => {
        if (!visible) return undefined;
        if (scannerAutoOpenKey == null) return undefined;
        if (autoOpenConsumedKeyRef.current === scannerAutoOpenKey) return undefined;

        const key = scannerAutoOpenKey;
        if (autoOpenTimerRef.current) {
            clearTimeout(autoOpenTimerRef.current);
            autoOpenTimerRef.current = null;
        }
        autoOpenScheduledKeyRef.current = key;
        autoOpenTimerRef.current = setTimeout(() => {
            autoOpenTimerRef.current = null;
            autoOpenScheduledKeyRef.current = null;
            openScanner(false)
                .then((opened) => {
                    if (opened) {
                        autoOpenConsumedKeyRef.current = key;
                    }
                })
                .finally(() => {
                    onScannerAutoOpenComplete?.(key);
                });
        }, 220);

        return () => {
            if (autoOpenTimerRef.current) {
                clearTimeout(autoOpenTimerRef.current);
                autoOpenTimerRef.current = null;
            }
            if (autoOpenScheduledKeyRef.current === key) {
                autoOpenScheduledKeyRef.current = null;
            }
        };
    }, [visible, scannerAutoOpenKey, openScanner, onScannerAutoOpenComplete]);

    useEffect(() => {
        if (!visible) {
            if (autoOpenTimerRef.current) {
                clearTimeout(autoOpenTimerRef.current);
                autoOpenTimerRef.current = null;
            }
            autoOpenScheduledKeyRef.current = null;
            autoOpenConsumedKeyRef.current = null;
        }
    }, [visible]);

    useEffect(() => {
        if (scannerAutoOpenKey == null) {
            if (autoOpenTimerRef.current) {
                clearTimeout(autoOpenTimerRef.current);
                autoOpenTimerRef.current = null;
            }
            autoOpenScheduledKeyRef.current = null;
            autoOpenConsumedKeyRef.current = null;
        }
    }, [scannerAutoOpenKey]);

    const loadRecentFoods = useCallback(async () => {
        try {
            const uid = global?.userData?.uid || global?.userData?.id;
            if (!uid) { setRecentFoods([]); return; }
            const items = await fetchRecentFoods(uid, 20);
            setRecentFoods(items);
        } catch { setRecentFoods([]); }
    }, []);

    const performSearch = useCallback(async (searchTerm, nextPage, { append = false } = {}) => {
        const term = String(searchTerm || '').trim();
        if (!term) return;
        if (!append) {
            searchTokenRef.current += 1;
            setLoading(true);
            setLoadingMore(false);
            setHasMore(false);
            setLoadingMorePage(null);
        } else {
            setLoadingMore(true);
            setLoadingMorePage(nextPage);
        }
        const token = searchTokenRef.current;
        latestQueryRef.current = term;
        try {
            const res = await searchFood(term, { page: nextPage });
            if (searchTokenRef.current !== token) return;
            const rawFoods = res?.foods?.food;
            const list = Array.isArray(rawFoods) ? rawFoods : (rawFoods ? [rawFoods] : []);
            const declaredMax = Number(res?.foods?.max_results) || 0;
            const remoteHasMore = res?.foods?.has_more;
            const computedHasMore =
                typeof remoteHasMore === 'boolean'
                    ? remoteHasMore
                    : (declaredMax > 0 ? list.length >= declaredMax : list.length > 0);
            setHasMore(computedHasMore);
            setPage(nextPage);
            setResults((prev) => (append ? mergeUniqueFoods(prev, list) : list));
        } catch {
            if (searchTokenRef.current !== token) return;
            if (!append) {
                setResults([]);
            }
            setHasMore(false);
        } finally {
            if (searchTokenRef.current !== token) return;
            if (append) {
                setLoadingMore(false);
                setLoadingMorePage((current) => (current === nextPage ? null : current));
            } else {
                setLoading(false);
                setLoadingMorePage(null);
            }
        }
    }, []);

    const handleLoadMore = useCallback(() => {
        if (!visible) return;
        if (!hasMore || loading || loadingMore || loadingMorePage !== null) return;
        const term = latestQueryRef.current;
        if (!term) return;
        void performSearch(term, page + 1, { append: true });
    }, [hasMore, loading, loadingMore, loadingMorePage, page, performSearch, visible]);

    useEffect(() => {
        if (!visible) {
            searchTokenRef.current += 1;
            latestQueryRef.current = '';
            setLoading(false);
            setLoadingMore(false);
            setHasMore(false);
            setResults([]);
            setPage(0);
            setLoadingMorePage(null);
            return undefined;
        }
        const task = InteractionManager.runAfterInteractions(() => {
            loadRecentFoods();
            // Reset state for a fresh session and focus the input after animation completes
            setQuery('');
            setResults([]);
            setLoading(false);
            setLoadingMore(false);
            setHasMore(false);
            setPage(0);
            setLoadingMorePage(null);
            // slight timeout to allow Modal to attach before focusing
            setTimeout(() => inputRef.current?.focus?.(), 40);
        });
        return () => task?.cancel?.();
    }, [visible, loadRecentFoods, (global?.__loggedFoodsSig || 0)]);

    // Debounced search to avoid spamming network and re-renders
    useEffect(() => {
        if (!visible) return;
        const q = (query || '').trim();
        if (q.length === 0) {
            searchTokenRef.current += 1;
            latestQueryRef.current = '';
            setResults([]);
            setLoading(false);
            setLoadingMore(false);
            setHasMore(false);
            setPage(0);
            setLoadingMorePage(null);
            return;
        }
        let cancelled = false;
        const handle = setTimeout(async () => {
            if (cancelled) return;
            await performSearch(q, 0, { append: false });
        }, 250);
        return () => { cancelled = true; clearTimeout(handle); };
    }, [query, visible, performSearch]);

    /* ---------------- Portion picker (for search results) ---------------- */
    const [portionVisible, setPortionVisible] = useState(false);
    const [pendingFood, setPendingFood] = useState(null);
    const openPortion = (food) => { try { haptic(); } catch {} setPendingFood(food); setPortionVisible(true); };
    const cancelPortion = () => { setPortionVisible(false); setPendingFood(null); };

    /* ---------------- QUICK ADD (custom macros) ---------------- */
    const [quickVisible, setQuickVisible] = useState(false);
    const openQuick = () => { try { haptic(); } catch {} setQuickVisible(true); };
    const closeQuick = () => { Keyboard.dismiss(); setQuickVisible(false); };

    useEffect(() => {
        if (visible) return;
        setPortionVisible(false);
        setPendingFood(null);
        setQuickVisible(false);
        setScannerVisible(false);
    }, [visible]);

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

    const handleDeleteRecent = useCallback(async (item, closeSwipe) => {
        closeSwipe?.();
        const key = String(item?.id ?? item?.foodId ?? item?.name ?? '').trim();
        if (!key) return;
        setRecentFoods((prev) =>
            prev.filter((rf) => String(rf?.id ?? rf?.foodId ?? rf?.name ?? '').trim() !== key)
        );
        const uid = global?.userData?.uid || global?.userData?.id;
        if (!uid) return;
        try {
            await deleteRecentFood(uid, key);
        } catch {
            loadRecentFoods();
        }
    }, [loadRecentFoods]);

    const renderHistoryItem = useCallback(({ item }) => (
        <RecentHistoryItem
            item={item}
            COLORS={COLORS}
            styles={styles}
            openPortion={openPortion}
            goToDetails={goToDetails}
            onDelete={handleDeleteRecent}
        />
    ), [COLORS, styles, openPortion, goToDetails, handleDeleteRecent]);

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

    const currentMealTitle = headerMealTitle || activeMeal || '';

    return (
        <>
            {shouldRenderSheet ? (
                <View pointerEvents="box-none" style={styles.sheetWrapper}>
                    <BottomSheet
                        ref={sheetRef}
                        index={visible ? 0 : -1}
                        snapPoints={sheetSnapPoints}
                        animatedIndex={sheetAnimatedIndex}
                        handleStyle={styles.sheetHandle}
                        handleIndicatorStyle={styles.sheetHandleIndicator}
                        backgroundStyle={styles.sheetBackground}
                        style={styles.sheet}
                        enablePanDownToClose
                        onClose={onClose}
                        backdropComponent={renderBackdrop}
                        keyboardBehavior={Platform.OS === 'ios' ? 'extend' : 'interactive'}
                        keyboardBlurBehavior="restore"
                    >
                        <Pressable
                            style={[styles.overlayContainer, { paddingBottom: sheetBottomPadding }]}
                            onPress={Keyboard.dismiss}
                        >
                            <View style={[styles.overlayHeader, { paddingTop: headerPaddingTop }]}>
                                <Pressable
                                    style={styles.headerLeft}
                                    onPress={onClose}
                                    hitSlop={8}
                                    accessibilityLabel="Close search overlay"
                                >
                                    <Ionicons name="close" size={24} color={'#999'} />
                                </Pressable>

                                <View style={[styles.titleCenterWrap, { top: headerTitleOffset }]} pointerEvents="none">
                                    <Text style={styles.overlayTitle}>
                                        {currentMealTitle ? `Add to ${currentMealTitle}` : 'Add food'}
                                    </Text>
                                </View>

                                <Pressable onPress={() => { try { haptic(); } catch {} openQuick(); }} hitSlop={8} style={styles.headerRight}>
                                    <Text style={styles.headerActionText}>Quick Add</Text>
                                </Pressable>
                            </View>

                            <View style={styles.searchContainer}>
                                <View style={styles.searchBox}>
                                    <DismissableTextInput
                                        ref={inputRef}
                                        autoFocus={false}
                                        placeholder="Search for a food..."
                                        placeholderTextColor="#999"
                                        value={query}
                                        onChangeText={setQuery}
                                        style={styles.searchInput}
                                        returnKeyType="search"
                                    />
                                    <Pressable
                                        onPress={() => { void openScanner(true); }}
                                        hitSlop={8}
                                        accessibilityLabel="Open barcode scanner"
                                    >
                                        <Ionicons
                                            name="barcode-outline"
                                            size={18}
                                            color="#2D92FF"
                                            style={{ marginLeft: scaleSize(10) }}
                                        />
                                    </Pressable>
                                </View>
                            </View>

                            <KeyboardAvoidingView
                                style={{ flex: 1 }}
                                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            >
                                <FlatList
                                    contentContainerStyle={{ paddingBottom: scaleSize(24) }}
                                    data={results}
                                    keyExtractor={(item, index) => foodKey(item) || `food-${index}`}
                                    keyboardShouldPersistTaps="handled"
                                    renderItem={renderSearchItem}
                                    removeClippedSubviews
                                    initialNumToRender={8}
                                    windowSize={7}
                                    maxToRenderPerBatch={8}
                                    updateCellsBatchingPeriod={32}
                                    keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
                                    onEndReachedThreshold={0.6}
                                    onEndReached={handleLoadMore}
                                    ListEmptyComponent={
                                        <Text style={styles.emptyText}>
                                            {query ? (loading ? 'Searching…' : 'No results') : 'Start typing to search foods'}
                                        </Text>
                                    }
                                    ListFooterComponent={
                                        <View>
                                            {loadingMore ? (
                                                <View style={styles.loadingMore}>
                                                    <ActivityIndicator size="small" color={COLORS.accent || '#2D92FF'} />
                                                </View>
                                            ) : (results.length > 0 && !hasMore && !loading ? (
                                                <Text style={styles.noMoreText}>No more results</Text>
                                            ) : null)}
                                            <HistoryFooter />
                                        </View>
                                    }
                                />
                            </KeyboardAvoidingView>
                        </Pressable>
                    </BottomSheet>
                </View>
            ) : null}

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

            <Modal
                visible={scannerVisible}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => {
                    setScannerVisible(false);
                    setScanBusy(false);
                    setScanLocked(false);
                    clearScanRetry();
                }}
            >
                <View style={{ flex: 1, backgroundColor: 'black' }}>
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
                                scheduleScanRetry();
                                setScanBusy(true);
                                setScanError('');
                                try {
                                    const digits = data.replace(/\\D/g, '');
                                    if (!digits) {
                                        setScanError('Invalid barcode');
                                        setScanLocked(false);
                                        clearScanRetry();
                                        setScanBusy(false);
                                        return;
                                    }
                                    const resp = await lookupBarcode(digits);
                                    const food = resp?.food;
                                    if (food && food.food_id) {
                                        setScannerVisible(false);
                                        goToDetails(food);
                                        clearScanRetry();
                                    } else {
                                        setScanError('No match found for this barcode');
                                        setScanLocked(false);
                                        scheduleScanRetry();
                                    }
                                } catch (e) {
                                    setScanError(String(e?.message || 'Lookup failed'));
                                    setScanLocked(false);
                                    scheduleScanRetry();
                                } finally {
                                    setScanBusy(false);
                                }
                            }}
                        >
                            <View style={styles.scannerHeader}>
                                <Pressable onPress={() => {
                                    setScannerVisible(false);
                                    setScanBusy(false);
                                    setScanLocked(false);
                                    clearScanRetry();
                                }} hitSlop={12}>
                                    <Ionicons name="close" size={26} color="#fff" />
                                </Pressable>
                                <Text style={styles.scannerTitle}>Scan a food barcode</Text>
                                <View style={{ width: scaleSize(26) }} />
                            </View>
                            <View style={styles.scannerFooter}>
                                <Text style={styles.scannerHint}>{scanBusy ? 'Looking up…' : (scanError || 'Align the barcode within the frame')}</Text>
                            </View>
                        </CameraView>
                    ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
                            <Text style={{ color: 'white', marginBottom: scaleSize(12), fontSize: scaleSize(14) }}>Camera permission is required</Text>
                            <Pressable
                                onPress={openSystemSettings}
                                style={{ paddingHorizontal: scaleSize(16), paddingVertical: scaleSize(10), backgroundColor: '#2D92FF', borderRadius: scaleSize(8) }}
                            >
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: scaleSize(14) }}>Grant Permission</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </Modal>
        </>
    );
}

const RecentHistoryItem = ({ item, COLORS, styles, openPortion, goToDetails, onDelete }) => {
    const swipeRef = useRef(null);

    const mapped = useMemo(() => {
        const fallbackDesc = item?.description ?? item?.desc ?? item?.food_description ?? '';
        const foodIdRaw = item?.foodId ?? item?.id ?? item?.food_id ?? '';
        return {
            food_id: foodIdRaw ? String(foodIdRaw) : '',
            food_name: item?.name || item?.food_name || '',
            brand_name: item?.brand || item?.brand_name || '',
            food_description: fallbackDesc || '',
            description: fallbackDesc || '',
            name: item?.name || item?.food_name || '',
            brand: item?.brand || item?.brand_name || '',
            macrosPerServing: item?.macrosPerServing || item?.macrosPS || null,
            microsPS: item?.microsPS || null,
            macros: item?.macros || null,
        };
    }, [item]);

    const handleDeletePress = useCallback(() => {
        try { haptic(); } catch {}
        onDelete?.(item, () => swipeRef.current?.close?.());
    }, [item, onDelete]);

    return (
        <Swipeable
            ref={swipeRef}
            overshootRight={false}
            friction={2}
            rightThreshold={40}
            renderRightActions={() => (
                <View style={styles.historyDeleteContainer}>
                    <Pressable
                        style={styles.historyDeleteBtn}
                        onPress={handleDeletePress}
                        hitSlop={8}
                    >
                        <Ionicons name="trash-outline" size={18} color="#F27171" />
                        <Text style={styles.historyDeleteText}>Delete</Text>
                    </Pressable>
                </View>
            )}
        >
            <SearchResultCard
                item={mapped}
                onPressPlus={() => openPortion(mapped)}
                onPressCard={() => goToDetails(mapped)}
                COLORS={COLORS}
            />
        </Swipeable>
    );
};

const makeStyles = (COLORS) =>
    StyleSheet.create({
        sheetWrapper: {
            ...StyleSheet.absoluteFillObject,
            zIndex: 1600,
            elevation: 40,
        },
        sheet: {
            borderTopLeftRadius: scaleSize(32),
            borderTopRightRadius: scaleSize(32),
            overflow: 'hidden',
        },
        sheetBackground: {
            backgroundColor: COLORS.bg || COLORS.background || '#131521',
            borderTopLeftRadius: scaleSize(32),
            borderTopRightRadius: scaleSize(32),
        },
        sheetHandle: {
            paddingVertical: scaleSize(12),
        },
        sheetHandleIndicator: {
            width: scaleSize(42),
            height: scaleSize(4),
            borderRadius: scaleSize(2),
            backgroundColor: 'rgba(255,255,255,0.7)',
        },
        overlayContainer: {
            flex: 1,
            backgroundColor: COLORS.bg || COLORS.background || '#131521',
            borderTopLeftRadius: scaleSize(32),
            borderTopRightRadius: scaleSize(32),
        },
        overlayHeader: {
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
        loadingMore: {
            paddingVertical: scaleSize(14),
            alignItems: 'center',
            justifyContent: 'center',
        },
        noMoreText: {
            textAlign: 'center',
            marginTop: scaleSize(6),
            marginBottom: scaleSize(4),
            color: COLORS.subtext || COLORS.textSecondary || '#A1A7B3',
            fontFamily: 'Outfit_400Regular',
            fontSize: scaleSize(12),
        },
        historyHeader: {
            marginTop: scaleSize(8),
            marginBottom: scaleSize(8),
            paddingHorizontal: scaleSize(26),
            fontSize: scaleSize(14),
            color: COLORS.subtext || COLORS.textSecondary || '#A1A7B3',
            fontFamily: 'Outfit_600SemiBold',
        },
        historyDeleteContainer: {
            justifyContent: 'center',
            alignItems: 'flex-end',
            height: '100%',
            width: scaleSize(112),
        },
        historyDeleteBtn: {
            width: '100%',
            height: '100%',
            minHeight: scaleSize(36),
            paddingHorizontal: scaleSize(14),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: scaleSize(6),
            backgroundColor: 'rgba(242,113,113,0.16)',
        },
        historyDeleteText: { color: '#F27171', fontFamily: 'Outfit_700Bold', fontSize: scaleSize(12.5) },

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
