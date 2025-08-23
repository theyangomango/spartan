import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FastImage from "react-native-fast-image";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../../../firebase.config";

/**
 * Encapsulates participants, viewing, live subscriptions,
 * friend currentWorkout/stats prefetch, and the group menu visibility.
 */
export function useGroupViewing({
    wid,
    meUid,
    userImage,
    userHandle,
    userWorkoutStats,
}) {
    const [participants, setParticipants] = useState([]);
    const [viewing, setViewing] = useState(null); // {uid, handle, image}
    const viewingSelf = !viewing || viewing.uid === meUid;

    // menu
    const [menuVisible, setMenuVisible] = useState(false);
    const openMenu = useCallback(() => setMenuVisible(true), []);
    const closeMenu = useCallback(() => setMenuVisible(false), []);

    // cache & subscriptions for friends' user docs
    const friendCacheRef = useRef(new Map());   // uid -> { workout, stats }
    const friendUnsubsRef = useRef(new Map());  // uid -> unsub

    // force re-render when cache updates
    const [, forceTick] = useState(0);

    // Participants + prefetch each user's currentWorkout/stats
    useEffect(() => {
        if (!wid || !meUid) return;

        const liveRef = collection(db, "workouts", wid, "live");
        const unsubLive = onSnapshot(liveRef, (snap) => {
            const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
            list.sort((a, b) => (a.uid === meUid ? -1 : b.uid === meUid ? 1 : 0));
            setParticipants(list);

            // Unsubscribe stale
            const currentUids = new Set(list.map((m) => m.uid));
            for (const [uid, off] of friendUnsubsRef.current) {
                if (!currentUids.has(uid)) {
                    try { off(); } catch { }
                    friendUnsubsRef.current.delete(uid);
                    friendCacheRef.current.delete(uid);
                }
            }

            // Prefetch friends
            list.forEach((m) => {
                if (m.uid === meUid) return;
                if (!friendUnsubsRef.current.has(m.uid)) {
                    const uUnsub = onSnapshot(doc(db, "users", m.uid), (s) => {
                        const data = s.data() || {};
                        friendCacheRef.current.set(m.uid, {
                            workout: data.currentWorkout || null,
                            stats: data.statsExercises || {},
                        });
                        forceTick((t) => t + 1);
                    });
                    friendUnsubsRef.current.set(m.uid, uUnsub);
                }
            });

            // default viewing: self if unset, or fallback to self if target left
            if (!viewing) {
                const meRow = list.find((m) => m.uid === meUid);
                setViewing(
                    meRow || { uid: meUid, handle: userHandle, image: userImage }
                );
            } else if (!list.find((m) => m.uid === viewing.uid)) {
                const meRow = list.find((m) => m.uid === meUid);
                setViewing(
                    meRow || { uid: meUid, handle: userHandle, image: userImage }
                );
            }
        });

        return () => {
            unsubLive();
            for (const [, off] of friendUnsubsRef.current) {
                try { off(); } catch { }
            }
            friendUnsubsRef.current.clear();
            friendCacheRef.current.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wid, meUid]);

    // Listen for participant selection from ParticipantRow
    useEffect(() => {
        const onPick = (e) => {
            const picked = e?.detail || global.__workoutViewingSelect;
            if (!picked) return;
            setViewing(picked);
            // clear fallback
            global.__workoutViewingSelect = null;
        };

        if (typeof window?.addEventListener === "function") {
            window.addEventListener("workout_viewing_select", onPick);
            return () => window.removeEventListener("workout_viewing_select", onPick);
        } else {
            // RN fallback: poll tiny microtask once after mount
            const t = setInterval(() => {
                if (global.__workoutViewingSelect) onPick();
            }, 200);
            return () => clearInterval(t);
        }
    }, []);


    // Active sources based on viewing
    const cached = !viewingSelf ? friendCacheRef.current.get(viewing?.uid) : null;
    const activeWorkout = viewingSelf ? null : cached?.workout || null;
    const activeStats = viewingSelf ? userWorkoutStats : cached?.stats || {};
    const waitingFriend = !viewingSelf && !activeWorkout;

    // Derived done-state for friend (read-only)
    const friendDoneDerived = useMemo(() => {
        if (viewingSelf || !activeWorkout?.exercises) return null;
        return activeWorkout.exercises.map((ex) =>
            (ex.sets || []).map((s) => Number(s?.weight) > 0 && Number(s?.reps) > 0)
        );
    }, [viewingSelf, activeWorkout]);

    // Decide which workout to expose upstream (self: handled by parent)
    const resolvedActiveWorkout = viewingSelf ? null : activeWorkout;

    // Badge PFP for header (use viewing image, fallback to self)
    const overlayPfp = viewing?.image || userImage || null;

    return {
        participants,
        viewing,
        viewingSelf,
        menuVisible,
        openMenu,
        closeMenu,
        overlayPfp,
        activeWorkout: viewingSelf ? null : resolvedActiveWorkout,
        activeStats,
        friendDoneDerived,
        waitingFriend,
    };
}
