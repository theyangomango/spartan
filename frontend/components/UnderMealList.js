// components/UnderMealList.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import MealItemCard from './2_MacroTracking/MealItemCard';

import scaleSize from "../helper/scaleSize";

export default function UnderMealList({
    items = [],
    COLORS,
    listStyle,
    cardStyle,
    onDelete,
    onItemPress,
    renderSummary,
    showCaloriesRight = false,
    compact = false,
}) {
    return (
        <View style={[styles.list, listStyle]}>
            {items.map((entry) => (
                <MealItemCard
                    key={entry.key}
                    entry={entry}
                    COLORS={COLORS}
                    cardStyle={cardStyle}
                    onDelete={onDelete}
                    onPress={onItemPress}
                    renderSummary={renderSummary}
                    showCaloriesRight={showCaloriesRight}
                    compact={compact}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    list: { paddingHorizontal: scaleSize(18), marginTop: scaleSize(2), marginBottom: scaleSize(8) },
});
