// Exercise detail overlay helpers: media and handle normalisation, and the feed item built for a workout's post.
import { stringCandidates } from '../../../utils/feedItemUtils';
import { extractWid } from './userStatsUtils';

const normalizeMediaEntry = (entry) => {
    if (!entry) return null;
    if (typeof entry === 'string') {
        const uri = entry.trim();
        return uri ? { uri, type: 'image', cropRect: null } : null;
    }
    if (typeof entry === 'object') {
        const uri = entry.uri ?? entry.url ?? entry.image ?? entry.photoURL ?? entry.photoUrl ?? null;
        if (!uri) return null;
        const raw = String(entry.type ?? entry.mediaType ?? entry.kind ?? 'image').toLowerCase();
        return { uri, type: raw.includes('video') ? 'video' : 'image', cropRect: entry.cropRect || null };
    }
    return null;
};

const mergeMediaSources = (post, workout) => {
    const sources = [];
    if (Array.isArray(post?.media)) sources.push(...post.media);
    if (Array.isArray(post?.images)) sources.push(...post.images);
    if (Array.isArray(workout?.media)) sources.push(...workout.media);
    if (Array.isArray(workout?.images)) sources.push(...workout.images);

    const seen = new Set();
    const result = [];
    sources.forEach((entry) => {
        const normalized = normalizeMediaEntry(entry);
        if (!normalized?.uri) return;
        const key = `${normalized.uri}|${normalized.type}`;
        if (seen.has(key)) return;
        seen.add(key);
        result.push(normalized);
    });
    return result;
};

const ensureHandle = (value) => {
    if (!value) return '';
    const str = String(value).trim();
    return str.startsWith('@') ? str.slice(1) : str;
};

export const ensureAtHandle = (value) => {
    const base = ensureHandle(value);
    return base ? `@${base}` : '';
};

export const buildFeedItem = (workout, post) => {
    if (!post || typeof post !== 'object') return null;
    const pid = String(post.pid || '');
    if (!pid || pid.startsWith('workout:')) return null;

    const workoutClone = workout && typeof workout === 'object' ? { ...workout } : {};
    const widRaw = workoutClone ? extractWid(workoutClone) : null;
    const wid = widRaw ? String(widRaw) : '';

    if (workoutClone) {
        if (!workoutClone.postPid) workoutClone.postPid = pid;
        if (!workoutClone.pid) workoutClone.pid = pid;
    }

    const mergedWorkout = {
        ...(post.workout || {}),
        ...(workoutClone || {}),
        postPid: pid,
        pid,
    };

    const feedItem = {
        ...post,
        pid,
        id: pid,
        workout: mergedWorkout,
    };

    if (!feedItem.uid) {
        feedItem.uid = stringCandidates([
            workoutClone?.creatorUID,
            workoutClone?.creatorUid,
            workoutClone?.uid,
            post.uid,
        ]);
    }

    const handle = ensureHandle(feedItem.handle ?? workoutClone?.handle ?? workoutClone?.username ?? '');
    feedItem.handle = handle;

    if (!feedItem.name) {
        feedItem.name = stringCandidates([
            workoutClone?.ownerName,
            workoutClone?.name,
            workoutClone?.templateName,
            feedItem.handle,
        ]) || feedItem.name;
    }

    if (!feedItem.caption) {
        const captionFallback = stringCandidates([
            workoutClone?.caption,
            workoutClone?.templateName,
            workoutClone?.name,
        ]);
        if (captionFallback) feedItem.caption = captionFallback;
    }

    if (!Array.isArray(feedItem.media) || !feedItem.media.length) {
        feedItem.media = mergeMediaSources(feedItem, mergedWorkout);
    }
    if (!Array.isArray(feedItem.images)) {
    feedItem.images = Array.isArray(post.images) ? post.images : [];
    }

    feedItem.__linkedWid = wid;
    feedItem.__source = 'user-stats-detail';

    return feedItem;
};
