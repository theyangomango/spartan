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

    // --- subscribe to workout doc for members array
    useEffect(() => {
        if (!enabled) return;
        if (!wid) return;
        const unsub = onSnapshot(doc(db, "workouts", String(wid)), async (snap) => {
            const data = snap.data() || {};
            const arr = Array.isArray(data?.members) ? data.members : [];
            const norm = arr.map(String);
            setMembers(norm);

            // If currently viewing someone who is not a member anymore, jump back to me
            if (viewingUid && !norm.includes(String(viewingUid)) && meUid) {
                setViewingUid(String(meUid));
            }

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
    useEffect(() => {
        if (!enabled) return;
        if (!wid) return;
        const qLive = query(collection(db, "workouts", String(wid), "live"), orderBy("updatedAt", "desc"));
        const unsub = onSnapshot(qLive, async (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

            // Normalize presence entries
            const norm = rows.map((r) => ({
                uid: String(r?.uid || r?.id || ""),
                handle: r?.handle || "",
                image: r?.image || "",
                pfpVersion: r?.pfpVersion || 0,
                updatedAt: r?.updatedAt?.toMillis?.() || 0,
            }));

            // Merge with members to ensure everyone shows
            const seen = new Set(norm.map((n) => n.uid));
            const missing = (members || []).filter((m) => !seen.has(String(m)));

            let merged = norm;
            if (missing.length) {
                const add = await Promise.all(
                    missing.map(async (uid) => {
                        try {
                            const u = await getDoc(doc(db, "users", String(uid)));
                            const data = u.exists() ? u.data() : {};
                            return {
                                uid: String(uid),
                                handle: data?.handle || "",
                                image: data?.pfp || data?.photoURL || data?.image || "",
                                pfpVersion: data?.pfpVersion || 0,
                                updatedAt: 0,
                            };
                        } catch {
                            return { uid: String(uid), handle: "", image: "", pfpVersion: 0, updatedAt: 0 };
                        }
                    })
                );
                merged = [...norm, ...add];
            }
            setParticipants(merged);
        });
        return () => unsub();
    }, [wid, members, enabled]);

    // --- stream the active user's current workout + stats for viewing
    const [activeWorkout, setActiveWorkout] = useState(null);
    const [activeStats, setActiveStats] = useState({});
    const [overlayPfp, setOverlayPfp] = useState(null);
    const [waitingFriend, setWaitingFriend] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        if (!viewingUid) return;
        const isSelf = meUid && String(viewingUid) === String(meUid);
        if (suppressSelfStream && isSelf) {
            // when suppressed, clear activeWorkout/overlay to avoid stale friend UI
            setActiveWorkout(null);
            setOverlayPfp(null);
            setActiveStats({});
            setWaitingFriend(false);
            return;
        }
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
    }, [viewingUid, suppressSelfStream, meUid, enabled]);

    // --- HARD GUARD 1: if the currently viewed user's currentWorkout is missing or mismatched, jump back to me
    useEffect(() => {
        if (!enabled) return;
        if (!wid || viewingSelf || lockToViewingUid) return;
        const currWid = String(activeWorkout?.wid || "");
        const targetWid = String(wid || "");
        if (!activeWorkout || !currWid || currWid !== targetWid) {
            if (meUid) setViewingUid(String(meUid));
        }
    }, [wid, activeWorkout, viewingSelf, meUid, lockToViewingUid, enabled]);

    // --- HARD GUARD 2: if the viewed uid drops out of participants (left/cancelled), jump back to me
    useEffect(() => {
        if (!enabled) return;
        if (lockToViewingUid) return;
        if (!participants || !participants.length) return;
        const vu = String(viewingUid || "");
        if (!vu) return;
        const present = participants.some((p) => String(p?.uid) === vu);
        if (!present && meUid) {
            setViewingUid(String(meUid));
        }
    }, [participants, viewingUid, meUid, lockToViewingUid, enabled]);

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
