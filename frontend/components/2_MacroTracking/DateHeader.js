import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import scaleSize from "../../helper/scaleSize";

export default function DateHeader({ title, onPrev, onNext, COLORS }) {
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => makeStyles(COLORS, insets), [COLORS, insets]);
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

const makeStyles = (COLORS, insets) =>
    StyleSheet.create({
        container: {
            backgroundColor: COLORS.bg || COLORS.background || '#F8FAFC',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: scaleSize(26),
            // Pad from the top safe area so the header starts below the notch/status bar
            paddingTop: scaleSize(Math.max((insets?.top || 0) + 11, 12)),
            paddingBottom: scaleSize(6),
        },
        textColor: { color: COLORS.text || COLORS.textPrimary || '#0F172A' },
        title: { fontSize: scaleSize(16), fontFamily: 'Nunito_800ExtraBold', color: COLORS.text || '#0F172A' },
    });
