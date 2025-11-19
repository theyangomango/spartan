import React, { useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';

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
                            <HistoryClockIcon size={METRICS.iconSize} color={highlightColor} />
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

const HistoryClockIcon = ({ size = METRICS.iconSize, color = '#2563EB' }) => {
    const iconSize = (size || METRICS.iconSize) * 1.08;
    const strokeWidth = Math.min(2.3, Math.max(1.6, iconSize * 0.085));
    return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <Circle
                cx="12"
                cy="12"
                r="8.5"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M12 7.5v4.6l3 1.7"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
};

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
            fontSize: scaleSize(17),
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
