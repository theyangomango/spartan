const PRIVACY_MODES = Object.freeze({
    HIDDEN: "hidden",
    FRIENDS: "friends",
    GLOBAL: "global",
});

const VALID_PRIVACY_SET = new Set([
    PRIVACY_MODES.HIDDEN,
    PRIVACY_MODES.FRIENDS,
    PRIVACY_MODES.GLOBAL,
]);

const toLowerString = (value) => {
    if (typeof value === "string") return value.trim().toLowerCase();
    if (value == null) return "";
    return String(value).trim().toLowerCase();
};

export const coercePrivacyMode = (value) => {
    const normalized = toLowerString(value);
    return VALID_PRIVACY_SET.has(normalized) ? normalized : PRIVACY_MODES.HIDDEN;
};

const getViewerData = (data) => {
    if (data) return data;
    try { return global?.userData || null; } catch { return null; }
};

const extractUid = (entry) => {
    if (!entry && entry !== 0) return "";
    if (typeof entry === "string" || typeof entry === "number") return String(entry);
    if (typeof entry === "object") {
        return String(
            entry.uid ??
            entry.id ??
            entry.userUid ??
            entry.followerUid ??
            entry.followUid ??
            entry.friendUid ??
            entry.memberUid ??
            entry.userId ??
            ""
        );
    }
    return "";
};

const collectionHasUid = (collection, targetUid) => {
    if (!targetUid || !collection) return false;
    if (Array.isArray(collection)) {
        return collection.some((item) => extractUid(item) === targetUid);
    }
    if (collection instanceof Set) {
        for (const item of collection) {
            if (extractUid(item) === targetUid) return true;
        }
        return false;
    }
    if (typeof collection === "object") {
        if (Object.prototype.hasOwnProperty.call(collection, targetUid)) return true;
        return Object.keys(collection).some((key) => {
            if (extractUid(key) === targetUid) return true;
            const value = collection[key];
            if (typeof value === "boolean") return value && key === targetUid;
            return extractUid(value) === targetUid;
        });
    }
    return false;
};

export const resolveWorkoutOwnerUid = (workout) => {
    if (!workout || typeof workout !== "object") return "";
    const owner =
        workout.creatorUID ??
        workout.creatorUid ??
        workout.uid ??
        workout.ownerUid ??
        workout.userUid ??
        (workout.creator && (workout.creator.uid ?? workout.creator.id)) ??
        null;
    return owner ? String(owner) : "";
};

export const isViewerFriend = (viewerData, targetUid) => {
    const normalizedTarget = targetUid ? String(targetUid) : "";
    if (!normalizedTarget) return false;

    const viewer = viewerData || (() => {
        try { return global?.userData || null; } catch { return null; }
    })();
    if (!viewer) return false;

    const viewerUid = viewer?.uid ? String(viewer.uid) : "";
    if (viewerUid && viewerUid === normalizedTarget) return true;

    const sources = [
        viewer.friends,
        viewer.friendsList,
        viewer.friendList,
        viewer.friendUids,
        viewer.following,
        viewer.followers,
        viewer.followingList,
        viewer.friendsMap,
        viewer.followingMap,
        viewer.followersMap,
    ];

    for (const source of sources) {
        if (collectionHasUid(source, normalizedTarget)) return true;
    }

    return false;
};

export const canViewWorkout = (workout, viewerUidInput, viewerDataInput) => {
    const workoutObj = workout && typeof workout === "object" ? workout : null;
    if (!workoutObj) return false;

    const viewerData = getViewerData(viewerDataInput);

    const viewerUid = viewerUidInput ? String(viewerUidInput) : (viewerData?.uid ? String(viewerData.uid) : "");
    const ownerUid = resolveWorkoutOwnerUid(workoutObj);
    const privacy = coercePrivacyMode(workoutObj?.privacyMode);

    if (viewerUid && ownerUid && viewerUid === ownerUid) return true;

    switch (privacy) {
        case PRIVACY_MODES.GLOBAL:
            return true;
        case PRIVACY_MODES.FRIENDS:
            return isViewerFriend(viewerData, ownerUid);
        case PRIVACY_MODES.HIDDEN:
        default:
            return false;
    }
};

export const PRIVACY = PRIVACY_MODES;

export const filterViewableWorkouts = (workouts, viewerUidInput, viewerDataInput) => {
    const list = Array.isArray(workouts) ? workouts : [];
    if (!list.length) return list;
    const viewerData = getViewerData(viewerDataInput);
    const viewerUid = viewerUidInput ? String(viewerUidInput) : (viewerData?.uid ? String(viewerData.uid) : "");
    return list.filter((wk) => canViewWorkout(wk, viewerUid, viewerData));
};

export const sanitizeStatsForViewer = (statsInput, ownerUidInput, viewerUidInput, viewerDataInput) => {
    const stats = statsInput && typeof statsInput === 'object' ? statsInput : {};
    const ownerUid = ownerUidInput ? String(ownerUidInput) : "";
    const viewerData = getViewerData(viewerDataInput);
    const viewerUid = viewerUidInput ? String(viewerUidInput) : (viewerData?.uid ? String(viewerData.uid) : "");
    if (viewerUid && ownerUid && viewerUid === ownerUid) return stats;

    let modified = false;
    const next = {};

    for (const [name, value] of Object.entries(stats)) {
        if (!value || typeof value !== 'object') {
            next[name] = value;
            continue;
        }

        const sets = Array.isArray(value.sets) ? value.sets : null;
        if (!sets || sets.length === 0) {
            next[name] = value;
            continue;
        }

        const filtered = sets.filter((set) => {
            const privacy = coercePrivacyMode(set?.privacyMode ?? value?.privacyMode ?? null);
            return canViewWorkout({ privacyMode: privacy, creatorUID: ownerUid }, viewerUid, viewerData);
        });

        if (filtered.length !== sets.length) modified = true;
        if (filtered.length === sets.length) {
            next[name] = value;
            continue;
        }

        next[name] = { ...value, sets: filtered };
    }

    return modified ? next : stats;
};

export default {
    PRIVACY,
    coercePrivacyMode,
    canViewWorkout,
    isViewerFriend,
    resolveWorkoutOwnerUid,
    filterViewableWorkouts,
    sanitizeStatsForViewer,
};
