// components/2_MacroTracking/MealCard.js
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
                <Pressable style={styles.addBtnLeft} onPress={() => onAddPress(item)} hitSlop={8}>
                    <Ionicons name="add-circle" size={22} color={COLORS.accent ?? '#64aaf6ff'} />
                </Pressable>
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
            paddingVertical: 8,
            paddingLeft: 20,
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
            fontSize: 14.5,
            color: COLORS.text,
            fontFamily: 'Nunito_800ExtraBold',
            letterSpacing: 0.2,
        },
        mealCals: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: COLORS.accent ?? '#64aaf6ff', marginLeft: 10 },
        addBtnLeft: {
            height: 36,
            width: 36,
            borderRadius: 20,
            backgroundColor: COLORS.addBtnBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: COLORS.hairline,
        }

    });
