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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchResultCard from './SearchResultCard';

// 🔥 FIREBASE (adjust path if your firebase.config is elsewhere)
import { db } from '../../../firebase.config';
import {
    collection,
    getDocs,
    orderBy,
    query,
    limit,
} from 'firebase/firestore';

export default function FoodSearchOverlay({
    visible,
    activeMeal,
    searchQuery,
    setSearchQuery,
    searchResults,
    onClose,
    COLORS,
    onSelectResult, // <- make sure you pass this from the parent (MacroTracking)
}) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

    // ---- Recent foods state
    const [recentFoods, setRecentFoods] = useState([]);

    const loadRecentFoods = useCallback(async () => {
        try {
            const userId = global?.userData?.id || global?.userData?.uid;
            if (!userId) return;

            // We expect a per-user collection: users/{uid}/recentFoods
            // Each doc contains: { name, brand, description, foodId, usedCount, lastUsedAt }
            const recentRef = collection(db, 'users', userId, 'recentFoods');
            const qy = query(recentRef, orderBy('lastUsedAt', 'desc'), limit(20));
            const snap = await getDocs(qy);

            const items = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() || {}),
            }));

            setRecentFoods(items);
        } catch (e) {
            // fail silently (history is optional)
            setRecentFoods([]);
        }
    }, []);

    // Load history whenever overlay opens (and when user clears search)
    useEffect(() => {
        if (!visible) return;
        loadRecentFoods();
    }, [visible, loadRecentFoods]);

    // ---- Renderers
    const renderSearchItem = ({ item }) => (
        <SearchResultCard
            item={item}
            onPressPlus={() => onSelectResult?.(item)}
        />
    );

    const renderHistoryItem = ({ item }) => {
        // map history shape to the search card shape
        const mapped = {
            food_id: item.foodId || item.id,
            food_name: item.name || '',
            brand_name: item.brand || '',
            food_description: item.description || '',
        };
        return (
            <SearchResultCard
                item={mapped}
                onPressPlus={() => onSelectResult?.(mapped)}
            />
        );
    };

    // Footer that shows recent foods below the results
    const HistoryFooter = () => {
        // Only show when there's no active query (cleaner UX)
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
            <View style={styles.overlayContainer}>
                {/* Overlay Header */}
                <View style={styles.overlayHeader}>
                    <Pressable onPress={onClose} hitSlop={10}>
                        <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
                    </Pressable>
                    <Text style={styles.overlayTitle}>
                        {activeMeal ? `Add to ${activeMeal}` : 'Add food'}
                    </Text>
                    <View style={{ width: 26 }} />
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
            </View>
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
        },
        overlayTitle: {
            fontSize: 18,
            color: COLORS.textPrimary,
            fontFamily: 'Outfit_600SemiBold',
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
    });
