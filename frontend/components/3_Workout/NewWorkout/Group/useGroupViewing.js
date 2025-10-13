import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteDoc } from "firebase/firestore";
import {
    arrayUnion,
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc as fsUpdateDoc,
    orderBy,
} from "firebase/firestore";
import { db } from "../../../../../firebase.config";

const ensureString = (value) => (value == null ? "" : String(value));
const sanitizeParticipant = (payload = {}) => ({
    uid: ensureString(payload.uid || payload.id || ""),
    handle: payload.handle || "",
    image: payload.image || "",
    pfpVersion: payload.pfpVersion || 0,
    updatedAt: payload.updatedAt || 0,
});

const mergeParticipants = (baseList = [], extras = []) => {
    if (!extras.length) return baseList;
    const seen = new Set();
    const ordered = [];
    baseList.forEach((item) => {
        if (!item) return;
        const uid = ensureString(item.uid);
        if (uid && !seen.has(uid)) {
            seen.add(uid);
            ordered.push(item);
        }
    });
    extras.forEach((item) => {
        if (!item) return;
        const uid = ensureString(item.uid);
        if (!uid || seen.has(uid)) return;
        seen.add(uid);
        ordered.push(item);
    });
    return ordered;
};

const areParticipantListsEqual = (a = [], b = []) => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        const prev = a[i] || {};
        const next = b[i] || {};
        if (ensureString(prev.uid) !== ensureString(next.uid)) return false;
        if ((prev.handle || "") !== (next.handle || "")) return false;
        if ((prev.image || "") !== (next.image || "")) return false;
        if ((prev.pfpVersion || 0) !== (next.pfpVersion || 0)) return false;
        if ((prev.updatedAt || 0) !== (next.updatedAt || 0)) return false;
    }
    return true;
};

/**
 * Live group viewing + membership helper
 *
 * - Subscribes to workouts/{wid} (members[]) & workouts/{wid}/live/* (presence)
 * - If `autoJoin`, ensures the caller is added to members and publishes presence
 * - Streams the currently viewed user's currentWorkout & stats
 * - Exposes setViewing(uid) to switch focus
 */
