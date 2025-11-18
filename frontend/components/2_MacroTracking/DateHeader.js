import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import scaleSize from "../../helper/scaleSize";
import { strong as haptic } from '../../utils/haptics';
import { getUnifiedHeaderMetrics } from '../../theme/headerMetrics';

const METRICS = getUnifiedHeaderMetrics();

export default function DateHeader({
    title,
    onPrev,
    onNext,
    onTitlePress,
    onHistoryPress,
    COLORS,
    isToday = false,
}) {
    const styles = useMemo(
        () => makeStyles(COLORS),
        [COLORS]
    );
    const scale = useRef(new Animated.Value(1)).current;
    const highlightColor = useMemo(
        () => COLORS?.accentBlue || COLORS?.accent || '#2563EB',
        [COLORS]
    );
    const [leftWidth, setLeftWidth] = useState(0);
    const showNextIcon = !!onNext && !isToday;
    const handleLeftLayout = useCallback((event) => {
        const width = event?.nativeEvent?.layout?.width || 0;
        if (width <= 0) return;
        setLeftWidth((prev) => (Math.abs(prev - width) < 1 ? prev : width));
    }, []);
    const clampedWidth = useMemo(() => {
        if (!leftWidth) return null;
        const min = METRICS.iconSize * 1.4;
        const max = METRICS.iconSize * 2.4;
        return Math.max(min, Math.min(leftWidth, max));
    }, [leftWidth]);
    const mirroredWidthStyle = clampedWidth ? { width: clampedWidth } : null;

    const handleHistoryPress = () => {
        try { haptic(); } catch {}
        if (onHistoryPress) onHistoryPress();
    };

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
            <View style={styles.headerRow}>
                <View style={styles.leftGroup} onLayout={handleLeftLayout}>
                    <Pressable onPress={() => { try { haptic(); } catch {} onPrev?.(); }} hitSlop={8}>
                        <Ionicons name="chevron-back" size={METRICS.iconSize} color={styles.textColor.color} />
                    </Pressable>
                </View>
                <View style={styles.titleContainer} pointerEvents="box-none">
                    <Pressable
                        onPress={() => { try { haptic(); } catch {} handleTitlePress(); }}
                        disabled={!onTitlePress}
                        hitSlop={8}
                        style={styles.titleWrapper}
                    >
                        <Animated.Text
                            style={[
                                styles.title,
                                isToday && { color: highlightColor },
                                { transform: [{ scale }] },
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {title}
                        </Animated.Text>
                    </Pressable>
                </View>
                <View style={[styles.rightGroup, mirroredWidthStyle]}>
                    {isToday ? (
                        <Pressable
                            onPress={handleHistoryPress}
                            disabled={!onHistoryPress}
                            hitSlop={8}
                            style={{ opacity: onHistoryPress ? 1 : 0.4 }}
                        >
                            <Ionicons name="time-outline" size={METRICS.iconSize} color={highlightColor} />
                        </Pressable>
                    ) : showNextIcon ? (
                        <Pressable onPress={() => { try { haptic(); } catch {} onNext?.(); }} hitSlop={8}>
                            <Ionicons name="chevron-forward" size={METRICS.iconSize} color={styles.textColor.color} />
                        </Pressable>
                    ) : (
                        <View style={{ width: METRICS.iconSize, height: METRICS.iconSize }} />
                    )}
                </View>
            </View>
        </View>
    );
}

const makeStyles = (COLORS) =>
    StyleSheet.create({
        container: {
            backgroundColor: COLORS.bg || COLORS.background || '#F8FAFC',
            paddingHorizontal: METRICS.paddingH,
            paddingTop: METRICS.paddingTop,
            paddingBottom: METRICS.paddingBottom,
            marginTop: METRICS.marginTop,
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: METRICS.paddingTop + METRICS.paddingBottom + METRICS.centerH,
            justifyContent: 'space-between',
            position: 'relative',
        },
        textColor: { color: COLORS.text || COLORS.textPrimary || '#0F172A' },
        titleContainer: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'box-none',
        },
        titleWrapper: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: scaleSize(8),
        },
        title: {
            fontSize: scaleSize(16),
            fontFamily: 'Nunito_800ExtraBold',
            color: COLORS.text || '#0F172A',
            textAlign: 'center',
        },
        leftGroup: {
            flexDirection: 'row',
            alignItems: 'center',
            minWidth: METRICS.iconSize,
            justifyContent: 'flex-start',
        },
        rightGroup: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            minWidth: METRICS.iconSize,
        },
    });
