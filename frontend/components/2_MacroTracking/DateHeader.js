import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DateHeader({ title, onPrev, onNext, COLORS }) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
    return (
        <View style={styles.container}>
            <Pressable onPress={onPrev} hitSlop={8}>
                <Ionicons name="chevron-back" size={24} color={styles.textColor.color} />
            </Pressable>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onNext} hitSlop={8}>
                <Ionicons name="chevron-forward" size={24} color={styles.textColor.color} />
            </Pressable>
        </View>
    );
}

const makeStyles = (COLORS) =>
    StyleSheet.create({
        container: {
            backgroundColor: COLORS.bg || COLORS.background || '#F8FAFC',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 26,
            paddingTop: 58,
            paddingBottom: 6,
        },
        textColor: { color: COLORS.text || COLORS.textPrimary || '#0F172A' },
        title: { fontSize: 16, fontFamily: 'Nunito_800ExtraBold', color: COLORS.text || '#0F172A' },
    });

