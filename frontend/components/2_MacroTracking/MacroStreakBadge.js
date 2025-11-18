import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import scaleSize from "../../helper/scaleSize";
import { scaledSize } from '../2_Competition/UserStats/UserStatsStyles';
import { strong as haptic } from '../../utils/haptics';
import { getUnifiedHeaderMetrics } from '../../theme/headerMetrics';

const METRICS = getUnifiedHeaderMetrics();
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MacroStreakBadge({ streakCount = 0, COLORS = {}, style }) {
    const streakColor = COLORS?.streak || '#FF6C1A';
    const withAlpha = useCallback((hex, alpha) => {
        if (typeof hex !== 'string') return null;
        const trimmed = hex.trim();
        if (!/^#([0-9a-fA-F]{6})$/.test(trimmed)) return null;
        return `${trimmed}${alpha}`;
    }, []);
    const streakBgColor = withAlpha(streakColor, '26') || 'rgba(255,108,26,0.18)';
    const streakBorderColor = withAlpha(streakColor, '85') || 'rgba(255,108,26,0.52)';
    const styles = useMemo(
        () => makeStyles(COLORS, streakBgColor, streakBorderColor),
        [COLORS, streakBgColor, streakBorderColor]
    );
    const pillRef = useRef(null);
    const [infoPanelVisible, setInfoPanelVisible] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0, width: 0, height: 0 });
    const panelScale = useRef(new Animated.Value(0.96)).current;
    const panelOpacity = useRef(new Animated.Value(0)).current;
    const displayStreak = useMemo(() => {
        const value = Number(streakCount);
        if (!Number.isFinite(value) || value < 0) return 0;
        return Math.round(value);
    }, [streakCount]);
    const pillOpacity = displayStreak > 0 ? 1 : 0.75;
    const streakLabel = `${displayStreak}`;

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
    const minTop = METRICS.paddingTop + scaleSize(40);
    const safeTop = Math.min(Math.max(rawTop, minTop), SCREEN_HEIGHT - scaleSize(200));
    const caretLeft = Math.max(
        scaleSize(18),
        Math.min(panelWidth - scaleSize(22), (centerX - safeLeft) - scaleSize(7))
    );
    const panelBackground = COLORS.card || 'rgba(15,23,42,0.95)';

    return (
        <>
            <Pressable
                ref={pillRef}
                onPress={openStreakPanel}
                hitSlop={8}
                style={[styles.streakPill, style, { opacity: pillOpacity }]}
            >
                <Ionicons name="flame" size={scaledSize(16)} color={streakColor} />
                <Text style={[styles.streakText, { color: streakColor }]}>
                    {streakLabel}
                </Text>
            </Pressable>
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
                                backgroundColor: panelBackground,
                            },
                        ]}
                    >
                        <View style={[styles.infoCaret, { left: caretLeft, backgroundColor: panelBackground }]} />
                        <Text style={styles.infoTitle}>Macro streak</Text>
                        <Text style={styles.infoText}>
                            Tracks consecutive days you log food. Miss a day and the streak resets.
                        </Text>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
}

const makeStyles = (COLORS, streakBgColor, streakBorderColor) =>
    StyleSheet.create({
        streakPill: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: scaleSize(14),
            paddingVertical: scaleSize(4),
            borderRadius: scaleSize(18),
            backgroundColor: streakBgColor,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: streakBorderColor,
        },
        streakText: {
            marginLeft: scaleSize(4),
            fontFamily: 'Poppins_600SemiBold',
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
