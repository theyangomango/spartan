import React, { useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import scaleSize from "../../helper/scaleSize";
import { strong as haptic } from '../../utils/haptics';
import { getUnifiedHeaderMetrics } from '../../theme/headerMetrics';

const METRICS = getUnifiedHeaderMetrics();

export default function DateHeader({ title, onPrev, onNext, onTitlePress, COLORS }) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
    const scale = useRef(new Animated.Value(1)).current;

    const handleTitlePress = () => {
        // Trigger a quick bounce animation
        Animated.sequence([
            Animated.timing(scale, { toValue: 0.94, duration: 90, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, speed: 14, bounciness: 14, useNativeDriver: true }),
        ]).start();
        if (onTitlePress) onTitlePress();
    };
    return (
        <View style={styles.container}>
            <Pressable onPress={() => { try { haptic(); } catch {} onPrev?.(); }} hitSlop={8}>
                <Ionicons name="chevron-back" size={METRICS.iconSize} color={styles.textColor.color} />
            </Pressable>
            <Pressable onPress={() => { try { haptic(); } catch {} handleTitlePress(); }} disabled={!onTitlePress} hitSlop={8}>
                <Animated.Text style={[styles.title, { transform: [{ scale }] }]}>{title}</Animated.Text>
            </Pressable>
            <Pressable onPress={() => { try { haptic(); } catch {} onNext?.(); }} hitSlop={8}>
                <Ionicons name="chevron-forward" size={METRICS.iconSize} color={styles.textColor.color} />
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
            paddingHorizontal: METRICS.paddingH,
            paddingTop: METRICS.paddingTop,
            paddingBottom: METRICS.paddingBottom,
            marginTop: METRICS.marginTop,
            minHeight: METRICS.paddingTop + METRICS.paddingBottom + METRICS.centerH,
        },
        textColor: { color: COLORS.text || COLORS.textPrimary || '#0F172A' },
        title: { fontSize: scaleSize(16), fontFamily: 'Nunito_800ExtraBold', color: COLORS.text || '#0F172A' },
    });
