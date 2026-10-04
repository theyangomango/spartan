// Pure helpers of useFilteredFeed: uid/pid coercion, post normalisation, cache (de)serialisation and live-workout feed entries.
import { coerceUid } from '../utils/userRefs';

export const toStringUid = (value) => coerceUid(value);

export const toStringPid = (value, fallback = '') => {
    if (value === undefined || value === null) return fallback;
    const str = String(value).trim();
    return str || fallback;
};

export const resolveTimestamp = (item) => {
    if (!item) return 0;
    const candidates = [
        item?.sortKey,
        item?.created,
        item?.createdAt,
        item?.updatedAt,
        item?.workout?.created,
        item?.workout?.createdAt,
        item?.workout?.completedAt,
        item?.workout?.finishedAt,
    ];
    for (const value of candidates) {
        if (!value) continue;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const parsed = Date.parse(value);
            if (Number.isFinite(parsed)) return parsed;
            continue;
        }
        if (value instanceof Date) return value.getTime();
        if (typeof value?.toMillis === 'function') {
            const millis = value.toMillis();
            if (Number.isFinite(millis)) return millis;
        }
    }
    return 0;
};

export const workoutIdentityKey = (workout, uidHint = "") => {
    if (!workout || typeof workout !== "object") return "";
    const createdMs = resolveTimestamp(workout);
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

export const normalizePost = (post, prev = null) => {
    if (!post || typeof post !== 'object') return null;

    const uid = toStringUid(post.uid ?? prev?.uid);
    if (!uid) return null;

    const prevSortKey = typeof prev?.sortKey === 'number' ? prev.sortKey : 0;
    const resolved = resolveTimestamp(post);
    const sortKey = Number.isFinite(resolved) && resolved > 0
        ? resolved
        : (Number.isFinite(prevSortKey) && prevSortKey > 0 ? prevSortKey : 0);

    const pid = toStringPid(
        post.pid ?? post.id ?? prev?.pid ?? `feed:${uid}:${sortKey || Date.now()}`
    );

    const normalized = {
        ...post,
        uid,
        pid,
        id: post.id ?? pid,
        sortKey,
    };

    if (!normalized.created && sortKey) normalized.created = sortKey;
    if (!normalized.createdAt && sortKey) normalized.createdAt = sortKey;

    return normalized;
};

export const cacheReplacer = (key, value) => {
    if (typeof value === 'function') return undefined;
    if (key === 'comments' && Array.isArray(value)) {
        return value.slice(0, 3);
    }
    if (key === 'likes' && Array.isArray(value)) {
        return value.slice(0, 8);
    }
    if (value instanceof Map) return Array.from(value.entries());
    if (value instanceof Set) return Array.from(value.values());
    return value;
};

export const parseCachedPosts = (raw, allowedSet, excludedSet) => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((entry) => normalizePost(entry, entry))
            .filter((entry) => {
                const uid = toStringUid(entry?.uid);
                if (!uid) return false;
                if (allowedSet && allowedSet.size && !allowedSet.has(uid)) return false;
                if (excludedSet && excludedSet.has(uid)) return false;
                return true;
            });
    } catch {
        return [];
    }
};

const ensureHandle = (profile, uid) => {
    const candidates = [
        profile?.handle,
        profile?.username,
        profile?.displayHandle,
        profile?.tag,
        profile?.name ? profile.name.replace(/\s+/g, '') : null,
    ];
    for (const value of candidates) {
        if (!value && value !== 0) continue;
        const str = String(value).trim();
        if (str) {
            return str.startsWith('@') ? str : `@${str}`;
        }
    }
    const suffix = uid ? String(uid).slice(-4) : 'user';
    return `@${suffix}`;
};

