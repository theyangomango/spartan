const toMillisSafe = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    if (value instanceof Date) {
        const ms = value.getTime();
        return Number.isFinite(ms) ? ms : null;
    }
    if (typeof value?.toMillis === "function") {
        try {
            const ms = value.toMillis();
            return Number.isFinite(ms) ? ms : null;
        } catch { }
    }
    if (typeof value === "object") {
        const seconds = Number(value?.seconds);
        if (Number.isFinite(seconds)) {
            const nanos = Number(value?.nanoseconds ?? value?.nanos ?? 0);
            const extra = Number.isFinite(nanos) ? Math.floor(nanos / 1e6) : 0;
            return seconds * 1000 + extra;
        }
    }
    return null;
};

export const deriveWorkoutIdentityKey = (workout, uidHint = "") => {
    if (!workout || typeof workout !== "object") return "";
    const createdMs = toMillisSafe(
        workout?.created ??
        workout?.createdAt ??
        workout?.finishedAt ??
        workout?.completedAt
    );
    const wid =
        workout?.wid ??
        workout?.workoutId ??
        workout?.id ??
        workout?.widRef ??
        workout?.workoutUid ??
        null;
    if (wid !== null && wid !== undefined) {
        const widStr = String(wid).trim();
        if (widStr) {
            const createdSuffix = Number.isFinite(createdMs) && createdMs > 0 ? `:${createdMs}` : "";
            return `wid:${widStr}${createdSuffix}`;
        }
    }

    if (Number.isFinite(createdMs) && createdMs > 0) {
        const owner =
            workout?.creatorUID ??
            workout?.creatorUid ??
            workout?.uid ??
            workout?.ownerUid ??
            uidHint ??
            "";
        const name = typeof workout?.name === "string" ? workout.name.toLowerCase() : "";
        return `time:${createdMs}:${owner}:${name}`;
    }
    return "";
};

export const buildLivePostMetadata = (postData = {}, viewer = {}) => {
    const pid = typeof postData?.pid === "string" ? postData.pid : typeof postData?.id === "string" ? postData.id : "";
    if (!pid || !pid.startsWith("workout:live")) return null;

    const uid = String(postData?.uid || postData?.creatorUid || viewer?.uid || "").trim();
    const workout = postData?.workout || postData?.liveWorkout || {};
    const workoutCreated = toMillisSafe(
        workout?.created ??
        workout?.createdAt ??
        postData?.created ??
        postData?.createdAt ??
        Date.now()
    );
    const workoutWid =
        workout?.wid ??
        workout?.workoutId ??
        workout?.id ??
        postData?.workoutWid ??
        postData?.wid ??
        postData?.workoutId ??
        null;

    const workoutKey = deriveWorkoutIdentityKey(
        {
            ...workout,
            wid: workoutWid ?? workout?.wid,
            created: workoutCreated ?? workout?.created,
        },
        uid
    );

    const meta = {
        pid,
        uid,
        handle: typeof postData?.handle === "string" ? postData.handle : (typeof viewer?.handle === "string" ? viewer.handle : undefined),
        pfp: typeof postData?.pfp === "string"
            ? postData.pfp
            : (viewer?.pfp ?? viewer?.image ?? viewer?.photoURL ?? viewer?.pfpUrl ?? undefined),
        caption: typeof postData?.caption === "string" ? postData.caption : undefined,
        workoutWid: workoutWid != null ? String(workoutWid) : undefined,
        workoutCreated: workoutCreated || undefined,
        workoutKey: workoutKey || undefined,
        isLive: true,
        liveWorkout: true,
        updatedAt: Date.now(),
    };

    Object.keys(meta).forEach((key) => {
        if (meta[key] === undefined || meta[key] === null || meta[key] === "") {
            delete meta[key];
        }
    });

    return meta;
};

export default {
    deriveWorkoutIdentityKey,
    buildLivePostMetadata,
};
