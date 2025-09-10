// components/2_MacroTracking/MealItemCard.js
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

export default function MealItemCard({
    entry,
    COLORS,
    cardStyle,
    onDelete,
    onPress,
    renderSummary,
    showCaloriesRight = false,
    compact = false,
}) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

    const formatCals = (n) => {
        const v = Math.round(Number(n || 0));
        return isFinite(v) ? String(v) : '0';
    };

    const pruneLeadingCalories = (s) => {
        if (!s) return '';
        // Remove a leading "123 kcal" (with optional comma)
        return String(s).replace(/^\s*\d+(?:\.\d+)?\s*(?:kcal|cal(?:ories)?)\s*,?\s*/i, '');
    };

    const renderRight = () => (
        <View style={styles.actionsContainer}>
            <Pressable
                style={styles.deleteBtn}
                onPress={() => onDelete?.(entry)}
                hitSlop={8}
            >
                <Ionicons name="trash-outline" size={18} color="#F27171" />
                <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
        </View>
    );

    return (
        <Swipeable
            overshootRight={false}
            friction={2}
            rightThreshold={40}
            renderRightActions={renderRight}
        >
            <Pressable
                onPress={() => onPress?.(entry)}
                android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
                style={[
                    styles.card,
                    compact && styles.cardCompact,
                    { backgroundColor: COLORS.card, borderColor: COLORS.hairline },
                    cardStyle,
                ]}
            >
                <View style={styles.row}>
                    <View style={styles.textCol}>
                        <Text style={[styles.name, { color: COLORS.text }]} numberOfLines={1}>
                            {entry?.name}
                        </Text>
                        {!compact && (
                            <Text style={[styles.summary, { color: COLORS.subtext }]} numberOfLines={1}>
                                {(() => {
                                    const s = renderSummary ? renderSummary(entry) : '';
                                    return showCaloriesRight ? pruneLeadingCalories(s) : s;
                                })()}
                            </Text>
                        )}
                    </View>
                    {showCaloriesRight && (
                        <Text style={[styles.cals, { color: COLORS.text }]}>
                            {formatCals(entry?.macros?.calories)}
                        </Text>
                    )}
                </View>
            </Pressable>
        </Swipeable>
    );
}

const makeStyles = (COLORS) =>
    StyleSheet.create({
        card: {
            borderRadius: 14,
            paddingVertical: 8,
            paddingHorizontal: 16,
            marginVertical: 2,
            borderWidth: StyleSheet.hairlineWidth,
            shadowOpacity: 0.02,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 1,
        },
        cardCompact: { paddingVertical: 6 },
        row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
        textCol: { flex: 1, justifyContent: 'center' },
        name: { fontSize: 12.5, fontFamily: 'Nunito_700Bold', marginBottom: 2, flexShrink: 1, paddingRight: 20 },
        cals: { fontSize: 14, fontFamily: 'Outfit_700Bold' },
        summary: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
        actionsContainer: {
            justifyContent: 'center',
            alignItems: 'flex-end',
            height: '100%',
            width: 112,
        },
        deleteBtn: {
            width: '100%',
            height: '100%',
            minHeight: 32,
            borderRadius: 0,
            paddingHorizontal: 16,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            flexDirection: 'row',
            backgroundColor: 'rgba(242,113,113,0.16)'
        },
        deleteText: { color: '#F27171', fontFamily: 'Outfit_700Bold', fontSize: 12.5 },
    });