export const buildLiveFeedEntry = (uid, profile, workout, postMeta = null, prevEntry = null) => {
    if (!uid || !workout) return null;

    const meta = postMeta && typeof postMeta === "object" ? postMeta : {};
    const createdMs = resolveTimestamp(workout) || Date.now();
    const createdFromMeta = resolveTimestamp(meta);
    const sortKey = createdFromMeta || createdMs;

    const normalizedWorkout = {
        ...workout,
        created: workout?.created ?? workout?.createdAt ?? createdMs,
        createdAt: workout?.createdAt ?? workout?.created ?? createdMs,
        postPid: `workout:live:${uid}`,
        isLive: true,
        live: true,
        duration: Number(workout?.duration) || Math.max(0, Date.now() - createdMs),
        volume: Number(workout?.volume) || 0,
        PBs: Number(workout?.PBs ?? workout?.pbs ?? 0),
        calories: (() => {
            const raw = typeof workout?.calories === "number" ? workout.calories : Number(workout?.calories);
            return Number.isFinite(raw) ? raw : null;
        })(),
    };

    const workoutKey = workoutIdentityKey(normalizedWorkout, uid);
    const prevWorkoutKey = prevEntry ? workoutIdentityKey(prevEntry.workout, prevEntry?.uid ?? uid) : "";
    const sameWorkoutAsPrev = workoutKey && prevWorkoutKey && workoutKey === prevWorkoutKey;

    const metaKey = typeof meta.workoutKey === "string" ? meta.workoutKey.trim() : "";
    const metaMatchesWorkout = Boolean(workoutKey && metaKey && workoutKey === metaKey);

    const existingLikes = sameWorkoutAsPrev && Array.isArray(prevEntry?.likes) ? prevEntry.likes : [];
    const likes = metaMatchesWorkout
        ? (Array.isArray(meta.likes) ? meta.likes : existingLikes)
        : [];
    const existingComments = sameWorkoutAsPrev && Array.isArray(prevEntry?.comments) ? prevEntry.comments : [];
    const comments = metaMatchesWorkout
        ? (Array.isArray(meta.comments) ? meta.comments : existingComments)
        : [];
    const resolvedLikeCount = Number(meta.likeCount);
    const likeCount = metaMatchesWorkout
        ? (Number.isFinite(resolvedLikeCount) ? resolvedLikeCount : likes.length)
        : 0;
    const resolvedCommentCount = Number(meta.commentCount);
    const commentCount = metaMatchesWorkout
        ? (Number.isFinite(resolvedCommentCount)
            ? resolvedCommentCount
            : Array.isArray(meta.comments)
            ? meta.comments.length
            : 0)
        : 0;

    const caption = typeof meta.caption === "string"
        ? meta.caption
        : typeof workout?.caption === "string"
        ? workout.caption
        : typeof workout?.note === "string"
        ? workout.note
        : (typeof prevEntry?.caption === "string" ? prevEntry.caption : "");

    const media = Array.isArray(meta.media) ? meta.media : Array.isArray(prevEntry?.media) ? prevEntry.media : [];
    const images = Array.isArray(meta.images) ? meta.images : Array.isArray(prevEntry?.images) ? prevEntry.images : [];
    const tags = Array.isArray(meta.tags) ? meta.tags : Array.isArray(prevEntry?.tags) ? prevEntry.tags : [];
    const tagged = Array.isArray(meta.tagged) ? meta.tagged : Array.isArray(prevEntry?.tagged) ? prevEntry.tagged : [];

    return {
        pid: `workout:live:${uid}`,
        id: `workout:live:${uid}`,
        uid,
        handle: ensureHandle(profile, uid),
        pfp: profile?.pfp || profile?.pfpUrl || profile?.photoURL || profile?.image || '',
        pfpVersion: profile?.pfpVersion || profile?.profileImageVersion || 0,
        created: createdFromMeta || (meta?.created ?? createdMs),
        updatedAt: Date.now(),
        caption,
        media,
        images,
        likes,
        likeCount,
        comments,
        commentCount,
        tags,
        tagged,
        workout: normalizedWorkout,
        isLive: true,
        liveWorkout: true,
        workoutKey,
        workoutWid: normalizedWorkout?.wid ?? normalizedWorkout?.workoutId ?? normalizedWorkout?.id ?? null,
        sortKey,
    };
};
