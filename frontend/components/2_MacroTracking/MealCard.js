// components/2_MacroTracking/MealCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MealCard({
    item,
    PlusIcon,
    COLORS,
    onAddPress,
    totalCalories = 0,
}) {
    const styles = makeStyles(COLORS);

    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <View style={styles.centerArea}>
                    <Text style={styles.title}>{item.name}</Text>
                </View>
                <Text style={styles.mealCals}>{Math.max(0, Math.round(totalCalories))}</Text>
            </View>
        </View>
    );
}

const makeStyles = (COLORS) =>
    StyleSheet.create({
        card: {
            backgroundColor: COLORS.card,
            borderRadius: 0,
            paddingVertical: 14,
            paddingLeft: 26,
            paddingRight: 26,
            marginHorizontal: 0,
            marginTop: 12,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: COLORS.hairline,
            // no shadow for full-width list row look
            shadowOpacity: 0,
            elevation: 0,
        },
        row: { flexDirection: 'row', alignItems: 'center' },
        centerArea: { flex: 1 },
        title: {
            fontSize: 15,
            color: COLORS.text,
            fontFamily: 'Nunito_800ExtraBold',
            letterSpacing: 0.2,
        },
        mealCals: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: COLORS.accent ?? '#64aaf6ff', marginLeft: 10 },

    });
