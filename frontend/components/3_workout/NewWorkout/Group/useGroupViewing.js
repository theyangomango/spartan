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

/* Normalize any member entry to a UID string */
const asUid = (x) => {
    if (typeof x === "string" || typeof x === "number") return String(x);
    if (x && typeof x === "object") return String(x.uid || x.id || "");
    return "";
};

/* A small grace window for considering the group "active-ish" based on workout.updatedAt */
const GROUP_ACTIVE_GRACE_MS = 2 * 60 * 1000; // 2 min

/**
 * Live group viewing + membership helper
 *
 * - Subscribes to workouts/{wid} (members[], active, updatedAt) & workouts/{wid}/live/* (presence)
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
}) {
    const [menuVisible, setMenuVisible] = useState(false);
    const [members, setMembers] = useState([]); // [uid strings]
    const [participants, setParticipants] = useState([]); // [{ uid, handle, image, pfpVersion, updatedAt }]
    const [viewingUid, setViewingUid] = useState(initViewingUid || meUid || null);

    // track group meta to decide whether to synthesize members into participants
    const [groupActive, setGroupActive] = useState(false);
    const [groupUpdatedAt, setGroupUpdatedAt] = useState(0);

    const viewingSelf = viewingUid && meUid && String(viewingUid) === String(meUid);

    const openMenu = useCallback(() => setMenuVisible(true), []);
    const closeMenu = useCallback(() => setMenuVisible(false), []);

    useEffect(() => {
        if (!viewingUid && (initViewingUid || meUid)) {
            setViewingUid(initViewingUid || meUid);
        }
    }, [initViewingUid, meUid, viewingUid]);

    const joinedOnceRef = useRef(false);

    // subscribe to workout doc for members array + meta (robust normalization)
    useEffect(() => {
        if (!wid) return;
        const unsub = onSnapshot(doc(db, "workouts", String(wid)), async (snap) => {
            const data = snap.data() || {};
            const arr = Array.isArray(data?.members) ? data.members : [];
            const norm = arr.map(asUid).filter(Boolean);
            setMembers(norm);

            // meta
            const active = !!data?.active;
            const upd = data?.updatedAt?.toMillis?.() || 0;
            setGroupActive(active);
            setGroupUpdatedAt(upd);

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
    }, [wid, meUid, autoJoin]);

    // presence publisher / cleanup
    useEffect(() => {
        if (!wid || !meUid) return;
        let t = null;
        const presenceRef = doc(db, "workouts", String(wid), "live", String(meUid));

        const publish = async () => {
            try {
                await setDoc(
                    presenceRef,
                    { uid: String(meUid), handle: userHandle || "", image: userImage || "", updatedAt: serverTimestamp() },
                    { merge: true }
                );
            } catch (e) { console.log("publish presence error", e); }
        };

        if (autoJoin) {
            t = setTimeout(publish, 250);
            return () => {
                if (t) clearTimeout(t);
                try { deleteDoc(presenceRef); } catch { }
            };
        }

        // viewing-only: proactively delete any stale presence for me
        (async () => { try { await deleteDoc(presenceRef); } catch { } })();
        return () => { };
    }, [wid, meUid, userHandle, userImage, autoJoin]);

    // subscribe to presence and (conditionally) merge with normalized members
    useEffect(() => {
        if (!wid) return;
        const qLive = query(collection(db, "workouts", String(wid), "live"), orderBy("updatedAt", "desc"));
        const unsub = onSnapshot(qLive, async (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

            // Normalize presence entries
            const normLive = rows.map((r) => ({
                uid: asUid(r?.uid || r?.id),
                handle: r?.handle || "",
                image: r?.image || "",
                pfpVersion: r?.pfpVersion || 0,
                updatedAt: r?.updatedAt?.toMillis?.() || 0,
            })).filter((r) => !!r.uid);

            // Only synthesize "missing" members if we are actually live (active/very recent)
            const now = Date.now();
            const looksActiveNow = groupActive || (groupUpdatedAt && (now - groupUpdatedAt) <= GROUP_ACTIVE_GRACE_MS);
            const shouldMergeMembers = autoJoin || looksActiveNow;

            let merged = normLive;
            if (shouldMergeMembers) {
                const seen = new Set(normLive.map((n) => n.uid));
                const missing = (members || []).filter((m) => !seen.has(m));
                if (missing.length) {
                    const add = await Promise.all(
                        missing.map(async (uid) => {
                            try {
                                const u = await getDoc(doc(db, "users", uid));
                                const data = u.exists() ? u.data() : {};
                                return {
                                    uid,
                                    handle: data?.handle || "",
                                    image: data?.pfp || data?.photoURL || data?.image || "",
                                    pfpVersion: data?.pfpVersion || 0,
                                    updatedAt: 0, // not live — derived from membership only
                                };
                            } catch {
                                return { uid, handle: "", image: "", pfpVersion: 0, updatedAt: 0 };
                            }
                        })
                    );
                    merged = [...normLive, ...add];
                }
            }

            setParticipants(merged);
        });
        return () => unsub();
    }, [wid, members, autoJoin, groupActive, groupUpdatedAt]);

    // stream the currently viewed user
    const [activeWorkout, setActiveWorkout] = useState(null);
    const [activeStats, setActiveStats] = useState({});
    const [overlayPfp, setOverlayPfp] = useState(null);
    const [waitingFriend, setWaitingFriend] = useState(false);

    useEffect(() => {
        if (!viewingUid) return;
        setWaitingFriend(true);
        const unsub = onSnapshot(doc(db, "users", String(viewingUid)), (snap) => {
            const data = snap.data() || {};
            setActiveWorkout(data?.currentWorkout || null);
            setActiveStats(data?.statsExercises || {});
            const p = data?.pfp || data?.photoURL || data?.image || data?.avatar || "";
            setOverlayPfp(p || null);
            setWaitingFriend(false);
        });
        return () => unsub();
    }, [viewingUid]);

    const friendDoneDerived = useMemo(() => 0, [activeWorkout]);

    const setViewing = useCallback((uid) => {
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
