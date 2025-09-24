import { useEffect, useState } from "react";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase.config";
import { canViewWorkout, coercePrivacyMode, PRIVACY } from "../utils/workoutPrivacy";

const STALE_AFTER_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FRIEND_BATCH = 10;

const oneDayMs = 24 * 60 * 60 * 1000;

const listeners = new Set();

const ALLOWED_FRIEND_PRIVACY = new Set([PRIVACY.FRIENDS, PRIVACY.GLOBAL]);

let lastUid = null;
let snapshot = {
    stats: { reps: 0, volume: 0, pbs: 0 },
    loading: false,
    ready: false,
    updatedAt: 0,
    weekKey: currentWeekKey(),
    stale: true,
};

let initPromise = null;
let refreshPromise = null;

function emit() {
    const snap = { ...snapshot, stats: { ...snapshot.stats } };
    listeners.forEach((fn) => {
        try { fn(snap); } catch (err) { console.log("communityStats listener error", err?.message || err); }
    });
}

function currentWeekKey(now = Date.now()) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d.getTime();
}

function getCurrentUser() {
    try { return global?.userData || {}; } catch { return {}; }
}

function normalizeUid(entry) {
    if (!entry) return null;
    if (typeof entry === "string") return entry;
    if (typeof entry === "object") {
        return entry.uid || entry.id || entry.userUid || entry.followerUid || entry.followUid || null;
    }
    return null;
}

