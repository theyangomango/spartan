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
}) {
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
                            { backgroundColor: COLORS.card, borderColor: COLORS.hairline },
                            cardStyle,
                        ]}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.name, { color: COLORS.text }]}>{f.name}</Text>
                            <Text style={[styles.summary, { color: COLORS.subtext }]}>
                                {renderSummary ? renderSummary(f) : ''}
                            </Text>
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
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginVertical: 4,
        borderWidth: StyleSheet.hairlineWidth,
        shadowOpacity: 0.03,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },

    name: { fontSize: 13.5, fontFamily: 'Outfit_600SemiBold', marginBottom: 3 },
    summary: { fontSize: 12.5, fontFamily: 'Outfit_400Regular' },
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
