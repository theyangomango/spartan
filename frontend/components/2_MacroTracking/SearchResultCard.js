import RNBounceable from '@freakycoder/react-native-bounceable';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PlusIcon from '../../assets/PlusIcon';

const COLORS = {
    background: '#f5f6fa',
    textPrimary: '#151515ff',
    textSecondary: '#999',
    card: '#ffffffff',
    mealCardShadow: '#99a5b7ff',
};

export default function SearchResultCard({ item, onPressPlus }) {
    const getSummary = () => {
        const desc = item.food_description || '';
        const isPerServing = /per\s+1\s+serving/i.test(desc);
        const isPerUnit = /per\s+1\s+(\w+)/i.exec(desc); // e.g., cracker, slice
        const kcalMatch = desc.match(/(\d+)\s?kcal/i);
        const gramMatch = desc.match(/(\d+)\s?g/i);
        const calories = kcalMatch ? `${kcalMatch[1]} kcal` : '';
        const brand = item.brand_name || '';

        if (isPerServing) {
            return [calories, brand].filter(Boolean).join(', ');
        }

        if (isPerUnit && isPerUnit[1] && isPerUnit[1].toLowerCase() !== 'serving') {
            const unit = `1 ${isPerUnit[1]}`;
            return [calories, unit, brand].filter(Boolean).join(', ');
        }

        const grams = gramMatch ? `${gramMatch[1]}g` : '';
        return [calories, grams, brand].filter(Boolean).join(', ');
    };


    return (
        <RNBounceable bounceEffectIn={0.95} style={styles.resultCard} onPress={onPressPlus}>
            <View style={styles.contentRow}>
                <View style={styles.textContainer}>
                    <Text style={styles.resultTitle}>{item.food_name}</Text>
                    <Text style={styles.resultDescription}>{getSummary()}</Text>
                </View>
                <PlusIcon size={24} color='#79b3ffff'/>
            </View>
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    resultCard: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 22,
        marginBottom: 6,
        shadowColor: COLORS.mealCardShadow,
        shadowOpacity: 0.08,
        shadowRadius: 5,
        elevation: 2,
    },
    contentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        marginRight: 12,
    },
    resultTitle: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 12.5,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    resultDescription: {
        fontFamily: 'Mulish_500Medium',
        fontSize: 12.5,
        color: COLORS.textSecondary,
    },
});
