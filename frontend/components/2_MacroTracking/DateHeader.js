import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import scaleSize from "../../helper/scaleSize";
import { strong as haptic } from '../../utils/haptics';
import { getUnifiedHeaderMetrics } from '../../theme/headerMetrics';

const METRICS = getUnifiedHeaderMetrics();
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DateHeader({
    title,
    onPrev,
    onNext,
    onTitlePress,
    onHistoryPress,
    COLORS,
    isToday = false,
    streakCount = 0,
}) {
    const streakColor = COLORS?.streak || '#FF6C1A';
    const withAlpha = useCallback((hex, alpha) => {
        if (typeof hex !== 'string') return null;
        const trimmed = hex.trim();
        if (!/^#([0-9a-fA-F]{6})$/.test(trimmed)) return null;
        return `${trimmed}${alpha}`;
    }, []);
    const streakBgColor = withAlpha(streakColor, '26') || 'rgba(255,108,26,0.18)';
    const streakBorderColor = withAlpha(streakColor, '40') || 'rgba(255,108,26,0.35)';
    const styles = useMemo(
        () => makeStyles(COLORS, streakColor, streakBgColor, streakBorderColor),
        [COLORS, streakColor, streakBgColor, streakBorderColor]
    );
    const scale = useRef(new Animated.Value(1)).current;
    const highlightColor = useMemo(
        () => COLORS?.accentBlue || COLORS?.accent || '#2563EB',
        [COLORS]
    );
    const [leftWidth, setLeftWidth] = useState(0);
    const [infoPanelVisible, setInfoPanelVisible] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0, width: 0, height: 0 });
    const pillRef = useRef(null);
    const panelScale = useRef(new Animated.Value(0.96)).current;
    const panelOpacity = useRef(new Animated.Value(0)).current;
    const showNextIcon = !!onNext && !isToday;
    const displayStreak = useMemo(() => {
        const value = Number(streakCount);
        if (!Number.isFinite(value) || value < 0) return 0;
        return Math.round(value);
    }, [streakCount]);
    const streakLabel = `${displayStreak}`;
    const pillOpacity = displayStreak > 0 ? 1 : 0.75;
    const flameSize = Math.max(18, METRICS.iconSize - scaleSize(2));
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
    const widthStyle = clampedWidth ? { width: clampedWidth } : null;

    const closeInfoPanel = useCallback(() => {
        setInfoPanelVisible(false);
    }, []);
    const openStreakPanel = useCallback(() => {
        try { haptic(); } catch {}
        if (pillRef.current?.measureInWindow) {
            pillRef.current.measureInWindow((x, y, width, height) => {
                setPanelPosition({ left: x, top: y, width, height });
                setInfoPanelVisible(true);
            });
        } else {
            setPanelPosition({ left: 40, top: 120, width: METRICS.iconSize, height: METRICS.iconSize });
            setInfoPanelVisible(true);
        }
    }, []);

    useEffect(() => {
        if (infoPanelVisible) {
            Animated.parallel([
                Animated.timing(panelOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
                Animated.spring(panelScale, { toValue: 1, friction: 7, useNativeDriver: true }),
            ]).start();
        } else {
            panelOpacity.setValue(0);
            panelScale.setValue(0.96);
        }
    }, [infoPanelVisible, panelOpacity, panelScale]);

    const panelWidth = scaleSize(260);
    const centerX = (panelPosition.left || 0) + ((panelPosition.width || 0) / 2);
    const rawLeft = centerX - (panelWidth / 2);
    const safeLeft = Math.min(Math.max(rawLeft, 12), SCREEN_WIDTH - panelWidth - 12);
    const baseTop = (panelPosition.top || 0) + (panelPosition.height || 0);
    const rawTop = baseTop + scaleSize(10);
    const safeTop = Math.min(Math.max(rawTop, METRICS.paddingTop + 40), SCREEN_HEIGHT - scaleSize(200));
    const caretLeft = Math.max(
        scaleSize(18),
        Math.min(panelWidth - scaleSize(22), (centerX - safeLeft) - scaleSize(7))
    );

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
                <View style={[styles.leftGroup, widthStyle]} onLayout={handleLeftLayout}>
                    <Pressable onPress={() => { try { haptic(); } catch {} onPrev?.(); }} hitSlop={8}>
                        <Ionicons name="chevron-back" size={METRICS.iconSize} color={styles.textColor.color} />
                    </Pressable>
                    <Pressable
                        ref={pillRef}
                        onPress={openStreakPanel}
                        hitSlop={8}
                        style={[styles.streakPill, { opacity: pillOpacity }]}
                    >
                        <Ionicons name="flame" size={flameSize} color={streakColor} />
                        <Text style={[styles.streakText, { color: streakColor }]}>
                            {streakLabel}
                        </Text>
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
                <View style={[styles.rightGroup, widthStyle]}>
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
            <Modal transparent animationType="none" visible={infoPanelVisible} onRequestClose={closeInfoPanel}>
                <View style={styles.infoOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeInfoPanel} />
                    <Animated.View
                        style={[
                            styles.infoPanel,
                            {
                                top: safeTop,
                                left: safeLeft,
                                width: panelWidth,
                                transform: [{ scale: panelScale }],
                                opacity: panelOpacity,
                                backgroundColor: COLORS.card || 'rgba(15,23,42,0.95)',
                            },
                        ]}
                    >
                        <View style={[styles.infoCaret, { left: caretLeft, backgroundColor: COLORS.card || 'rgba(15,23,42,0.95)' }]} />
                        <Text style={styles.infoTitle}>Macro streak</Text>
                        <Text style={styles.infoText}>
                            Tracks consecutive days you log food. Miss a day and the streak resets.
                        </Text>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const makeStyles = (COLORS, streakColor, streakBgColor, streakBorderColor) =>
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
        },
        textColor: { color: COLORS.text || COLORS.textPrimary || '#0F172A' },
        titleContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: scaleSize(8),
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
        streakPill: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: scaleSize(9),
            paddingVertical: scaleSize(3),
            borderRadius: scaleSize(16),
            marginLeft: scaleSize(8),
            backgroundColor: streakBgColor,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: streakBorderColor,
        },
        streakText: {
            marginLeft: scaleSize(4),
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: scaleSize(15),
        },
        infoOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
        },
        infoPanel: {
            position: 'absolute',
            borderRadius: scaleSize(18),
            paddingHorizontal: scaleSize(16),
            paddingTop: scaleSize(14),
            paddingBottom: scaleSize(4),
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: COLORS.hairline || 'rgba(255,255,255,0.1)',
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: scaleSize(16),
            shadowOffset: { width: 0, height: scaleSize(12) },
            elevation: 10,
        },
        infoCaret: {
            position: 'absolute',
            top: scaleSize(-7),
            width: scaleSize(14),
            height: scaleSize(14),
            transform: [{ rotate: '45deg' }],
        },
        infoTitle: {
            color: COLORS.text || '#FFFFFF',
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: scaleSize(15),
            marginBottom: scaleSize(6),
        },
        infoText: {
            color: COLORS.subtext || '#CBD5F5',
            fontFamily: 'Nunito_600SemiBold',
            fontSize: scaleSize(13),
            lineHeight: scaleSize(18),
            marginBottom: scaleSize(12),
        },
    });