function chunkArray(arr, size = MAX_FRIEND_BATCH) {
    if (!Array.isArray(arr) || !arr.length) return [];
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

function toMillis(value) {
    if (typeof value === "number") return value;
    if (value instanceof Date) return value.getTime();
    if (value?.toMillis) return value.toMillis();
    if (typeof value?.seconds === "number") return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

function workoutTimestamp(workout) {
    if (!workout || typeof workout !== "object") return 0;
    return Math.max(
        toMillis(workout?.finishedAt),
        toMillis(workout?.createdAt),
        toMillis(workout?.created)
    );
}

function isValidCompletedWorkout(workout, ownerUid) {
    if (!workout || typeof workout !== "object") return false;
    const owner = String(workout?.creatorUID || workout?.creatorUid || workout?.uid || "");
    if (owner && owner !== String(ownerUid)) return false;
    const ts = workoutTimestamp(workout);
    if (!Number.isFinite(ts) || ts <= 0) return false;
    if (ts > Date.now() + oneDayMs) return false;
    return true;
}

function gatherFriendUids(user) {
    const meUid = String(user?.uid || "");
    const following = Array.isArray(user?.following) ? user.following : [];
    const followers = Array.isArray(user?.followers) ? user.followers : [];

    const toSet = (list) => {
        const set = new Set();
        list.forEach((entry) => {
            const uid = normalizeUid(entry);
            if (!uid) return;
            const normalized = String(uid);
            if (!normalized || normalized === meUid) return;
            set.add(normalized);
        });
        return set;
    };

    const followingSet = toSet(following);
    const followersSet = toSet(followers);

    const mutual = [];
    followingSet.forEach((uid) => {
        if (followersSet.has(uid)) mutual.push(uid);
    });

    return mutual;
}

async function computeStatsForUser(user) {
    const uid = String(user?.uid || "").trim();
    if (!uid) {
        return { stats: { reps: 0, volume: 0, pbs: 0 }, weekKey: currentWeekKey(), updatedAt: Date.now() };
    }

    const weekKey = currentWeekKey();
    const now = Date.now();
    const totals = { reps: 0, volume: 0, pbs: 0 };
    const viewerData = user || {};

    const accumulateFrom = (workouts, ownerUid) => {
        if (!Array.isArray(workouts)) return;
        const ownerId = ownerUid ? String(ownerUid).trim() : "";
        const isViewerOwner = ownerId && ownerId === uid;
        for (const workout of workouts) {
            if (!isValidCompletedWorkout(workout, ownerUid)) continue;
            const privacyMode = coercePrivacyMode(workout?.privacyMode);
            const normalizedWorkout = {
                ...workout,
                privacyMode,
                creatorUID: workout?.creatorUID || workout?.creatorUid || ownerUid,
            };
            if (!isViewerOwner && !ALLOWED_FRIEND_PRIVACY.has(privacyMode)) continue;
            if (!canViewWorkout(normalizedWorkout, uid, viewerData)) continue;
            const when = workoutTimestamp(workout);
            if (!Number.isFinite(when) || when < weekKey || when > now) continue;
            const repsVal = Number(workout?.reps ?? 0);
            if (Number.isFinite(repsVal)) totals.reps += repsVal;
            const volumeVal = Number(workout?.volume ?? 0);
            if (Number.isFinite(volumeVal)) totals.volume += volumeVal;
            const rawPBs = Number(workout?.PBs ?? workout?.pbs ?? workout?.pr ?? 0);
            if (Number.isFinite(rawPBs)) totals.pbs += rawPBs;
        }
    };

    accumulateFrom(Array.isArray(user?.completedWorkouts) ? user.completedWorkouts : [], uid);

    const friendUids = gatherFriendUids(user);
    if (friendUids.length) {
        for (const group of chunkArray(friendUids)) {
            try {
                const snap = await getDocs(query(collection(db, "users"), where(documentId(), "in", group)));
                snap.forEach((docSnap) => {
                    const friendUid = docSnap.id;
                    const data = docSnap.data() || {};
                    accumulateFrom(Array.isArray(data?.completedWorkouts) ? data.completedWorkouts : [], friendUid);
                });
            } catch (err) {
                console.log("communityStats fetch group error", err?.message || err);
            }
        }
    }

    return { stats: totals, weekKey, updatedAt: Date.now() };
}

export function getCommunityStatsSnapshot() {
    return { ...snapshot, stats: { ...snapshot.stats } };
}

export function subscribeCommunityStats(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    try { listener(getCommunityStatsSnapshot()); } catch {}
    return () => { listeners.delete(listener); };
}

async function ensureInitPromise() {
    const user = getCurrentUser();
    const uid = String(user?.uid || "").trim();
    if (uid !== lastUid) {
        lastUid = uid || null;
        initPromise = null;
        refreshPromise = null;
        snapshot = {
            stats: { reps: 0, volume: 0, pbs: 0 },
            loading: false,
            ready: false,
            updatedAt: 0,
            weekKey: currentWeekKey(),
            stale: true,
        };
        emit();
    }
    if (initPromise) return initPromise;
    initPromise = (async () => {
        if (!uid) {
            snapshot = { ...snapshot, ready: true, stale: false };
            emit();
            return;
        }
        await refreshCommunityStats({ force: true, user });
    })();
    try { await initPromise; } catch (err) { console.log("communityStats init error", err?.message || err); }
    return initPromise;
}

export async function initCommunityStats(options = {}) {
    if (options?.reset) {
        initPromise = null;
    }
    return ensureInitPromise();
}

export async function refreshCommunityStats({ force = false, user } = {}) {
    if (refreshPromise) {
        return refreshPromise;
    }

    const currentUser = user || getCurrentUser();
    const uid = String(currentUser?.uid || "").trim();
    if (uid && uid !== lastUid) {
        lastUid = uid;
        initPromise = null;
    }
    if (!uid) {
        snapshot = {
            ...snapshot,
            stats: { reps: 0, volume: 0, pbs: 0 },
            ready: true,
            loading: false,
            stale: false,
            updatedAt: Date.now(),
            weekKey: currentWeekKey(),
        };
        emit();
        return;
    }

    const nowWeekKey = currentWeekKey();
    const stale = snapshot.weekKey !== nowWeekKey || (Date.now() - (snapshot.updatedAt || 0) > STALE_AFTER_MS);

    if (!force && snapshot.ready && !stale) {
        return;
    }

    snapshot = { ...snapshot, loading: true };
    emit();

    refreshPromise = (async () => {
        try {
            const result = await computeStatsForUser(currentUser);
            snapshot = {
                stats: { ...result.stats },
                loading: false,
                ready: true,
                updatedAt: result.updatedAt,
                weekKey: result.weekKey,
                stale: false,
            };
        } catch (err) {
            console.log("communityStats refresh error", err?.message || err);
            snapshot = {
                ...snapshot,
                loading: false,
                ready: snapshot.ready || false,
                stale: true,
            };
        }
        emit();
    })().finally(() => {
        refreshPromise = null;
    });

    return refreshPromise;
}

export async function forceRefreshCommunityStats() {
    await refreshCommunityStats({ force: true });
}

export function useCommunityStats() {
    const [snap, setSnap] = useState(() => getCommunityStatsSnapshot());
    useEffect(() => subscribeCommunityStats(setSnap), []);
    return snap;
}
