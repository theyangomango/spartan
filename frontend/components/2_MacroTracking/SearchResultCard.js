import RNBounceable from '@freakycoder/react-native-bounceable';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = {
    background: '#f5f6fa',
    textPrimary: '#1C1C1E',
    textSecondary: '#777',
    card: '#ffffffff',
    mealCardShadow: '#99a5b7ff',
};

export default function SearchResultCard({ item }) {
    return (
        <RNBounceable bounceEffectIn={0.95} style={styles.resultCard}>
            <Text style={styles.resultTitle}>{item.food_name} {item.brand_name && `(${item.brand_name})`}</Text>
            <Text style={styles.resultDescription}>{item.food_description}</Text>
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    resultCard: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        shadowColor: COLORS.mealCardShadow,
        shadowOpacity: 0.08,
        shadowRadius: 5,
        elevation: 2,
    },
    resultTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 15,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    resultDescription: {
        fontFamily: 'Outfit_400Regular',
        fontSize: 13,
        color: COLORS.textSecondary,
    },
});
