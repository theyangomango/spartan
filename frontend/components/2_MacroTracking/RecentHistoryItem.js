// One swipe-to-delete row of the "Recent foods" list in the food search overlay.
import React, { useRef, useMemo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

import SearchResultCard from './SearchResultCard';
import { foodKey } from './foodSearchUtils';
import { strong as haptic } from '../../utils/haptics';

const RecentHistoryItem = ({ item, COLORS, styles, openPortion, goToDetails, onDelete, favoriteFoodsMap, onToggleFavorite }) => {
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

    const isFavorited = useMemo(
        () => Boolean(favoriteFoodsMap?.[foodKey(mapped)]),
        [favoriteFoodsMap, mapped],
    );

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
                onToggleFavorite={() => onToggleFavorite?.(mapped)}
                isFavorited={isFavorited}
                COLORS={COLORS}
            />
        </Swipeable>
    );
};

export default RecentHistoryItem;
