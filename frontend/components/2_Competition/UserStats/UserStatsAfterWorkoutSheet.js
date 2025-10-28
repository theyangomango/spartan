import React, { useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { View, Platform, UIManager, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import UserStatsModal from './UserStatsModal';
import HexagonalStats from './HexagonalStats';
import scaleSize, { ss } from '../../../helper/scaleSize';

// Enable LayoutAnimation on Android (even though UserStatsModal already handles it)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch { }
}

const GROUP_KEYS = ['shoulders', 'chest', 'arms', 'legs', 'back', 'abs'];
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;

function interpHex(from, to, t) {
    const A = from || {}; const B = to || {};
    const out = {};
    GROUP_KEYS.forEach((k) => { out[k] = Math.round(lerp(Number(A[k] || 0), Number(B[k] || 0), t)); });
    out.overall = Math.round((Number(out.shoulders || 0) + Number(out.chest || 0) + Number(out.arms || 0) + Number(out.legs || 0) + Number(out.back || 0) + Number(out.abs || 0)) / 6);
    return out;
}

export default function UserStatsAfterWorkoutSheet({
    visible,
    onClose,
    user,
    fromHexagon,
    toHexagon,
    heightPercent = 0.92,
}) {
    const sheetRef = useRef(null);
    const snapPoint = useMemo(() => {
        if (typeof heightPercent === 'string') return heightPercent;
        // allow 0..1 as percentage, or >1 as px
        if (Number(heightPercent) && Number(heightPercent) <= 1) {
            return `${Math.round(Number(heightPercent) * 100)}%`;
        }
        return `${Math.round(Number(heightPercent) || 92)}%`;
    }, [heightPercent]);
    const snapPoints = useMemo(() => [snapPoint], [snapPoint]);

    // Animation driver for the hex morph and OVR value
    const anim = useRef(new Animated.Value(0)).current; // drives crossfades

    // Drive only the crossfade; indexing is controlled via prop
    useEffect(() => {
        if (!visible) return;
        anim.setValue(0);

        // Crescendo: a flurry of very short taps that grow in intensity
        // Keep independent from fade so visuals stay instant; total ~520ms
        const tids = [];
        const push = (ms, fn) => { const id = setTimeout(() => { try { fn?.(); } catch { } }, ms); tids.push(id); };
        // light flutter
        push(0, () => Haptics.selectionAsync?.());
        push(60, () => Haptics.selectionAsync?.());
        push(120, () => Haptics.selectionAsync?.());
        push(180, () => Haptics.selectionAsync?.());
        // medium pulses
        push(240, () => Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium));
        push(320, () => Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium));
        // heavy finishers
        push(420, () => Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Heavy));
        push(520, () => Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success));

        Animated.timing(anim, {
            toValue: 1,
            duration: 120, // ultra-snappy fade for the polygon
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();

        return () => { tids.forEach((id) => clearTimeout(id)); };
    }, [visible, anim]);

    // Clear any global primed values after the sheet is closed to prevent stale arrows next time
    useEffect(() => {
        if (!visible) {
            try { global.__hexChangeFrom = null; } catch { }
            try { global.__hexChangeTo = null; } catch { }
        }
    }, [visible]);

    // Use target stats immediately in the modal; overlay only for quick visual fade
    const animUser = useMemo(() => {
        const toNow = toHexagon || (global?.__hexChangeTo || null) || (user?.statsHexagon || {});
        return { ...(user || {}), statsHexagon: toNow };
    }, [user, toHexagon]);

    return (
        <BottomSheet
            ref={sheetRef}
            index={visible ? 0 : -1}
            enablePanDownToClose
            onClose={onClose}
            snapPoints={snapPoints}
            backgroundStyle={{
                backgroundColor: require("../../../theme/mfpDark").default.bg,
                borderTopLeftRadius: scaleSize(25),
                borderTopRightRadius: scaleSize(25),
            }} backdropComponent={(props) => (
                <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
            )}
            handleStyle={{ display: 'none' }}
        >
            <View style={{ flex: 1 }}>
                <UserStatsModal
                    user={animUser}
                    toViewProfile={() => { }}
                    hexProps={{
                        // Only show prev values when there is an actual change; otherwise null prevents lingering arrows
                        prevStatsHexagon: (() => {
                            const toNow = toHexagon || (global?.__hexChangeTo || null) || (user?.statsHexagon || {});
                            const eq = (a = {}, b = {}) => (
                                Math.round(a.shoulders || 0) === Math.round(b.shoulders || 0) &&
                                Math.round(a.chest || 0) === Math.round(b.chest || 0) &&
                                Math.round(a.arms || 0) === Math.round(b.arms || 0) &&
                                Math.round(a.legs || 0) === Math.round(b.legs || 0) &&
                                Math.round(a.back || 0) === Math.round(b.back || 0) &&
                                Math.round(a.abs || 0) === Math.round(b.abs || 0)
                            );
                            return (fromHexagon && !eq(fromHexagon, toNow)) ? fromHexagon : null;
                        })(),
                        valueFontBigPx: ss(16),
                        diffHighlightColor: '#F2B84B'
                    }}
                    deferExercises={true}
                    visible={visible}
                />
            </View>
        </BottomSheet>
    );
}
