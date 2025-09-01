// components/Tracking/Group/useGroupViewing.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
 * - Ensures the caller is added to members if `autoJoin` is true
 * - Publishes caller's presence to workouts/{wid}/live/{meUid}
 * - Lets you switch "viewing" to any participant (and streams their current workout)
 */
export function useGroupViewing({
    wid,
    meUid,
    userImage,
    userHandle,
    initViewingUid, // optional (default meUid). Use friend's uid when opening as viewer.
    autoJoin = true,
}) {
    const [menuVisible, setMenuVisible] = useState(false);
    const [members, setMembers] = useState([]); // [uid, uid...]
    const [participants, setParticipants] = useState([]); // [{ uid, handle, pfp, pfpVersion, updatedAt }]
    const [viewingUid, setViewingUid] = useState(initViewingUid || meUid || null);

    const viewingSelf = viewingUid && meUid && String(viewingUid) === String(meUid);

    const openMenu = useCallback(() => setMenuVisible(true), []);
    const closeMenu = useCallback(() => setMenuVisible(false), []);

    // track if we already attempted to join
    const joinedOnceRef = useRef(false);

    // --- subscribe to workout doc for members array
    useEffect(() => {
        if (!wid) return;
        const unsub = onSnapshot(doc(db, "workouts", String(wid)), async (snap) => {
            const data = snap.data() || {};
            const arr = Array.isArray(data?.members) ? data.members : [];
            setMembers(arr.map(String));

            // If joining is enabled and we aren't in, add us to members (idempotent)
            if (autoJoin && meUid && arr && !arr.includes(meUid) && !joinedOnceRef.current) {
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
    }, [wid, meUid, autoJoin]);

    // --- presence publisher: workouts/{wid}/live/{meUid} (only if joined)
    useEffect(() => {
        if (!wid || !meUid) return;
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

        // publish once quickly; caller can republish on local changes as needed
        t = setTimeout(publish, 250);
        return () => t && clearTimeout(t);
    }, [wid, meUid, userHandle, userImage]);

    // --- subscribe to presence list (live subcollection)
    useEffect(() => {
        if (!wid) return;
        const qLive = query(collection(db, "workouts", String(wid), "live"), orderBy("updatedAt", "desc"));
        const unsub = onSnapshot(qLive, async (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
            // If no presence rows yet but we do have members, fill from user docs
            if (!rows.length && members.length) {
                // Fallback: load bare bones from users docs
                const loaded = await Promise.all(
                    members.map(async (uid) => {
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
                setParticipants(loaded);
                return;
            }

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
                setParticipants([...norm, ...add]);
            } else {
                setParticipants(norm);
            }
        });
        return () => unsub();
    }, [wid, members]);

    // --- stream the active user's current workout + stats for viewing
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

    const friendDoneDerived = useMemo(() => {
        // Optional—kept for compatibility with code referencing it
        return 0;
    }, [activeWorkout]);

    const setViewing = useCallback((uid) => {
        setViewingUid(uid);
        closeMenu();
    }, [closeMenu]);

    return {
        viewing: participants.find((p) => String(p.uid) === String(viewingUid)) || null,
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
        setViewing, // call with uid to switch who you're viewing
    };
}
