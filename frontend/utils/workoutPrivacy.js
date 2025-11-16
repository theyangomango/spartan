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

const normalizePrivacyFlag = (flag) => {
    if (typeof flag === 'boolean') return flag;
    if (typeof flag === 'string') {
        const value = flag.trim().toLowerCase();
        if (!value) return undefined;
        if (value === 'private' || value === 'hidden') return true;
        if (value === 'public' || value === 'global') return false;
    }
    return undefined;
};

const isProfilePrivate = (ownerInput = {}) => {
    const candidates = [
        ownerInput?.settings?.profilePrivate,
        ownerInput?.profilePrivate,
        ownerInput?.isPrivate,
        ownerInput?.privacy,
        ownerInput?.privacyMode,
    ];
    for (const flag of candidates) {
        const normalized = normalizePrivacyFlag(flag);
        if (typeof normalized === 'boolean') {
            return normalized;
        }
    }
    return false;
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

export const canViewerAccessProfile = (ownerInput, viewerUidInput, viewerDataInput) => {
    if (!ownerInput || typeof ownerInput !== 'object') return true;

    const ownerUid = extractUid(ownerInput.uid ?? ownerInput.id ?? ownerInput);
    if (!ownerUid) return true;

    const isPrivate = isProfilePrivate(ownerInput);
    if (!isPrivate) return true;

    let viewerUid = extractUid(viewerUidInput);
    const viewerData = getViewerData(viewerDataInput);
    if (!viewerUid && viewerData?.uid) viewerUid = String(viewerData.uid);

    if (viewerUid && viewerUid === ownerUid) return true;

    const sources = [
        ownerInput.followers,
        ownerInput.followersList,
        ownerInput.followersMap,
        ownerInput.approvedFollowers,
    ];

    for (const source of sources) {
        if (collectionHasUid(source, viewerUid)) return true;
    }

    if (viewerUid && viewerData && isViewerFriend(viewerData, ownerUid)) return true;

    return false;
};

export const canViewWorkout = (workout, viewerUidInput, viewerDataInput, ownerDataInput = null) => {
    if (!workout || typeof workout !== 'object') return false;

    const viewerData = getViewerData(viewerDataInput);
    let viewerUid = extractUid(viewerUidInput);
    if (!viewerUid && viewerData?.uid) viewerUid = String(viewerData.uid);

    const ownerUid = resolveWorkoutOwnerUid(workout);
    if (ownerUid && viewerUid && ownerUid === viewerUid) return true;

    let ownerData = ownerDataInput && typeof ownerDataInput === 'object' ? ownerDataInput : null;
    if (!ownerData) {
        ownerData = workout.owner || workout.ownerProfile || workout.profile || workout.creator || null;
    }
    if (ownerData && typeof ownerData === 'object' && !ownerData.uid && ownerUid) {
        ownerData = { ...ownerData, uid: ownerUid };
    }

    if (ownerData && ownerData.settings && ownerData.settings.profilePrivate !== undefined) {
        if (!canViewerAccessProfile(ownerData, viewerUid, viewerData)) return false;
    }

    return true;
};

export const PRIVACY = PRIVACY_MODES;

export const filterViewableWorkouts = (workouts, viewerUidInput, viewerDataInput, ownerDataInput = null) => {
    if (!Array.isArray(workouts)) return [];
    return workouts.filter((workout) => canViewWorkout(workout, viewerUidInput, viewerDataInput, ownerDataInput));
};

export const sanitizeStatsForViewer = (statsInput, ownerUidInput, viewerUidInput, viewerDataInput, ownerDataInput = null) => {
    const stats = statsInput && typeof statsInput === 'object' ? statsInput : {};
    const ownerData = ownerDataInput && typeof ownerDataInput === 'object'
        ? ownerDataInput
        : (ownerUidInput ? { uid: extractUid(ownerUidInput), settings: {} } : null);

    if (!ownerData || canViewerAccessProfile(ownerData, viewerUidInput, viewerDataInput)) {
        return stats;
    }

    return {};
};

export default {
    PRIVACY,
    coercePrivacyMode,
    canViewWorkout,
    canViewerAccessProfile,
    isViewerFriend,
    resolveWorkoutOwnerUid,
    filterViewableWorkouts,
    sanitizeStatsForViewer,
};
