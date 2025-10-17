import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useSharedValue, useAnimatedReaction } from "react-native-reanimated";
import { useWindowDimensions, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import UserStatsModal from "./UserStatsModal";
import scaleSize from "../../../helper/scaleSize";

import { onHexagonUpdate } from "../../../utils/hexagonEvents";
import { coercePrivacyMode } from "../../../utils/workoutPrivacy";

const toDayKey = (d) => {
    try {
        const x = new Date(typeof d === 'number' || typeof d === 'string' ? d : (d?.toMillis?.() ? d.toMillis() : Date.now()));
        x.setHours(0, 0, 0, 0);
        return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    } catch { return ''; }
};

const UserStatsBottomSheet = ({ isVisible, setIsVisible, user, navigation, sheetProgressSV }) => {
    const bottomSheetRef = useRef(null);
    const { height: windowHeight } = useWindowDimensions();
    const { top: insetTop = 0 } = useSafeAreaInsets();
    const snapPoints = useMemo(() => {
        const fullHeight = Math.max(0, windowHeight + insetTop);
        return [fullHeight];
    }, [windowHeight, insetTop]);
    const isFullHeight = snapPoints[0] >= windowHeight + insetTop - 1;
    const [tick, setTick] = useState(0);
    const animatedIndexSV = useSharedValue(-1);
    const animatedPositionSV = useSharedValue(0);
    const openPositionSV = useSharedValue(0);
    const closePositionSV = useSharedValue(1);

    useAnimatedReaction(
        () => animatedIndexSV.value,
        (value) => {
            const currentPos = animatedPositionSV.value;
            if (currentPos === undefined || currentPos === null) return;
            if (value === 0) {
                openPositionSV.value = currentPos;
            } else if (value <= -1) {
                closePositionSV.value = currentPos;
            }
        },
        []
    );

    useAnimatedReaction(
        () => animatedPositionSV.value,
        (position) => {
            if (!sheetProgressSV) return;
            if (position === undefined || position === null) return;
            const openPos = openPositionSV.value;
            let closePos = closePositionSV.value;
            if (position > openPos && position > closePos) {
                closePos = position;
                closePositionSV.value = closePos;
            }
            if (closePos <= openPos) closePos = openPos + 1;
            const span = closePos - openPos;
            const normalized = span > 0 ? 1 - ((position - openPos) / span) : 1;
            let clamped = normalized;
            if (clamped < 0) clamped = 0;
            if (clamped > 1) clamped = 1;
            sheetProgressSV.value = clamped;
        },
        [sheetProgressSV]
    );

    const renderHandle = useCallback(() => null, []);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                style={[props.style, { backgroundColor: "rgba(10, 22, 42, 0.68)" }]}
            />
        ),
        []
    );

    useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current?.expand();
        } else if (sheetProgressSV) {
            sheetProgressSV.value = 0;
        }
    }, [isVisible, sheetProgressSV, windowHeight]);

    // Live refresh when hexagon changes elsewhere in the app
    useEffect(() => {
        const off = onHexagonUpdate(() => setTick((t) => t + 1));
        return () => off && off();
    }, []);

    function toViewProfile() {
        const u = user || global?.userData;
        if (!u) return;
        navigation.navigate('ViewProfile', {
            user: {
                handle: u.handle,
                name: u.name,
                pfp: u.pfp || u.image,
                uid: u.uid,
            },
        });
    }

    const effectiveUser = useMemo(() => {
        const u = user || global?.userData;
        const me = global?.userData;
        if (!u || !me) return u;
        if (String(u?.uid || '') !== String(me?.uid || '')) return u; // viewing someone else

        // Merge latest completed workout sets into statsExercises (in-memory only)
        const stats = { ...(u?.statsExercises || {}) };
        try {
            const cws = Array.isArray(me?.completedWorkouts) ? me.completedWorkouts : [];
            if (cws.length) {
                const cw = cws[cws.length - 1];
                const wid = String(cw?.wid || cw?.id || '');
                const dk = toDayKey(cw?.created || cw?.createdAt || Date.now());
                const exs = Array.isArray(cw?.exercises) ? cw.exercises : [];
                for (const ex of exs) {
                    const name = String(ex?.name || '').trim(); if (!name) continue;
                    const sets = Array.isArray(ex?.sets) ? ex.sets : [];
                    if (!sets.length) continue;
                    const entry = { ...(stats[name] || {}) };
                    const list = Array.isArray(entry.sets) ? entry.sets.slice() : [];
                    const lastWid = list.length ? list[list.length - 1]?.wid : null;
                    if (lastWid !== wid) {
                        const setPrivacy = coercePrivacyMode(cw?.privacyMode);
                        for (const s of sets) {
                            const r = Number(s?.reps) || 0; const w = Number(s?.weight) || 0;
                            if (r > 0 && w > 0) list.push({ weight: w, reps: r, date: dk, wid, privacyMode: setPrivacy });
                        }
                        entry.sets = list;
                        stats[name] = entry;
                    }
                }
            }
        } catch { }
        const latestHex = me?.statsHexagon || u?.statsHexagon || null;
        return { ...u, statsExercises: stats, ...(latestHex ? { statsHexagon: latestHex } : {}) };
    }, [user, (global?.userData?.completedWorkouts || []).length, global?.userData?.statsExercises]);

    const handleDetailActiveChange = useCallback(() => {
        /* keep header styling static when detail overlay opens */
    }, []);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            animatedIndex={animatedIndexSV}
            animatedPosition={animatedPositionSV}
            backdropComponent={renderBackdrop}
            snapPoints={snapPoints}
            handleComponent={renderHandle}
            handleHeight={0}
            backgroundStyle={{
                backgroundColor: require("../../../theme/mfpDark").default.bg,
                borderTopLeftRadius: isFullHeight ? 0 : scaleSize(25),
                borderTopRightRadius: isFullHeight ? 0 : scaleSize(25),
            }}
            containerStyle={{ marginTop: -insetTop }}
            enablePanDownToClose
            onClose={() => {
                setIsVisible(false);
            }}
        >
            {effectiveUser && (
                <UserStatsModal
                    key={tick}
                    user={effectiveUser}
                    toViewProfile={toViewProfile}
                    visible={isVisible}
                    onDetailActiveChange={handleDetailActiveChange}
                />
            )}
        </BottomSheet>
    );
};

export default React.memo(UserStatsBottomSheet);
