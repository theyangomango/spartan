import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFooter } from "@gorhom/bottom-sheet";
import LeaderboardModal from "../LeaderboardModal";
import UserStatsModal from "./UserStatsModal";

import { onHexagonUpdate } from "../../../utils/hexagonEvents";

const toDayKey = (d) => {
    try {
        const x = new Date(typeof d === 'number' || typeof d === 'string' ? d : (d?.toMillis?.() ? d.toMillis() : Date.now()));
        x.setHours(0,0,0,0);
        return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    } catch { return ''; }
};

const LeaderboardBottomSheet = ({ isVisible, setIsVisible, user, navigation }) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["94%"], []);
    const [tick, setTick] = useState(0);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current.expand();
        }
    }, [isVisible]);

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
                        for (const s of sets) {
                            const r = Number(s?.reps)||0; const w = Number(s?.weight)||0;
                            if (r>0 && w>0) list.push({ weight: w, reps: r, date: dk, wid });
                        }
                        entry.sets = list;
                        stats[name] = entry;
                    }
                }
            }
        } catch {}
        const latestHex = me?.statsHexagon || u?.statsHexagon || null;
        return { ...u, statsExercises: stats, ...(latestHex ? { statsHexagon: latestHex } : {}) };
    }, [user, (global?.userData?.completedWorkouts || []).length, global?.userData?.statsExercises]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            backdropComponent={renderBackdrop}
            snapPoints={snapPoints}
            handleStyle={{ display: 'none' }}
            backgroundStyle={{ backgroundColor: require('../../../theme/mfpDark').default.surface }}
            enablePanDownToClose
            onClose={() => setIsVisible(false)}
        >
            {effectiveUser && (
                <UserStatsModal
                    key={tick}
                    user={effectiveUser}
                    toViewProfile={toViewProfile}
                />
            )}
        </BottomSheet>
    );
};

export default React.memo(LeaderboardBottomSheet);

const styles = StyleSheet.create({
})