export function useGroupViewing({
    wid,
    meUid,
    userImage,
    userHandle,
    initViewingUid, // default meUid
    autoJoin = true,
    lockToViewingUid = false,
    suppressSelfStream = false,
    enabled = true,
}) {
    const [menuVisible, setMenuVisible] = useState(false);
    const [members, setMembers] = useState([]); // [uid...]
    const [participants, setParticipants] = useState([]); // [{ uid, handle, image, pfpVersion, updatedAt }]
    const [viewingUid, setViewingUid] = useState(initViewingUid || meUid || null);
    // Grace window to avoid snapping back immediately after a manual selection
    const blockSnapBackUntilRef = useRef(0);

    const viewingSelf = viewingUid && meUid && String(viewingUid) === String(meUid);

    const openMenu = useCallback(() => setMenuVisible(true), []);
    const closeMenu = useCallback(() => setMenuVisible(false), []);

    // keep initViewingUid stable on wid change
    useEffect(() => {
        if (!viewingUid && (initViewingUid || meUid)) {
            setViewingUid(initViewingUid || meUid);
        }
    }, [initViewingUid, meUid, viewingUid]);

    // track if we already attempted to join
    const joinedOnceRef = useRef(false);
    const participantCacheRef = useRef(new Map());
    const participantPendingRef = useRef(new Map());
    const workoutPrefetchPendingRef = useRef(new Map());

    useEffect(() => {
        participantCacheRef.current = new Map();
        participantPendingRef.current = new Map();
        workoutPrefetchPendingRef.current = new Map();
    }, [wid]);

    // --- subscribe to workout doc for members array
    useEffect(() => {
        if (!enabled) return;
        if (!wid) return;
        const unsub = onSnapshot(doc(db, "workouts", String(wid)), async (snap) => {
            const data = snap.data() || {};
            const arr = Array.isArray(data?.members) ? data.members : [];
            const norm = arr.map(String);
            setMembers(norm);

            // Do not immediately force jump based on members alone; rely on participants guard below.
            // Participants stream reflects both presence and membership merges.

            // If joining is enabled and we aren't in, add us to members (idempotent)
            if (autoJoin && meUid && norm && !norm.includes(String(meUid)) && !joinedOnceRef.current) {
                try {
                    joinedOnceRef.current = true;
                    await fsUpdateDoc(doc(db, "workouts", String(wid)), {
                        active: true,
                        updatedAt: serverTimestamp(),
                        members: arrayUnion(meUid),
                    });
                } catch {
                    // if doc didn't exist, create it
                    try {
                        await setDoc(
                            doc(db, "workouts", String(wid)),
                            {
                                wid: String(wid),
                                creatorUid: meUid,
                                active: true,
                                members: [meUid],
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp(),
                            },
                            { merge: true }
                        );
                    } catch (e) {
                        console.log("joinGroup setDoc error", e);
                    }
                }
            }
        });
        return () => unsub();
        // include viewingUid so we can react to member loss cleanly
    }, [wid, meUid, autoJoin, viewingUid, enabled]);

    // --- presence publisher: workouts/{wid}/live/{meUid} (only if autoJoin)
    useEffect(() => {
        if (!enabled) return;
        if (!wid || !meUid || !autoJoin) return;
        let t = null;

        const publish = async () => {
            try {
                await setDoc(
                    doc(db, "workouts", String(wid), "live", String(meUid)),
                    {
                        uid: String(meUid),
                        handle: userHandle || "",
                        image: userImage || "",
                        updatedAt: serverTimestamp(),
                    },
                    { merge: true }
                );
            } catch (e) {
                console.log("publish presence error", e);
            }
        };

        // publish once quickly
        t = setTimeout(publish, 250);
        return () => {
            if (t) clearTimeout(t);
            // best-effort clean-up when leaving this screen
            try { deleteDoc(doc(db, "workouts", String(wid), "live", String(meUid))); } catch { }
        };
    }, [wid, meUid, userHandle, userImage, autoJoin, enabled]);

    // --- subscribe to presence list (live subcollection)
    const commitParticipants = useCallback((nextList) => {
        setParticipants((prev) => (areParticipantListsEqual(prev, nextList) ? prev : nextList));
    }, []);

    const fetchMemberProfile = useCallback(async (uid) => {
        const key = ensureString(uid);
        if (!key) return sanitizeParticipant({ uid: key });
        if (participantCacheRef.current.has(key)) {
            return participantCacheRef.current.get(key);
        }

        if (participantPendingRef.current.has(key)) {
            try {
                return await participantPendingRef.current.get(key);
            } catch {
                return sanitizeParticipant({ uid: key });
            }
        }

        const pending = getDoc(doc(db, "users", key))
            .then((snap) => {
                const data = snap.exists() ? snap.data() : {};
                const profile = sanitizeParticipant({
                    uid: key,
                    handle: data?.handle || "",
                    image: data?.pfp || data?.photoURL || data?.image || "",
                    pfpVersion: data?.pfpVersion || 0,
                    updatedAt: 0,
                });
                participantCacheRef.current.set(key, profile);
                return profile;
            })
            .catch(() => {
                const fallback = sanitizeParticipant({ uid: key });
                participantCacheRef.current.set(key, fallback);
                return fallback;
            })
            .finally(() => {
                participantPendingRef.current.delete(key);
            });

        participantPendingRef.current.set(key, pending);
        try {
            return await pending;
        } catch {
            return sanitizeParticipant({ uid: key });
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        if (!wid) return;
        let cancelled = false;
        let requestId = 0;

        const qLive = query(collection(db, "workouts", String(wid), "live"), orderBy("updatedAt", "desc"));
        const unsub = onSnapshot(qLive, (snap) => {
            const rows = snap.docs.map((d) => {
                const payload = d.data() || {};
                const timestamp = payload?.updatedAt?.toMillis?.() || 0;
                return sanitizeParticipant({
                    id: d.id,
                    ...payload,
                    updatedAt: timestamp,
                });
            });

            const presentSet = new Set(rows.map((entry) => ensureString(entry.uid)));
            const missing = (members || []).filter((m) => !presentSet.has(ensureString(m)));

            const cachedExtras = [];
            const pendingUids = [];
            missing.forEach((uid) => {
                const key = ensureString(uid);
                if (!key) return;
                const cached = participantCacheRef.current.get(key);
                if (cached) cachedExtras.push(cached);
                else pendingUids.push(key);
            });

            const baseList = mergeParticipants(rows, cachedExtras);
            commitParticipants(baseList);

            if (!pendingUids.length) return;

            const currentRequest = ++requestId;
            Promise.all(pendingUids.map((uid) => fetchMemberProfile(uid)))
                .then((fetched) => {
                    if (cancelled || currentRequest !== requestId) return;
                    const merged = mergeParticipants(rows, [...cachedExtras, ...fetched]);
                    commitParticipants(merged);
                })
                .catch(() => {
                    // keep baseList; errors already cached as empty profiles
                });
        });

        return () => {
            cancelled = true;
            requestId += 1;
            unsub();
        };
    }, [wid, members, enabled, commitParticipants, fetchMemberProfile]);

    // --- stream the active user's current workout + stats for viewing
    const [activeWorkout, setActiveWorkout] = useState(null);
    const [activeStats, setActiveStats] = useState({});
    const [overlayPfp, setOverlayPfp] = useState(null);
    const [waitingFriend, setWaitingFriend] = useState(false);
    const activeCacheRef = useRef(new Map());

    useEffect(() => {
        activeCacheRef.current = new Map();
    }, [wid]);

    const prefetchParticipantWorkout = useCallback((rawUid) => {
        if (!enabled) return;
        const key = ensureString(rawUid);
        if (!key) return;
        if (suppressSelfStream && ensureString(meUid) === key) return;
        if (activeCacheRef.current.has(key)) return;
        if (workoutPrefetchPendingRef.current.has(key)) return;

        const pending = getDoc(doc(db, "users", key))
            .then((snap) => {
                const data = snap.exists() ? snap.data() : {};
                const nextWorkout = data?.currentWorkout || null;
                const p = data?.pfp || data?.photoURL || data?.image || data?.avatar || "";
                activeCacheRef.current.set(key, { workout: nextWorkout, stats: {}, pfp: p || null });

                if (ensureString(viewingUid) === key) {
                    const isSelf = meUid && key === String(meUid);
                    const statsPayload = isSelf ? (data?.statsExercises || {}) : {};
                    setActiveWorkout(nextWorkout);
                    setActiveStats(statsPayload);
                    setOverlayPfp(p || null);
                    setWaitingFriend(false);
                }
            })
            .catch(() => {})
            .finally(() => {
                workoutPrefetchPendingRef.current.delete(key);
            });

        workoutPrefetchPendingRef.current.set(key, pending);
    }, [enabled, suppressSelfStream, meUid, viewingUid]);

    useEffect(() => {
        if (!enabled) return;
        (participants || []).forEach((participant) => {
            const uid = ensureString(participant?.uid);
            if (!uid) return;
            prefetchParticipantWorkout(uid);
        });
    }, [participants, enabled, prefetchParticipantWorkout]);

    useEffect(() => {
        if (!enabled) return;
        prefetchParticipantWorkout(viewingUid);
    }, [viewingUid, enabled, prefetchParticipantWorkout]);

    useEffect(() => {
        if (!viewingUid) return;
        const match = (participants || []).find((p) => ensureString(p?.uid) === ensureString(viewingUid));
        const fallbackImage = ensureString(match?.image || "");
        if (!fallbackImage) return;
        setOverlayPfp((prev) => (prev && ensureString(prev) === fallbackImage ? prev : fallbackImage));
    }, [participants, viewingUid]);

    useEffect(() => {
        if (!enabled) {
            setWaitingFriend(false);
            return;
        }
        if (!viewingUid) {
            setActiveWorkout(null);
            setActiveStats({});
            setOverlayPfp(null);
            setWaitingFriend(false);
            return;
        }
        const key = String(viewingUid);
        const isSelf = meUid && key === String(meUid);
        if (suppressSelfStream && isSelf) {
            setActiveWorkout(null);
            setOverlayPfp(null);
            setActiveStats({});
            setWaitingFriend(false);
            return;
        }

        const cached = activeCacheRef.current.get(key);
        if (cached) {
            setActiveWorkout(cached.workout || null);
            setActiveStats(cached.stats || {});
            setOverlayPfp(cached.pfp || null);
            setWaitingFriend(false);
        } else {
            setWaitingFriend(true);
        }
    }, [viewingUid, suppressSelfStream, meUid, enabled]);

    useEffect(() => {
        if (!enabled) return undefined;
        const key = String(viewingUid || "");
        if (!key) return undefined;
        const isSelf = meUid && key === String(meUid);
        if (suppressSelfStream && isSelf) return undefined;

        let unsub = null;
        try {
            unsub = onSnapshot(doc(db, "users", key), (snap) => {
                const data = snap.data() || {};
                const nextWorkout = data?.currentWorkout || null;
                const nextStats = isSelf ? (data?.statsExercises || {}) : {};
                const p = data?.pfp || data?.photoURL || data?.image || data?.avatar || "";
                activeCacheRef.current.set(key, { workout: nextWorkout, stats: nextStats, pfp: p || null });
                setActiveWorkout(nextWorkout);
                setActiveStats(nextStats);
                setOverlayPfp(p || null);
                setWaitingFriend(false);
            });
        } catch (error) {
            console.log("useGroupViewing snapshot error", error?.message || error);
        }

        return () => {
            if (unsub) {
                try { unsub(); } catch {}
            }
        };
    }, [viewingUid, enabled, suppressSelfStream, meUid]);

    // --- HARD GUARD 1: if the currently viewed user's currentWorkout is missing or mismatched, jump back to me
    // Skip this guard while we are still waiting for the selected friend's snapshot to arrive.
    useEffect(() => {
        if (!enabled) return;
        if (!wid || viewingSelf || lockToViewingUid) return;
        if (Date.now() < blockSnapBackUntilRef.current) return; // temporary grace
        if (waitingFriend) return; // allow a grace window while fetching friend state
        const currWid = String(activeWorkout?.wid || "");
        const targetWid = String(wid || "");
        if (!activeWorkout || !currWid || currWid !== targetWid) {
            if (meUid) setViewingUid(String(meUid));
        }
    }, [wid, activeWorkout, viewingSelf, meUid, lockToViewingUid, enabled, waitingFriend]);

    // --- HARD GUARD 2: if the viewed uid drops out of participants (left/cancelled), jump back to me
    useEffect(() => {
        if (!enabled) return;
        if (lockToViewingUid) return;
        if (Date.now() < blockSnapBackUntilRef.current) return; // temporary grace
        if (waitingFriend) return; // avoid races while switching view
        if (!participants || !participants.length) return;
        const vu = String(viewingUid || "");
        if (!vu) return;
        const present = participants.some((p) => String(p?.uid) === vu);
        if (!present && meUid) {
            setViewingUid(String(meUid));
        }
    }, [participants, viewingUid, meUid, lockToViewingUid, enabled, waitingFriend]);

    const friendDoneDerived = useMemo(() => 0, [activeWorkout]);

    const setViewing = useCallback((uid) => {
        try {
            blockSnapBackUntilRef.current = Date.now() + 2000; // 2s grace after manual select
        } catch {}
        setViewingUid(uid);
        closeMenu();
    }, [closeMenu]);

    const viewing = useMemo(() => {
        const found = (participants || []).find((p) => String(p.uid) === String(viewingUid));
        if (found) return found;
        if (viewingUid) return { uid: String(viewingUid), handle: "", image: "", pfpVersion: 0, updatedAt: 0 };
        return null;
    }, [participants, viewingUid]);

    return {
        viewing,
        viewingSelf,
        participants,
        menuVisible,
        openMenu,
        closeMenu,
        overlayPfp,
        activeWorkout,
        activeStats,
        friendDoneDerived,
        waitingFriend,
        setViewing,
        members,
    };
}
