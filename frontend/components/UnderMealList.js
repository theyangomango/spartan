// components/UnderMealList.js
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

export default function UnderMealList({
    items = [],
    COLORS,
    listStyle,
    cardStyle,
    onDelete,
    renderSummary,
    showCaloriesRight = false,
    compact = false,
}) {
    const formatCals = (n) => {
        const v = Math.round(Number(n || 0));
        return isFinite(v) ? String(v) : '0';
    };

    const pruneLeadingCalories = (s) => {
        if (!s) return '';
        // Remove a leading "123 kcal" (with optional comma)
        return String(s).replace(/^\s*\d+(?:\.\d+)?\s*(?:kcal|cal(?:ories)?)\s*,?\s*/i, '');
    };
    const renderRight = (entry) => (
        <View style={styles.actionsContainer}>
            <Pressable
                style={[styles.deleteBtn, { backgroundColor: '#e65252' }]}
                onPress={() => onDelete?.(entry)}
                hitSlop={8}
            >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
        </View>
    );

    return (
        <View style={[styles.list, listStyle]}>
            {items.map((f) => (
                <Swipeable
                    key={f.key}
                    overshootRight={false}
                    friction={2}
                    rightThreshold={40}
                    renderRightActions={() => renderRight(f)}
                >
                    <View
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
                                    {f.name}
                                </Text>
                                {!compact && (
                                    <Text style={[styles.summary, { color: COLORS.subtext }]} numberOfLines={1}>
                                        {(() => {
                                            const s = renderSummary ? renderSummary(f) : '';
                                            return showCaloriesRight ? pruneLeadingCalories(s) : s;
                                        })()}
                                    </Text>
                                )}
                            </View>
                            {showCaloriesRight && (
                                <Text style={[styles.cals, { color: COLORS.text }]}>
                                    {formatCals(f?.macros?.calories)}
                                </Text>
                            )}
                        </View>
                    </View>
                </Swipeable>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    list: { paddingHorizontal: 18, marginTop: 2, marginBottom: 8 },
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
    actionsContainer: { justifyContent: 'center', alignItems: 'flex-end', marginVertical: 2 },
    deleteBtn: {
        width: 88,
        height: '90%',
        marginRight: 18,
        borderRadius: 12,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        flexDirection: 'column',
    },
    deleteText: { color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 12, marginTop: 2 },
});
