// components/2_MacroTracking/MealCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import scaleSize from "../../helper/scaleSize";

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
            paddingVertical: scaleSize(14),
            paddingLeft: scaleSize(26),
            paddingRight: scaleSize(26),
            marginHorizontal: 0,
            marginTop: scaleSize(12),
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
            fontSize: scaleSize(15),
            color: COLORS.text,
            fontFamily: 'Nunito_800ExtraBold',
            letterSpacing: 0.2,
        },
        mealCals: { fontSize: scaleSize(16), fontFamily: 'Outfit_700Bold', color: 'rgba(102, 176, 255, 1)', marginLeft: scaleSize(10) },

    });
