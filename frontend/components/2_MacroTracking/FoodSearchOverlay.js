// components/2_MacroTracking/FoodSearchOverlay.js
import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
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
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Camera } from 'expo-camera';
import { CameraView } from 'expo-camera/next';
import { runOnJS, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import SearchResultCard from './SearchResultCard';
import PortionPickerModal from './PortionPickerModal';
import QuickAddModal from './QuickAddModal';
import RecentHistoryItem from './RecentHistoryItem';
import makeStyles from './FoodSearchOverlay.styles';
import {
    foodKey,
    mergeUniqueFoods,
    filterSearchResults,
    buildFavoriteMap,
    prioritizeFavorites,
    prioritizeRecentFoods,
} from './foodSearchUtils';
import { searchFood, lookupBarcode } from '../../screens/fatsecretClient';
import { useNavigation } from '@react-navigation/native';
import { fetchRecentFoods, deleteRecentFood } from '../../utils/recentFoods';
import {
    fetchFavoriteFoods,
    makeFoodFavoriteKey,
    removeFavoriteFood,
    syncFavoriteFoodsFromBackend,
    upsertFavoriteFood,
} from '../../utils/favoriteFoods';

import scaleSize from "../../helper/scaleSize";
import { strong as haptic } from '../../utils/haptics';
import DismissableTextInput from '../common/DismissableTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCAN_RETRY_DELAY_MS = 500;

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
    const [favoriteFoodsMap, setFavoriteFoodsMap] = useState({});
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
    const favoriteFoodsMapRef = useRef({});

    // ---- Barcode scanner state
    const [scannerVisible, setScannerVisible] = useState(false);
    const [permission, requestPermission, getPermission] = Camera.useCameraPermissions();
    const [scanBusy, setScanBusy] = useState(false);
    const [scanError, setScanError] = useState('');
    const [scanLocked, setScanLocked] = useState(false); // throttle duplicate scans
    const scanRetryTimeoutRef = useRef(null);

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

    const openScanner = useCallback(async () => {
        try { haptic(); } catch {}
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

    const loadRecentFoods = useCallback(async () => {
        try {
            const uid = global?.userData?.uid || global?.userData?.id;
            if (!uid) { setRecentFoods([]); return; }
            const items = await fetchRecentFoods(uid, 20);
            setRecentFoods(items);
        } catch { setRecentFoods([]); }
    }, []);

    const loadFavoriteFoods = useCallback(async () => {
        try {
            const uid = global?.userData?.uid || global?.userData?.id;
            if (!uid) {
                favoriteFoodsMapRef.current = {};
                setFavoriteFoodsMap({});
                return;
            }
            const cachedItems = await fetchFavoriteFoods(uid, 200, { preferCache: true, refreshRemote: false });
            const cachedMap = buildFavoriteMap(cachedItems);
            favoriteFoodsMapRef.current = cachedMap;
            setFavoriteFoodsMap(cachedMap);

            // Refresh from backend in the background and reconcile if data changed.
            void syncFavoriteFoodsFromBackend(uid, 200).then((remoteItems) => {
                const remoteMap = buildFavoriteMap(remoteItems);
                favoriteFoodsMapRef.current = remoteMap;
                setFavoriteFoodsMap(remoteMap);
            });
        } catch {
            favoriteFoodsMapRef.current = {};
            setFavoriteFoodsMap({});
        }
    }, []);

    const reorderResultsForFavorites = useCallback((items) => {
        return prioritizeFavorites(items, favoriteFoodsMapRef.current);
    }, []);
    const recentFoodsSorted = useMemo(
        () => prioritizeRecentFoods(recentFoods, favoriteFoodsMap),
        [recentFoods, favoriteFoodsMap],
    );

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
            const filteredList = filterSearchResults(list, term);
            const declaredMax = Number(res?.foods?.max_results) || 0;
            const remoteHasMore = res?.foods?.has_more;
            const computedHasMore =
                typeof remoteHasMore === 'boolean'
                    ? remoteHasMore
                    : (declaredMax > 0 ? list.length >= declaredMax : list.length > 0);
            setHasMore(computedHasMore);
            setPage(nextPage);
            setResults((prev) => {
                const merged = append ? mergeUniqueFoods(prev, filteredList) : filteredList;
                return reorderResultsForFavorites(merged);
            });
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
    }, [reorderResultsForFavorites]);

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
            loadFavoriteFoods();
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
    }, [visible, loadRecentFoods, loadFavoriteFoods, (global?.__loggedFoodsSig || 0)]);

    useEffect(() => {
        favoriteFoodsMapRef.current = favoriteFoodsMap || {};
        setResults((prev) => reorderResultsForFavorites(prev));
    }, [favoriteFoodsMap, reorderResultsForFavorites]);

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
        navigation.navigate('FoodDetail', {
            mode: 'add',
            food,
            mealName: activeMeal,
            dayKey,
        });
    }, [navigation, activeMeal, dayKey]);

    const handleToggleFavorite = useCallback(async (food) => {
        const uid = global?.userData?.uid || global?.userData?.id;
        if (!uid || !food) return;

        const favoritePayload = {
            foodId: String(food?.food_id ?? food?.foodId ?? food?.id ?? '').trim(),
            name: String(food?.food_name ?? food?.name ?? '').trim(),
            brand: String(food?.brand_name ?? food?.brand ?? '').trim(),
            description: String(food?.food_description ?? food?.description ?? food?.desc ?? '').trim(),
        };
        const key = makeFoodFavoriteKey(favoritePayload);
        if (!key) return;

        const existingMap = favoriteFoodsMapRef.current || {};
        const wasFavorited = Boolean(existingMap[key]);

        const optimisticMap = { ...existingMap };
        if (wasFavorited) {
            delete optimisticMap[key];
        } else {
            optimisticMap[key] = { key, ...favoritePayload };
        }

        favoriteFoodsMapRef.current = optimisticMap;
        setFavoriteFoodsMap(optimisticMap);
        setResults((prev) => prioritizeFavorites(prev, optimisticMap));

        try {
            if (wasFavorited) {
                await removeFavoriteFood(uid, key);
            } else {
                const saved = await upsertFavoriteFood(uid, favoritePayload);
                if (!saved) throw new Error('favorite-save-failed');
            }
        } catch {
            // Roll back optimistic update if the write fails.
            const rollbackMap = { ...existingMap };
            favoriteFoodsMapRef.current = rollbackMap;
            setFavoriteFoodsMap(rollbackMap);
            setResults((prev) => prioritizeFavorites(prev, rollbackMap));
        }
    }, []);

    const renderSearchItem = useCallback(({ item }) => (
        <SearchResultCard
            item={item}
            onPressPlus={() => openPortion(item)}
            onPressCard={() => goToDetails(item)}
            onToggleFavorite={() => handleToggleFavorite(item)}
            isFavorited={Boolean(favoriteFoodsMap[foodKey(item)])}
            COLORS={COLORS}
        />
    ), [openPortion, goToDetails, handleToggleFavorite, favoriteFoodsMap, COLORS]);

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
            favoriteFoodsMap={favoriteFoodsMap}
            onToggleFavorite={handleToggleFavorite}
        />
    ), [COLORS, styles, openPortion, goToDetails, handleDeleteRecent, favoriteFoodsMap, handleToggleFavorite]);

    const HistoryFooter = () => {
        if (!visible) return null;
        if (!recentFoodsSorted?.length) return null;

        return (
            <View style={{ marginTop: scaleSize(10) }}>
                <Text style={styles.historyHeader}>Recent foods</Text>
                <FlatList
                    data={recentFoodsSorted}
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
                                        onPress={() => { void openScanner(); }}
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
