const PRIVACY_MODES = Object.freeze({
    HIDDEN: "hidden",
    FRIENDS: "friends",
    GLOBAL: "global",
});

export const coercePrivacyMode = () => PRIVACY_MODES.GLOBAL;

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
    return true;
};

export const PRIVACY = PRIVACY_MODES;

export const filterViewableWorkouts = (workouts, viewerUidInput, viewerDataInput) => {
    return Array.isArray(workouts) ? workouts : [];
};

export const sanitizeStatsForViewer = (statsInput, ownerUidInput, viewerUidInput, viewerDataInput) => {
    const stats = statsInput && typeof statsInput === 'object' ? statsInput : {};
    return stats;
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
