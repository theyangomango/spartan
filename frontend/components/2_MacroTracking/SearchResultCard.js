import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PlusIcon from '../../assets/PlusIcon';

const DEFAULT_COLORS = {
    background: '#f5f6fa',
    textPrimary: '#151515ff',
    textSecondary: '#999',
    card: '#ffffffff',
    mealCardShadow: '#99a5b7ff',
};

function SearchResultCard({ item, onPressPlus, COLORS }) {
    const theme = COLORS || DEFAULT_COLORS;
    const formatPortion = (qty, unit) => {
        const u = (unit || '').trim().toLowerCase();
        if (/^g(ram|rams)?$/.test(u)) return `${qty}g`;
        if (/^(mg|milligram|milligrams)$/.test(u)) return `${qty}mg`;
        if (/^(kg|kilogram|kilograms)$/.test(u)) return `${qty}kg`;
        return `${qty} ${unit.trim()}`; // default keeps a space
    };

    const getSummary = () => {
        const desc = item.food_description || '';

        const kcalMatch = desc.match(/(\d+)\s?(?:kcal|cal(?:ories)?)\b/i);
        const calories = kcalMatch ? `${kcalMatch[1]} kcal` : '';
        const brand = item.brand_name || '';

        const perServing = /\bper\b\s*(?:\d+(?:\s*\/\s*\d+)?(?:\.\d+)?)?\s*serving\b/i.test(desc);
        if (perServing) return [calories, brand].filter(Boolean).join(', ');

        // Prefer fractions: "Per 1/4 cup"
        const perFraction = desc.match(/\bper\b\s*(\d+\s*\/\s*\d+)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/i);
        if (perFraction) {
            const qty = perFraction[1].replace(/\s*/g, '');
            const unit = perFraction[2].trim();
            if (unit.toLowerCase() !== 'serving') {
                return [calories, formatPortion(qty, unit), brand].filter(Boolean).join(', ');
            }
        }

        // Then decimals/integers: "Per 100 g", "Per 2 tbsp"
        const perUnit = desc.match(/\bper\b\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/i);
        if (perUnit) {
            const qty = perUnit[1];
            const unit = perUnit[2].trim();
            if (unit.toLowerCase() !== 'serving') {
                return [calories, formatPortion(qty, unit), brand].filter(Boolean).join(', ');
            }
        }

        // Fallback grams already no-space
        const gramMatch = desc.match(/(\d+)\s?g\b/i);
        const grams = gramMatch ? `${gramMatch[1]}g` : '';

        return [calories, grams, brand].filter(Boolean).join(', ');
    };

    const styles = StyleSheet.create({
        resultCard: {
            backgroundColor: theme.card,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 22,
            marginBottom: 6,
            shadowColor: theme.mealCardShadow,
            shadowOpacity: 0.08,
            shadowRadius: 5,
            elevation: 2,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: (theme.hairline || 'rgba(2,6,23,0.06)'),
        },
        contentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        textContainer: { flex: 1, marginRight: 12 },
        resultTitle: { fontFamily: 'Mulish_700Bold', fontSize: 12.5, color: theme.text || theme.textPrimary, marginBottom: 4 },
        resultDescription: { fontFamily: 'Mulish_500Medium', fontSize: 12.5, color: theme.subtext || theme.textSecondary },
    });

    return (
        <RNBounceable bounceEffectIn={0.95} style={styles.resultCard} onPress={onPressPlus}>
            <View style={styles.contentRow}>
                <View style={styles.textContainer}>
                    <Text style={styles.resultTitle}>{item.food_name}</Text>
                    <Text style={styles.resultDescription}>{getSummary()}</Text>
                </View>
                <PlusIcon size={24} color="#79b3ffff" />
            </View>
        </RNBounceable>
    );
}

export default memo(SearchResultCard);
