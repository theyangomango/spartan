import { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "../../firebase.config";
import { filterViewableWorkouts } from "../utils/workoutPrivacy";
import { toMillis } from "../utils/friends";

const DEFAULT_MAX_TOTAL = 80;
const DEFAULT_PER_USER = 10;

const extractUid = (entry) => {
    if (entry === null || entry === undefined) return "";
    if (typeof entry === "string" || typeof entry === "number") return String(entry);
    if (typeof entry === "object") {
        return String(
            entry.uid ??
            entry.id ??
            entry.userUid ??
            entry.creatorUid ??
            entry.memberUid ??
            entry.followUid ??
            entry.followerUid ??
            ""
        );
    }
    return "";
};

const resolveTimestamp = (workout) => {
    if (!workout || typeof workout !== "object") return 0;
    const candidates = [
        workout.created,
        workout.createdAt,
        workout.completedAt,
        workout.finishedAt,
        workout.startedAt,
        workout.updatedAt,
    ];
    for (const value of candidates) {
        const ms = toMillis(value);
        if (ms) return ms;
    }
    return 0;
};

const buildWorkoutPid = (uid, workout, fallbackIndex) => {
    const baseId = workout?.wid ?? workout?.id ?? workout?.workoutId ?? workout?.sessionId ?? workout?.logId ?? "";
    const created = resolveTimestamp(workout);
    const suffix = baseId ? String(baseId) : String(created || Date.now());
    const extra = fallbackIndex !== undefined ? `:${fallbackIndex}` : "";
    return `workout:${uid}:${suffix}${extra}`;
};

const sanitizeProfile = (uid, data) => ({
    uid,
    handle: typeof data?.handle === "string" ? data.handle.trim() : "",
    name: typeof data?.name === "string" ? data.name.trim() : "",
    pfp: data?.pfp || data?.image || data?.pfpUrl || data?.photoURL || "",
    pfpVersion: data?.pfpVersion ?? data?.pfp_version ?? data?.version ?? 0,
    settings: data?.settings || {},
    followers: data?.followers || data?.followersMap || null,
});

const workoutsKey = (items) => items.map((item) => `${item.pid}:${item.created || 0}`).join("|");

export default function useWorkoutFeed(followingUsers, viewerUid, maxTotal = DEFAULT_MAX_TOTAL, perUserLimit = DEFAULT_PER_USER) {
    const [items, setItems] = useState([]);

    const profilesRef = useRef(new Map()); // uid -> { profile, rawWorkouts }
    const unsubRef = useRef(new Map());
    const lastKeyRef = useRef("");

    const allowedUids = useMemo(() => {
        const set = new Set();
        if (Array.isArray(followingUsers)) {
            followingUsers.forEach((entry) => {
                const uid = extractUid(entry);
                if (uid) set.add(uid);
            });
        }
        if (viewerUid) set.add(String(viewerUid));
        return Array.from(set);
    }, [followingUsers, viewerUid]);

    useEffect(() => {
        if (!allowedUids.length) {
            setItems([]);
            profilesRef.current.clear();
            unsubRef.current.forEach((fn) => { try { fn(); } catch {} });
            unsubRef.current.clear();
            lastKeyRef.current = "";
            return () => {};
        }

        let cancelled = false;

        const flush = () => {
            if (cancelled) return;
            const viewerData = (() => {
                try { return global?.userData || null; } catch { return null; }
            })();
            const viewerUidStr = viewerUid ? String(viewerUid) : (viewerData?.uid ? String(viewerData.uid) : "");

            const aggregated = [];

            profilesRef.current.forEach((entry) => {
                if (!entry) return;
                const { profile, workouts, ownerData } = entry;
                if (!profile?.uid) return;

                const rawList = Array.isArray(workouts) ? workouts : [];
                if (rawList.length === 0) return;

                const filtered = filterViewableWorkouts(rawList, viewerUidStr, viewerData, ownerData);
                if (!filtered.length) return;

                const sorted = filtered
                    .map((workout, idx) => ({ workout, created: resolveTimestamp(workout), idx }))
                    .sort((a, b) => (b.created || 0) - (a.created || 0))
                    .slice(0, perUserLimit);

                sorted.forEach(({ workout, created }, localIndex) => {
                    const ownerUid = profile.uid;
                    const normalizedWorkout = {
                        ...workout,
                        creatorUID: workout?.creatorUID ?? workout?.creatorUid ?? ownerUid,
                        creatorUid: workout?.creatorUid ?? workout?.creatorUID ?? ownerUid,
                    };

                    const item = {
                        pid: buildWorkoutPid(ownerUid, normalizedWorkout, localIndex),
                        uid: ownerUid,
                        handle: profile.handle,
                        name: profile.name,
                        pfp: profile.pfp,
                        pfpVersion: profile.pfpVersion,
                        workout: normalizedWorkout,
                        created,
                        createdAt: created,
                        likes: [],
                        likeCount: 0,
                        comments: [],
                        media: [],
                        images: [],
                        caption: normalizedWorkout?.templateName || normalizedWorkout?.name || "",
                        __synthetic: true,
                    };

                    aggregated.push(item);
                });
            });

            aggregated.sort((a, b) => (b.created || 0) - (a.created || 0));
            const limited = aggregated.slice(0, maxTotal);

            const key = workoutsKey(limited);
            if (key === lastKeyRef.current) return;
            lastKeyRef.current = key;

            setItems((prev) => {
                if (
                    prev.length === limited.length &&
                    prev.every((item, index) => item.pid === limited[index].pid && item.created === limited[index].created)
                ) {
                    return prev;
                }
                return limited;
            });
        };

        const allowedSet = new Set(allowedUids);

        unsubRef.current.forEach((unsubscribe, uid) => {
            if (!allowedSet.has(uid)) {
                try { unsubscribe(); } catch {}
                unsubRef.current.delete(uid);
                profilesRef.current.delete(uid);
            }
        });

        allowedSet.forEach((uid) => {
            if (unsubRef.current.has(uid)) return;
            const unsubscribe = onSnapshot(
                doc(db, "users", uid),
                (snap) => {
                    const data = snap.data() || {};
                    profilesRef.current.set(uid, {
                        profile: sanitizeProfile(uid, data),
                        workouts: Array.isArray(data?.completedWorkouts)
                            ? data.completedWorkouts
                            : [],
                        ownerData: { ...data, uid },
                    });
                    flush();
                },
                () => {
                    profilesRef.current.delete(uid);
                    flush();
                }
            );

            unsubRef.current.set(uid, () => {
                try { unsubscribe(); } catch {}
            });
        });

        flush();

        return () => {
            cancelled = true;
            unsubRef.current.forEach((unsubscribe) => {
                try { unsubscribe(); } catch {}
            });
            unsubRef.current.clear();
            profilesRef.current.clear();
            lastKeyRef.current = "";
            setItems([]);
        };
    }, [allowedUids, viewerUid, maxTotal, perUserLimit]);

    return items;
}

