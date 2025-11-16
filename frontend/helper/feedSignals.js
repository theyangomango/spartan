import { useEffect, useMemo, useState } from "react";
import {
    addDoc,
    collection,
    doc,
    increment,
    onSnapshot,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";

import { db } from "../../firebase.config";
import { getViewerUid } from "../utils/userRefs";
import { subscribeUserData } from "../utils/userDataEvents";

const EVENTS_COLLECTION = "userSignals";
const EVENT_SUBCOLLECTION = "events";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const noop = () => {};

export const logFeedSignal = async (event, metadata = {}, uidOverride = null) => {
    if (!event) return;
    const uid = uidOverride || getViewerUid();
    if (!uid) return;

    try {
        const col = collection(db, EVENTS_COLLECTION, uid, EVENT_SUBCOLLECTION);
        await addDoc(col, {
            event,
            metadata: metadata && typeof metadata === "object" ? metadata : {},
            createdAt: serverTimestamp(),
            clientTs: Date.now(),
        });
    } catch (error) {
        console.warn?.("feedSignals: failed to log event", event, error?.message || error);
    }
};

export const incrementUserSignalCounter = async (fieldPath, amount = 1, uidOverride = null) => {
    if (!fieldPath || !Number.isFinite(amount) || amount === 0) return;
    const uid = uidOverride || getViewerUid();
    if (!uid) return;
    const docRef = doc(db, EVENTS_COLLECTION, uid);
    try {
        await setDoc(docRef, { uid, updatedAt: serverTimestamp() }, { merge: true });
        await updateDoc(docRef, {
            [fieldPath]: increment(amount),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.warn?.("feedSignals: failed to increment", fieldPath, error?.message || error);
    }
};

export const bumpAffinityForUser = async (targetUid, metric = "likesPast7dByUid", delta = 1) => {
    if (!targetUid || !metric || !Number.isFinite(delta) || delta === 0) return;
    const safeUid = String(targetUid);
    if (!safeUid) return;
    await incrementUserSignalCounter(`${metric}.${safeUid}`, delta);
};

const subscribeViewerUid = (setUid) => {
    try {
        const unsubscribe = subscribeUserData(() => {
            setUid(getViewerUid());
        });
        return unsubscribe || noop;
    } catch {
        return noop;
    }
};

export const useFeedSignalStats = () => {
    const [viewerUid, setViewerUid] = useState(() => getViewerUid());
    const [snapshot, setSnapshot] = useState(null);

    useEffect(() => {
        return subscribeViewerUid(setViewerUid);
    }, []);

    useEffect(() => {
        if (!viewerUid) {
            setSnapshot(null);
            return undefined;
        }
        const ref = doc(db, EVENTS_COLLECTION, viewerUid);
        const unsubscribe = onSnapshot(ref, (snap) => {
            if (snap?.exists()) {
                setSnapshot(snap.data() || null);
                try { global.__userSignals = snap.data() || null; } catch { }
            } else {
                setSnapshot(null);
            }
        });
        return () => {
            try { unsubscribe(); } catch { }
        };
    }, [viewerUid]);

    useEffect(() => {
        if (!viewerUid) return undefined;
        const interval = setInterval(() => {
            setViewerUid(getViewerUid());
        }, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [viewerUid]);

    return useMemo(() => snapshot || global?.__userSignals || null, [snapshot]);
};

export default {
    logFeedSignal,
    incrementUserSignalCounter,
    bumpAffinityForUser,
    useFeedSignalStats,
};
