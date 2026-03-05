import RNBounceable from '@freakycoder/react-native-bounceable';
import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PlusIcon from '../../assets/PlusIcon';

import scaleSize from "../../helper/scaleSize";
import { strong as haptic } from '../../utils/haptics';

const DEFAULT_COLORS = {
    background: '#f5f6fa',
    textPrimary: '#151515ff',
    textSecondary: '#999',
    card: '#ffffffff',
    mealCardShadow: '#99a5b7ff',
};

function SearchResultCard({ item, onPressPlus, onPressCard, onToggleFavorite, isFavorited = false, COLORS }) {
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
            borderRadius: 0,
            paddingVertical: scaleSize(12),
            paddingHorizontal: scaleSize(26),
            marginVertical: 0,
            // Full-width list row look: hairlines top & bottom, no shadow
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: (theme.hairline || 'rgba(2,6,23,0.06)'),
            shadowOpacity: 0,
            elevation: 0,
        },
        contentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        textContainer: { flex: 1, marginRight: scaleSize(12) },
        textPressable: { flex: 1, marginRight: scaleSize(12) },
        resultTitle: { fontFamily: 'Mulish_700Bold', fontSize: scaleSize(12.5), color: theme.text || theme.textPrimary, marginBottom: scaleSize(4) },
        resultDescription: { fontFamily: 'Mulish_500Medium', fontSize: scaleSize(12.5), color: theme.subtext || theme.textSecondary },
        plusWrap: {
            width: scaleSize(32),
            height: scaleSize(32),
            borderRadius: scaleSize(18),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#rgba(255,255,255,0.1)',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.hairline || 'rgba(255,255,255,0.18)',
        },
        actionRow: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        favoriteWrap: {
            width: scaleSize(32),
            height: scaleSize(32),
            borderRadius: scaleSize(18),
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: scaleSize(8),
            backgroundColor: '#rgba(255,255,255,0.1)',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.hairline || 'rgba(255,255,255,0.18)',
        },
    });

    return (
        <View style={styles.resultCard}>
            <View style={styles.contentRow}>
                <Pressable
                    onPress={() => { try { haptic(); } catch {} onPressCard?.(); }}
                    android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
                    style={styles.textPressable}
                >
                    <Text style={styles.resultTitle}>{item.food_name}</Text>
                    <Text style={styles.resultDescription}>{getSummary()}</Text>
                </Pressable>
                <View style={styles.actionRow}>
                    <RNBounceable bounceEffectIn={0.9} onPress={() => { try { haptic(); } catch {} onToggleFavorite?.(); }}>
                        <View style={styles.favoriteWrap}>
                            <Ionicons
                                name={isFavorited ? 'bookmark' : 'bookmark-outline'}
                                size={18}
                                color={isFavorited ? (theme.accent || '#2D9EFF') : (theme.subtext || theme.textSecondary)}
                            />
                        </View>
                    </RNBounceable>
                    <RNBounceable bounceEffectIn={0.9} onPress={() => { try { haptic(); } catch {} onPressPlus?.(); }}>
                        <View style={styles.plusWrap}>
                            <PlusIcon size={18} color={theme.accent || '#2D9EFF'} />
                        </View>
                    </RNBounceable>
                </View>
            </View>
        </View>
    );
}

export default memo(SearchResultCard);
