import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { deleteUserAndContentByUid } from "./shared/deleteUserAndContent.js";

setGlobalOptions({
    region: "us-central1",
    vpcConnector: "projects/spartan-8a55f/locations/us-central1/connectors/serverless-conn",
    vpcConnectorEgressSettings: "ALL_TRAFFIC",
});

// Initialize Admin SDK once per instance
try { initializeApp(); } catch { }
const adminDb = getFirestore();

// Secrets must be configured via Firebase/Google Secret Manager
const FATSECRET_KEY = defineSecret("FATSECRET_KEY");
const FATSECRET_SECRET = defineSecret("FATSECRET_SECRET");

// Simple in-memory cache per scope per function instance
const tokenCacheByScope = new Map(); // scope -> { accessToken, expiresAt }
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const fatsecretSearchCache = new Map(); // normalizedQuery|max|page -> { value, expiresAt }

const HANDLE_REGEX = /^[a-z0-9_.]{6,20}$/;

function sanitizeDisplayName(input) {
    if (typeof input !== "string") return "Spartan Athlete";
    const trimmed = input.trim();
    if (!trimmed) return "Spartan Athlete";
    return trimmed.slice(0, 60);
}

function sanitizePhotoUrl(url) {
    if (typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : "";
}

function coerceBoolean(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const lowered = value.toLowerCase();
        if (lowered === "true") return true;
        if (lowered === "false") return false;
    }
    return fallback;
}

function buildSearchTokens(displayName, handle) {
    const tokens = new Set();
    const pushToken = (token) => {
        if (!token) return;
        const clean = token
            .toLowerCase()
            .replace(/[^a-z0-9]/g, " ")
            .split(" ")
            .map((part) => part.trim())
            .filter((part) => part.length > 1);
        for (const part of clean) {
            tokens.add(part);
        }
    };
    pushToken(displayName);
    pushToken(handle);
    return Array.from(tokens).slice(0, 24);
}

async function upsertSearchIndex(uid, { displayName, handle, isPrivate }) {
    try {
        const payload = {
            displayName: displayName || "",
            handle: handle || "",
            handleLower: handle ? handle.toLowerCase() : "",
            isPrivate: !!isPrivate,
            tokens: buildSearchTokens(displayName, handle),
            updatedAt: FieldValue.serverTimestamp(),
        };
        await adminDb.collection("userSearchIndex").doc(uid).set(payload, { merge: true });
    } catch (error) {
        logger.error("Failed to upsert search index", { uid, error });
        throw new HttpsError("internal", "Failed to update search index.");
    }
}

const UID_KEYS = [
    "uid",
    "id",
    "userUid",
    "memberUid",
    "profileUid",
    "followUid",
    "followerUid",
    "ownerUid",
    "creatorUid",
    "creatorUID",
];

const coerceUidValue = (input) => {
    if (input === null || input === undefined) return "";
    if (typeof input === "string" || typeof input === "number") {
        const value = String(input).trim();
        return value || "";
    }
    if (typeof input !== "object") return "";
    for (const key of UID_KEYS) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
            const coerced = coerceUidValue(input[key]);
            if (coerced) return coerced;
        }
    }
    return "";
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const ensureUidArray = (list) => {
    const out = new Set();
    ensureArray(list).forEach((entry) => {
        const uid = coerceUidValue(entry);
        if (uid) out.add(uid);
    });
    return Array.from(out);
};

const normalizeUserRefPayload = (uid, publicData = {}, fallbackData = {}) => {
    const safeUid = String(uid || "").trim();
    if (!safeUid) return null;

    const handle =
        (typeof publicData?.handle === "string" && publicData.handle) ||
        (typeof fallbackData?.handle === "string" && fallbackData.handle) ||
        "";
    const display =
        (typeof publicData?.displayName === "string" && publicData.displayName) ||
        (typeof publicData?.name === "string" && publicData.name) ||
        (typeof fallbackData?.displayName === "string" && fallbackData.displayName) ||
        (typeof fallbackData?.name === "string" && fallbackData.name) ||
        "";
    const photo =
        (typeof publicData?.photoURL === "string" && publicData.photoURL) ||
        (typeof publicData?.pfp === "string" && publicData.pfp) ||
        (typeof publicData?.image === "string" && publicData.image) ||
        (typeof fallbackData?.photoURL === "string" && fallbackData.photoURL) ||
        (typeof fallbackData?.pfp === "string" && fallbackData.pfp) ||
        (typeof fallbackData?.image === "string" && fallbackData.image) ||
        "";
    const pfpVersion =
        Number(publicData?.pfpVersion ?? publicData?.imageVersion ?? fallbackData?.pfpVersion ?? fallbackData?.imageVersion ?? 0) || 0;

    const name = display || handle || "";
    return {
        uid: safeUid,
        handle: handle || "",
        name,
        displayName: display || name,
        pfp: photo || "",
        image: photo || "",
        photoURL: photo || "",
        pfpVersion,
    };
};

const removeArrayEntriesByUid = async (docRef, field, uid) => {
    if (!docRef) return;
    const safeUid = String(uid || "").trim();
    if (!safeUid) return;
    await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap || !snap.exists) return;
        const data = snap.data() || {};
        const current = ensureArray(data[field]);
        const filtered = current.filter((entry) => coerceUidValue(entry) !== safeUid);
        if (filtered.length !== current.length) {
            tx.update(docRef, { [field]: filtered });
        }
    }).catch(() => {});
};

const getUserDocs = async (uid) => {
    const safeUid = String(uid || "").trim();
    if (!safeUid) return null;
    const publicRef = adminDb.collection("usersPublic").doc(safeUid);
    const privateRef = adminDb.collection("usersPrivate").doc(safeUid);
    const legacyRef = adminDb.collection("users").doc(safeUid);
    const [publicSnap, privateSnap, legacySnap] = await Promise.all([
        publicRef.get(),
        privateRef.get(),
        legacyRef.get().catch(() => null),
    ]);
    return {
        uid: safeUid,
        publicRef,
        privateRef,
        legacyRef,
        publicSnap,
        privateSnap,
        publicData: publicSnap.exists ? publicSnap.data() || {} : null,
        privateData: privateSnap.exists ? privateSnap.data() || {} : null,
        legacyData: legacySnap && legacySnap.exists ? legacySnap.data() || {} : null,
    };
};

const LIKE_EVENT_TYPES = new Set(["liked-post", "liked-comment", "liked-story"]);
const COMMENT_EVENT_TYPES = new Set(["comment", "replied-comment"]);

const userRefCache = new Map();
const userPrivateCache = new Map();

const sanitizeNotificationEvent = (raw = {}) => {
    const event = {};
    const assign = (key, value, { allowEmpty = false } = {}) => {
        if (value === undefined) return;
        if (value === null) {
            event[key] = null;
            return;
        }
        if (typeof value === "number") {
            if (Number.isFinite(value)) {
                event[key] = value;
            }
            return;
        }
        if (typeof value === "boolean") {
            event[key] = value;
            return;
        }
        if (typeof value === "string") {
            const str = value.trim();
            if (str.length > 0 || allowEmpty) {
                event[key] = str;
            }
            return;
        }
        if (Array.isArray(value) || typeof value === "object") {
            try {
                event[key] = JSON.parse(JSON.stringify(value));
            } catch {
                // skip unserializable value
            }
        }
    };

    assign("uid", raw.uid);
    assign("handle", raw.handle, { allowEmpty: true });
    assign("name", raw.name, { allowEmpty: true });
    assign("pfp", raw.pfp, { allowEmpty: true });
    assign("pfpVersion", raw.pfpVersion);
    assign("pid", raw.pid);
    assign("content", raw.content, { allowEmpty: true });
    assign("commentKey", raw.commentKey, { allowEmpty: true });
    assign("commentIndex", raw.commentIndex);
    assign("commentId", raw.commentId, { allowEmpty: true });
    assign("replyKey", raw.replyKey, { allowEmpty: true });
    assign("parentCommentKey", raw.parentCommentKey, { allowEmpty: true });
    assign("isReply", raw.isReply);
    assign("metadata", raw.metadata);

    const type = typeof raw.type === "string" ? raw.type.trim() : "";
    event.type = type || "event";

    const ts = Number(raw.timestamp);
    event.timestamp = Number.isFinite(ts) ? ts : Date.now();

    return event;
};

const counterUpdatesForType = (type) => {
    const counters = {
        notificationNewEvents: FieldValue.increment(1),
    };
    if (LIKE_EVENT_TYPES.has(type)) {
        counters.notificationNewLikes = FieldValue.increment(1);
    }
    if (COMMENT_EVENT_TYPES.has(type)) {
        counters.notificationNewComments = FieldValue.increment(1);
    }
    return counters;
};

const composePushMessage = (event) => {
    const actor = event.handle || event.name || "Someone";
    const snippet = (source) => {
        if (typeof source !== "string") return "";
        const trimmed = source.trim();
        if (!trimmed) return "";
        return `: ${trimmed.slice(0, 80)}`;
    };

    switch (event.type) {
        case "liked-post":
            return { title: "New like", body: `${actor} liked your post` };
        case "liked-comment": {
            const kind = event.isReply ? "reply" : "comment";
            return { title: "New like", body: `${actor} liked your ${kind}${snippet(event.content)}` };
        }
        case "comment":
            return { title: "New comment", body: `${actor}${snippet(event.content)}` };
        case "replied-comment":
            return { title: "New reply", body: `${actor}${snippet(event.content)}` };
        case "follow":
            return { title: "New follower", body: `${actor} followed you` };
        case "follow-request":
            return { title: "Follow request", body: `${actor} requested to follow you` };
        case "follow-accepted":
            return { title: "Follow request accepted", body: `${actor} accepted your follow request` };
        case "mention":
            return { title: "New mention", body: `${actor} mentioned you${snippet(event.content)}` };
        case "workout-invite":
            return { title: "Workout invite", body: `${actor} invited you to a workout` };
        case "friend-workout-started":
            return { title: "Workout started", body: `${actor} started a workout` };
        default:
            if (event.message && typeof event.message === "string") {
                return { title: "Notification", body: event.message };
            }
            if (event.type && typeof event.type === "string") {
                return { title: "Notification", body: `${actor} ${event.type}` };
            }
            return { title: "Notification", body: `${actor} interacted with you` };
    }
};

const getUserPrivateDataCached = async (uid) => {
    const safeUid = String(uid || "").trim();
    if (!safeUid) return null;

    if (userPrivateCache.has(safeUid)) {
        const cachedEntry = userPrivateCache.get(safeUid);
        const cachedData = cachedEntry && typeof cachedEntry === "object" && "data" in cachedEntry
            ? cachedEntry.data
            : cachedEntry;
        const fetchedAt = cachedEntry && typeof cachedEntry === "object" && "fetchedAt" in cachedEntry
            ? Number(cachedEntry.fetchedAt) || 0
            : 0;

        const age = Date.now() - fetchedAt;
        const isStale = age > 10000; // 10s TTL
        const needsRefetch = isStale || (cachedData && cachedData.appForeground === true);

        if (!needsRefetch) {
            return cachedData;
        }
    }

    try {
        const snap = await adminDb.collection("usersPrivate").doc(safeUid).get();
        const data = snap.exists ? (snap.data() || {}) : null;
        userPrivateCache.set(safeUid, { data, fetchedAt: Date.now() });
        return data;
    } catch {
        userPrivateCache.set(safeUid, { data: null, fetchedAt: Date.now() });
        return null;
    }
};

const resolveUserDetails = async (uid, fallback = {}) => {
    const safeUid = String(uid || "").trim();
    if (!safeUid) return null;

    const mergeDetails = (primary = {}, secondary = {}) => {
        const pick = (key) => {
            const primaryValue = primary?.[key];
            if (typeof primaryValue === "string") {
                const trimmed = primaryValue.trim();
                if (trimmed) return trimmed;
                if (primaryValue === "" && secondary?.[key] === undefined) return "";
            } else if (primaryValue !== undefined && primaryValue !== null) {
                return primaryValue;
            }
            const secondaryValue = secondary?.[key];
            if (typeof secondaryValue === "string") {
                const trimmed = secondaryValue.trim();
                if (trimmed) return trimmed;
                if (secondaryValue === "") return "";
            } else if (secondaryValue !== undefined && secondaryValue !== null) {
                return secondaryValue;
            }
            return undefined;
        };

        const handle = pick("handle") || "";
        const name = pick("name") || pick("displayName") || "";
        const pfp = pick("pfp") || pick("photoURL") || pick("image") || "";
        const pfpVersionRaw = pick("pfpVersion");
        const pfpVersion = Number.isFinite(Number(pfpVersionRaw)) ? Number(pfpVersionRaw) : 0;

        return {
            uid: safeUid,
            handle,
            name: name || handle,
            displayName: name || handle || "",
            pfp,
            photoURL: pfp || "",
            image: pfp || "",
            pfpVersion,
        };
    };

    if (userRefCache.has(safeUid)) {
        return mergeDetails(fallback, userRefCache.get(safeUid));
    }

    if (fallback && typeof fallback === "object") {
        const mergedFromFallback = mergeDetails(fallback);
        if ((mergedFromFallback.handle && mergedFromFallback.handle.trim()) ||
            (mergedFromFallback.name && mergedFromFallback.name.trim()) ||
            (mergedFromFallback.pfp && mergedFromFallback.pfp.trim())) {
            userRefCache.set(safeUid, mergedFromFallback);
            return mergedFromFallback;
        }
    }

    try {
        const docs = await getUserDocs(safeUid);
        const base = docs ? normalizeUserRefPayload(safeUid, docs.publicData || {}, docs.privateData || {}) : { uid: safeUid };
        userRefCache.set(safeUid, base);
        return mergeDetails(fallback, base);
    } catch {
        const minimal = mergeDetails(fallback, { uid: safeUid });
        userRefCache.set(safeUid, minimal);
        return minimal;
    }
};

const deriveCommentKey = (comment, index = 0, parentKey = "comment") => {
    const prefix = parentKey || "comment";
    if (!comment || typeof comment !== "object") {
        return `${prefix}:idx:${index}`;
    }
    const candidates = [
        comment.commentId,
        comment.id,
        comment.cid,
        comment.key,
        comment.timestamp,
        comment.createdAt,
        comment.created,
        comment.replyId,
    ];
    for (const value of candidates) {
        if (value === undefined || value === null) continue;
        const str = String(value).trim();
        if (str) return `${prefix}:${str}`;
    }
    const uid = coerceUidValue(comment) || "anon";
    const content = typeof comment.content === "string" ? comment.content.trim().slice(0, 30) : "";
    return `${prefix}:${uid}:${index}:${content}`;
};

const extractNewLikeEntries = (afterTarget, beforeTarget) => {
    if (!afterTarget || typeof afterTarget !== "object") return [];
    if (!beforeTarget || typeof beforeTarget !== "object") return [];
    const beforeSet = new Set(
        ensureArray(beforeTarget.likedUsers)
            .map((entry) => coerceUidValue(entry))
            .filter(Boolean)
    );
    const results = [];
    ensureArray(afterTarget.likedUsers).forEach((entry) => {
        const likerUid = coerceUidValue(entry);
        if (!likerUid) return;
        if (!beforeSet.has(likerUid)) {
            results.push({ uid: likerUid, entry });
        }
    });
    return results;
};

async function createUserNotification(targetUid, rawEvent) {
    const safeUid = String(targetUid || "").trim();
    if (!safeUid) return;

    const event = sanitizeNotificationEvent(rawEvent);
    if (!event.uid || event.uid === safeUid) return;

    const notificationsRef = adminDb.collection("usersPrivate").doc(safeUid).collection("notifications");
    await notificationsRef.add({
        ...event,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
    });

    const counters = counterUpdatesForType(event.type);
    await adminDb.collection("usersPrivate").doc(safeUid).set(counters, { merge: true });

    try {
        const privateData = await getUserPrivateDataCached(safeUid);
        if (!privateData) return;
        if (privateData?.appForeground === true) return;
        const wantsPush = privateData?.settings?.push !== false;
        if (!wantsPush) return;
        const expoTokenRaw = privateData?.expoPushToken;
        const expoToken = typeof expoTokenRaw === "string" ? expoTokenRaw.trim() : "";
        if (!expoToken || !expoToken.startsWith("ExponentPushToken")) return;

        const { title, body } = composePushMessage(event);
        if (!title && !body) return;

        await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                to: expoToken,
                sound: "default",
                title,
                body,
                data: {
                    nidType: event.type,
                    pid: event.pid || null,
                    commentKey: event.commentKey || null,
                    replyKey: event.replyKey || null,
                    actorUid: event.uid,
                },
            }),
        });
    } catch (error) {
        logger.error("Failed to send push notification", { targetUid: safeUid, error });
    }
}

export const sendUserNotification = onCall({ region: "us-central1" }, async (request) => {
    const auth = request.auth;
    if (!auth?.uid) {
        throw new HttpsError("unauthenticated", "Authentication required to send notifications.");
    }

    const data = request.data && typeof request.data === "object" ? request.data : {};
    const targetUid = coerceUidValue(data.targetUid ?? data.uid ?? data.toUid);
    if (!targetUid) {
        throw new HttpsError("invalid-argument", "targetUid is required.");
    }

    const rawEvent = data.event && typeof data.event === "object" ? data.event : {};
    const requestedActorUid = coerceUidValue(rawEvent.uid);
    const callerUid = String(auth.uid);
    const isAdminCaller = auth.token?.admin === true || auth.token?.role === "admin";

    const actorUid = requestedActorUid || callerUid;
    if (actorUid !== callerUid && !isAdminCaller) {
        throw new HttpsError("permission-denied", "You are not allowed to impersonate another user.");
    }

    const fallbackActor = {
        uid: actorUid,
        handle: rawEvent.handle,
        name: rawEvent.name,
        pfp: rawEvent.pfp,
        pfpVersion: rawEvent.pfpVersion,
    };

    const actorDetails = await resolveUserDetails(actorUid, fallbackActor) || { uid: actorUid };

    await createUserNotification(targetUid, {
        ...rawEvent,
        uid: actorDetails.uid,
        handle: actorDetails.handle,
        name: actorDetails.name,
        pfp: actorDetails.pfp,
        pfpVersion: actorDetails.pfpVersion,
    });

    return { success: true };
});

// ---------------- Feed Notifications ---------------- //

export const onPostEngagementUpdated = onDocumentWritten(
    "posts/{pid}",
    async (event) => {
        const pid = String(event?.params?.pid || "");
        try {
            const beforeSnap = event.data?.before;
            const afterSnap = event.data?.after;
            if (!afterSnap?.exists) return;
            if (!beforeSnap || !beforeSnap.exists) return;

            const before = beforeSnap.data() || {};
            const after = afterSnap.data() || {};

            const ownerUid = coerceUidValue(after) || coerceUidValue(before);
            if (!ownerUid) return;

            const notifications = [];

            const beforeLikesSet = new Set(
                ensureArray(before.likes)
                    .map((entry) => coerceUidValue(entry))
                    .filter(Boolean)
            );

            ensureArray(after.likes).forEach((entry) => {
                const likerUid = coerceUidValue(entry);
                if (!likerUid || likerUid === ownerUid || beforeLikesSet.has(likerUid)) return;
                const actorEntry = entry && typeof entry === "object" ? entry : { uid: likerUid };
                notifications.push({
                    targetUid: ownerUid,
                    actorUid: likerUid,
                    actorEntry,
                    event: {
                        type: "liked-post",
                        pid,
                        timestamp: Date.now(),
                    },
                });
            });

            const beforeCommentsMap = new Map();
            ensureArray(before.comments).forEach((comment, index) => {
                const key = deriveCommentKey(comment, index);
                beforeCommentsMap.set(key, comment);
            });

            ensureArray(after.comments).forEach((comment, index) => {
                const commentKey = deriveCommentKey(comment, index);
                const prevComment = beforeCommentsMap.get(commentKey);
                if (!prevComment) return;

                const commentOwnerUid = coerceUidValue(comment);
                if (!commentOwnerUid) return;

                const commentContent = typeof comment?.content === "string" ? comment.content : "";

                const commentLikes = extractNewLikeEntries(comment, prevComment);
                commentLikes.forEach(({ uid: likerUid, entry }) => {
                    if (!likerUid || likerUid === commentOwnerUid) return;
                    const actorEntry = entry && typeof entry === "object" ? entry : { uid: likerUid };
                    notifications.push({
                        targetUid: commentOwnerUid,
                        actorUid: likerUid,
                        actorEntry,
                        event: {
                            type: "liked-comment",
                            pid,
                            commentKey,
                            commentIndex: index,
                            content: commentContent,
                            isReply: false,
                            timestamp: Date.now(),
                        },
                    });
                });

                const beforeRepliesMap = new Map();
                ensureArray(prevComment?.replies).forEach((reply, replyIndex) => {
                    const replyKey = deriveCommentKey(reply, replyIndex, `reply:${commentKey}`);
                    beforeRepliesMap.set(replyKey, reply);
                });

                ensureArray(comment?.replies).forEach((reply, replyIndex) => {
                    const replyKey = deriveCommentKey(reply, replyIndex, `reply:${commentKey}`);
                    const prevReply = beforeRepliesMap.get(replyKey);
                    if (!prevReply) return;

                    const replyOwnerUid = coerceUidValue(reply);
                    if (!replyOwnerUid) return;

                    const replyContent = typeof reply?.content === "string" ? reply.content : "";
                    const replyLikes = extractNewLikeEntries(reply, prevReply);
                    replyLikes.forEach(({ uid: likerUid, entry }) => {
                        if (!likerUid || likerUid === replyOwnerUid) return;
                        const actorEntry = entry && typeof entry === "object" ? entry : { uid: likerUid };
                        notifications.push({
                            targetUid: replyOwnerUid,
                            actorUid: likerUid,
                            actorEntry,
                            event: {
                                type: "liked-comment",
                                pid,
                                commentKey,
                                replyKey,
                                parentCommentKey: commentKey,
                                commentIndex: index,
                                content: replyContent,
                                isReply: true,
                                timestamp: Date.now(),
                            },
                        });
                    });
                });
            });

            if (!notifications.length) return;

            for (const note of notifications) {
                if (!note?.targetUid || !note?.actorUid) continue;
                if (note.targetUid === note.actorUid) continue;
                try {
                    const actorDetails = await resolveUserDetails(note.actorUid, note.actorEntry);
                    if (!actorDetails || !actorDetails.uid) continue;
                    await createUserNotification(note.targetUid, {
                        ...note.event,
                        uid: actorDetails.uid,
                        handle: actorDetails.handle,
                        name: actorDetails.name,
                        pfp: actorDetails.pfp,
                        pfpVersion: actorDetails.pfpVersion,
                    });
                } catch (error) {
                    logger.error("Failed to queue like notification", {
                        pid,
                        targetUid: note?.targetUid,
                        actorUid: note?.actorUid,
                        error: error?.message || error,
                    });
                }
            }
        } catch (error) {
            logger.error("onPostEngagementUpdated error", { pid, error: error?.message || error });
        }
    }
);

export const ensureUserProfile = onCall({ region: "us-central1" }, async (request) => {
    try {
        const auth = request.auth;
        if (!auth?.uid) {
            throw new HttpsError("unauthenticated", "Authentication required.");
        }
        const uid = auth.uid;
        const data = request.data || {};
        const providerId = typeof data.providerId === "string" ? data.providerId : null;
        const displayNameSource = data.displayName || auth.token?.name || "";
        const photoSource = data.photoURL || auth.token?.picture || "";
        const emailSource = data.email || auth.token?.email || "";
        const emailVerified = typeof data.emailVerified === "boolean"
            ? data.emailVerified
            : !!auth.token?.email_verified;
        const now = FieldValue.serverTimestamp();

        const publicRef = adminDb.collection("usersPublic").doc(uid);
        const privateRef = adminDb.collection("usersPrivate").doc(uid);
        const [publicSnap, privateSnap] = await Promise.all([publicRef.get(), privateRef.get()]);

        const publicData = publicSnap.exists ? (publicSnap.data() || {}) : {};
        const privateData = privateSnap.exists ? (privateSnap.data() || {}) : {};

        const displayName = sanitizeDisplayName(displayNameSource || publicData.displayName);
        const photoURL = sanitizePhotoUrl(photoSource || publicData.photoURL);
        const isPrivate = coerceBoolean(publicData.isPrivate, false);
        const bio = typeof publicData.bio === "string" ? publicData.bio.slice(0, 160) : "";
        const stats = typeof publicData.stats === "object" && publicData.stats !== null ? publicData.stats : {};
        const followersCount = Number.isFinite(publicData.followersCount) ? publicData.followersCount : 0;
        const followingCount = Number.isFinite(publicData.followingCount) ? publicData.followingCount : 0;

        const publicPayload = {
            displayName,
            photoURL,
            isPrivate,
            bio,
            stats,
            followersCount,
            followingCount,
            updatedAt: now,
        };
        if (!publicSnap.exists) {
            publicPayload.uid = uid;
            publicPayload.handle = null;
            publicPayload.handleLower = null;
            publicPayload.createdAt = now;
        }

        const existingProviders = Array.isArray(privateData.authProviders) ? privateData.authProviders : [];
        const providerSet = new Set(existingProviders.filter(Boolean));
        if (providerId) providerSet.add(providerId);
        const tokenProvider = auth.token?.firebase?.sign_in_provider;
        if (tokenProvider) providerSet.add(tokenProvider);

        const privatePayload = {
            email: emailSource || privateData.email || null,
            emailVerified: emailVerified,
            authProviders: Array.from(providerSet),
            lastLoginAt: now,
        };
        if (!privateSnap.exists) {
            privatePayload.createdAt = now;
            privatePayload.blocked = [];
            privatePayload.blockedBy = [];
            privatePayload.deviceTokens = [];
        }

        await Promise.all([
            publicSnap.exists ? publicRef.update(publicPayload) : publicRef.set(publicPayload, { merge: true }),
            privateSnap.exists ? privateRef.update(privatePayload) : privateRef.set(privatePayload, { merge: true }),
        ]);

        const mergedPublic = {
            ...publicData,
            ...publicPayload,
            handle: typeof publicData.handle === "string" ? publicData.handle : null,
            handleLower: typeof publicData.handle === "string" ? publicData.handle.toLowerCase() : null,
        };

        await adminDb.collection("users").doc(uid).set(mergedPublic, { merge: true });

        const finalHandle = mergedPublic.handle || null;
        await upsertSearchIndex(uid, {
            displayName,
            handle: finalHandle,
            isPrivate,
        });

        return {
            uid,
            requiresHandle: !finalHandle,
            publicProfile: mergedPublic,
        };
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        logger.error("ensureUserProfile failure", error);
        throw new HttpsError("internal", "Failed to ensure user profile.");
    }
});

const validateFollowTarget = (callerUid, targetUid) => {
    if (!callerUid) throw new HttpsError("unauthenticated", "Authentication required.");
    const normalizedTarget = coerceUidValue(targetUid);
    if (!normalizedTarget) throw new HttpsError("invalid-argument", "targetUid is required.");
    if (normalizedTarget === callerUid) {
        throw new HttpsError("failed-precondition", "You cannot perform this action on yourself.");
    }
    return normalizedTarget;
};

export const followUserAction = onCall({ region: "us-central1" }, async (request) => {
    const meUid = request.auth?.uid;
    const targetUid = validateFollowTarget(meUid, request.data?.targetUid ?? request.data?.uid);

    const [meDocs, targetDocs] = await Promise.all([getUserDocs(meUid), getUserDocs(targetUid)]);
    if (!meDocs || !meDocs.publicData) throw new HttpsError("failed-precondition", "Caller profile is incomplete.");
    if (!targetDocs || !targetDocs.publicData) throw new HttpsError("not-found", "Target user not found.");

    const meRefData = normalizeUserRefPayload(meUid, meDocs.publicData, meDocs.privateData);
    const targetRefData = normalizeUserRefPayload(targetUid, targetDocs.publicData, targetDocs.privateData);
    if (!meRefData || !targetRefData) {
        throw new HttpsError("failed-precondition", "Unable to build profile references.");
    }

    const targetBlocked = new Set([
        ...ensureUidArray(targetDocs.privateData?.blockedUidList),
        ...ensureUidArray(targetDocs.privateData?.blocked),
    ]);
    if (targetBlocked.has(meUid)) throw new HttpsError("failed-precondition", "You are blocked by this user.");

    const meBlocked = new Set([
        ...ensureUidArray(meDocs.privateData?.blockedUidList),
        ...ensureUidArray(meDocs.privateData?.blocked),
    ]);
    if (meBlocked.has(targetUid)) throw new HttpsError("failed-precondition", "You have blocked this user.");

    const followers = ensureArray(targetDocs.publicData.followers);
    const alreadyFollower = followers.some((entry) => coerceUidValue(entry) === meUid);
    const pendingRequests = ensureArray(targetDocs.privateData?.followRequestsIn);
    const alreadyRequested = pendingRequests.some((entry) => coerceUidValue(entry) === meUid);
    const isPrivate = !!targetDocs.publicData?.isPrivate;

    if (isPrivate) {
        if (!alreadyFollower && !alreadyRequested) {
            await Promise.all([
                targetDocs.privateRef.update({
                    followRequestsIn: FieldValue.arrayUnion(meRefData),
                }),
                meDocs.privateRef.update({
                    followRequestsOut: FieldValue.arrayUnion(targetRefData),
                }),
                targetDocs.legacyRef.set({
                    followRequestsIn: FieldValue.arrayUnion(meRefData),
                }, { merge: true }).catch(() => {}),
                meDocs.legacyRef.set({
                    followRequestsOut: FieldValue.arrayUnion(targetRefData),
                }, { merge: true }).catch(() => {}),
            ]);

            await createUserNotification(targetUid, {
                type: "follow-request",
                uid: meRefData.uid,
                handle: meRefData.handle,
                name: meRefData.name,
                pfp: meRefData.pfp,
                pfpVersion: meRefData.pfpVersion,
            });
            return { status: "requested", private: true };
        }
        return { status: alreadyFollower ? "following" : "requested", private: true };
    }

    const updates = [];
    if (!alreadyFollower) {
        updates.push(
            targetDocs.publicRef.update({
                followers: FieldValue.arrayUnion(meRefData),
                followerCount: FieldValue.increment(1),
            })
        );
        updates.push(
            meDocs.publicRef.update({
                following: FieldValue.arrayUnion(targetRefData),
                followingCount: FieldValue.increment(1),
            })
        );
        updates.push(
            targetDocs.legacyRef.set({
                followers: FieldValue.arrayUnion(meRefData),
                followerCount: FieldValue.increment(1),
            }, { merge: true })
        );
        updates.push(
            meDocs.legacyRef.set({
                following: FieldValue.arrayUnion(targetRefData),
                followingCount: FieldValue.increment(1),
            }, { merge: true })
        );
    }
    if (alreadyRequested) {
        updates.push(removeArrayEntriesByUid(targetDocs.privateRef, "followRequestsIn", meUid));
        updates.push(removeArrayEntriesByUid(meDocs.privateRef, "followRequestsOut", targetUid));
        updates.push(removeArrayEntriesByUid(targetDocs.legacyRef, "followRequestsIn", meUid));
        updates.push(removeArrayEntriesByUid(meDocs.legacyRef, "followRequestsOut", targetUid));
    }
    if (updates.length) await Promise.all(updates);

    if (!alreadyFollower) {
        await createUserNotification(targetUid, {
            type: "follow",
            uid: meRefData.uid,
            handle: meRefData.handle,
            name: meRefData.name,
            pfp: meRefData.pfp,
            pfpVersion: meRefData.pfpVersion,
        });
    }

    return { status: "following", private: false };
});

export const cancelFollowRequestAction = onCall({ region: "us-central1" }, async (request) => {
    const meUid = request.auth?.uid;
    const targetUid = validateFollowTarget(meUid, request.data?.targetUid ?? request.data?.uid);

    const [meDocs, targetDocs] = await Promise.all([getUserDocs(meUid), getUserDocs(targetUid)]);
    if (!meDocs || !targetDocs) {
        throw new HttpsError("not-found", "User record missing.");
    }

    await Promise.all([
        removeArrayEntriesByUid(meDocs.privateRef, "followRequestsOut", targetUid),
        removeArrayEntriesByUid(targetDocs.privateRef, "followRequestsIn", meUid),
        removeArrayEntriesByUid(meDocs.legacyRef, "followRequestsOut", targetUid),
        removeArrayEntriesByUid(targetDocs.legacyRef, "followRequestsIn", meUid),
    ]);

    return { status: "cancelled" };
});

export const respondFollowRequestAction = onCall({ region: "us-central1" }, async (request) => {
    const meUid = request.auth?.uid;
    if (!meUid) throw new HttpsError("unauthenticated", "Authentication required.");

    const requesterUid = coerceUidValue(request.data?.requesterUid ?? request.data?.uid ?? request.data?.requester?.uid);
    if (!requesterUid) throw new HttpsError("invalid-argument", "requesterUid is required.");
    if (requesterUid === meUid) throw new HttpsError("failed-precondition", "Invalid requester.");

    const decisionRaw = String(request.data?.decision ?? request.data?.action ?? "").toLowerCase();
    if (!["accept", "decline"].includes(decisionRaw)) {
        throw new HttpsError("invalid-argument", "decision must be 'accept' or 'decline'.");
    }

    const [meDocs, requesterDocs] = await Promise.all([getUserDocs(meUid), getUserDocs(requesterUid)]);
    if (!meDocs || !meDocs.publicData) throw new HttpsError("failed-precondition", "Caller profile is incomplete.");
    if (!requesterDocs || !requesterDocs.publicData) throw new HttpsError("not-found", "Requester not found.");

    const requesterRefData = normalizeUserRefPayload(requesterUid, requesterDocs.publicData, requesterDocs.privateData);
    const meRefData = normalizeUserRefPayload(meUid, meDocs.publicData, meDocs.privateData);

    await Promise.all([
        removeArrayEntriesByUid(meDocs.privateRef, "followRequestsIn", requesterUid),
        removeArrayEntriesByUid(requesterDocs.privateRef, "followRequestsOut", meUid),
    ]);

    if (decisionRaw === "decline") {
        return { status: "declined" };
    }

    const followers = ensureArray(meDocs.publicData.followers);
    const alreadyFollower = followers.some((entry) => coerceUidValue(entry) === requesterUid);
    if (!alreadyFollower) {
        await Promise.all([
            meDocs.publicRef.update({
                followers: FieldValue.arrayUnion(requesterRefData),
                followerCount: FieldValue.increment(1),
            }),
            requesterDocs.publicRef.update({
                following: FieldValue.arrayUnion(meRefData),
                followingCount: FieldValue.increment(1),
            }),
            meDocs.legacyRef.set({
                followers: FieldValue.arrayUnion(requesterRefData),
                followerCount: FieldValue.increment(1),
            }, { merge: true }),
            requesterDocs.legacyRef.set({
                following: FieldValue.arrayUnion(meRefData),
                followingCount: FieldValue.increment(1),
            }, { merge: true }),
        ]);
    }

    await createUserNotification(requesterUid, {
        type: "follow-accepted",
        uid: meRefData.uid,
        handle: meRefData.handle,
        name: meRefData.name,
        pfp: meRefData.pfp,
        pfpVersion: meRefData.pfpVersion,
    });

    return { status: "accepted" };
});

export const unfollowUserAction = onCall({ region: "us-central1" }, async (request) => {
    const meUid = request.auth?.uid;
    const targetUid = validateFollowTarget(meUid, request.data?.targetUid ?? request.data?.uid);

    const [meDocs, targetDocs] = await Promise.all([getUserDocs(meUid), getUserDocs(targetUid)]);
    if (!meDocs || !meDocs.publicData) throw new HttpsError("failed-precondition", "Caller profile is incomplete.");
    if (!targetDocs || !targetDocs.publicData) throw new HttpsError("not-found", "Target user not found.");

    await adminDb.runTransaction(async (tx) => {
        const [
            mePublicSnap,
            targetPublicSnap,
            meLegacySnap,
            targetLegacySnap,
        ] = await Promise.all([
            tx.get(meDocs.publicRef),
            tx.get(targetDocs.publicRef),
            tx.get(meDocs.legacyRef).catch(() => null),
            tx.get(targetDocs.legacyRef).catch(() => null),
        ]);

        if (mePublicSnap && mePublicSnap.exists) {
            const data = mePublicSnap.data() || {};
            const following = ensureArray(data.following);
            const filtered = following.filter((entry) => coerceUidValue(entry) !== targetUid);
            if (filtered.length !== following.length || Number(data.followingCount) !== filtered.length) {
                tx.update(meDocs.publicRef, {
                    following: filtered,
                    followingCount: filtered.length,
                });
            }
        }

        if (targetPublicSnap && targetPublicSnap.exists) {
            const data = targetPublicSnap.data() || {};
            const followers = ensureArray(data.followers);
            const filtered = followers.filter((entry) => coerceUidValue(entry) !== meUid);
            if (filtered.length !== followers.length || Number(data.followerCount) !== filtered.length) {
                tx.update(targetDocs.publicRef, {
                    followers: filtered,
                    followerCount: filtered.length,
                });
            }
        }

        if (meLegacySnap && meLegacySnap.exists) {
            const data = meLegacySnap.data() || {};
            const following = ensureArray(data.following);
            const filtered = following.filter((entry) => coerceUidValue(entry) !== targetUid);
            if (filtered.length !== following.length || Number(data.followingCount) !== filtered.length) {
                tx.update(meDocs.legacyRef, {
                    following: filtered,
                    followingCount: filtered.length,
                });
            }
        }

        if (targetLegacySnap && targetLegacySnap.exists) {
            const data = targetLegacySnap.data() || {};
            const followers = ensureArray(data.followers);
            const filtered = followers.filter((entry) => coerceUidValue(entry) !== meUid);
            if (filtered.length !== followers.length || Number(data.followerCount) !== filtered.length) {
                tx.update(targetDocs.legacyRef, {
                    followers: filtered,
                    followerCount: filtered.length,
                });
            }
        }
    });

    await Promise.all([
        removeArrayEntriesByUid(meDocs.privateRef, "followRequestsOut", targetUid),
        removeArrayEntriesByUid(targetDocs.privateRef, "followRequestsIn", meUid),
        removeArrayEntriesByUid(meDocs.legacyRef, "followRequestsOut", targetUid),
        removeArrayEntriesByUid(targetDocs.legacyRef, "followRequestsIn", meUid),
    ]);

    return { status: "unfollowed" };
});

export const registerChatParticipantsAction = onCall({ region: "us-central1" }, async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new HttpsError("unauthenticated", "Authentication required.");

    const cid = String(request.data?.cid || request.data?.chatId || "").trim();
    if (!cid) throw new HttpsError("invalid-argument", "cid is required.");

    const rawParticipants = ensureArray(request.data?.participants);
    const participantMap = new Map();
    rawParticipants.forEach((entry) => {
        const uid = coerceUidValue(entry);
        if (!uid) return;
        if (!participantMap.has(uid)) participantMap.set(uid, entry || {});
    });

    const chatRef = adminDb.collection("messages").doc(cid);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
        throw new HttpsError("not-found", "Chat thread not found.");
    }
    const chatData = chatSnap.data() || {};
    const existingUsers = ensureArray(chatData.users);
    existingUsers.forEach((entry) => {
        const uid = coerceUidValue(entry);
        if (!uid) return;
        if (!participantMap.has(uid)) participantMap.set(uid, entry || {});
    });
    const existingMembers = ensureUidArray(chatData.memberUids || chatData.members || chatData.memberUidList);
    existingMembers.forEach((uid) => {
        if (!participantMap.has(uid)) participantMap.set(uid, {});
    });

    if (!participantMap.size) {
        throw new HttpsError("invalid-argument", "participants array is required.");
    }
    if (!participantMap.has(callerUid) && !existingMembers.includes(callerUid)) {
        throw new HttpsError("permission-denied", "Caller must be part of this conversation.");
    }
    const participantUids = Array.from(participantMap.keys());
    if (participantUids.length > 50) {
        throw new HttpsError("invalid-argument", "Too many participants.");
    }
    if (existingMembers.length && !existingMembers.includes(callerUid)) {
        throw new HttpsError("permission-denied", "Caller is not a current member of this chat.");
    }

    const publicRefs = participantUids.map((uid) => adminDb.collection("usersPublic").doc(uid));
    const publicSnaps = await adminDb.getAll(...publicRefs);
    const publicByUid = new Map();
    publicSnaps.forEach((snap) => {
        if (snap.exists) {
            publicByUid.set(snap.id, snap.data() || {});
        }
    });

    const participantRecords = participantUids
        .map((uid) => {
            const publicData = publicByUid.get(uid) || {};
            const fallback = participantMap.get(uid) || {};
            return normalizeUserRefPayload(uid, publicData, fallback);
        })
        .filter(Boolean);

    if (!participantRecords.length) {
        throw new HttpsError("failed-precondition", "Unable to resolve participant profiles.");
    }

    const finalMemberUids = participantRecords.map((rec) => rec.uid);
    if (!finalMemberUids.includes(callerUid)) {
        throw new HttpsError("permission-denied", "Caller must remain in the participant list.");
    }

    const chatPayload = {
        users: participantRecords,
        memberUids: finalMemberUids,
        userCount: participantRecords.length,
        isGroup: participantRecords.length > 2,
    };
    await chatRef.set(chatPayload, { merge: true });

    await Promise.all(
        participantRecords.map(async (participant) => {
            const { uid } = participant;
            const others = participantRecords
                .filter((rec) => rec.uid !== uid)
                .map((rec) => ({
                    uid: rec.uid,
                    handle: rec.handle || "",
                    name: rec.displayName || rec.name || rec.handle || "",
                    pfp: rec.pfp || "",
                }));
            const entry = { mid: cid, otherUsers: others };
            const privateRef = adminDb.collection("usersPrivate").doc(uid);
            await adminDb.runTransaction(async (tx) => {
                const snap = await tx.get(privateRef);
                if (!snap.exists) {
                    tx.set(privateRef, { messages: [entry] }, { merge: true });
                    return;
                }
                const data = snap.data() || {};
                const messages = ensureArray(data.messages).filter((value) => value && typeof value === "object");
                const idx = messages.findIndex((record) => String(record?.mid || "") === cid);
                if (idx >= 0) messages[idx] = entry;
                else messages.push(entry);
                tx.update(privateRef, { messages });
            });
        })
    );

    return {
        cid,
        participantCount: participantRecords.length,
    };
});

export const setUserHandle = onCall({ region: "us-central1" }, async (request) => {
    try {
        if (!request.auth?.uid) {
            throw new HttpsError("unauthenticated", "Authentication required.");
        }
        const uid = request.auth.uid;
        const rawHandle = request.data?.handle;
        if (typeof rawHandle !== "string") {
            throw new HttpsError("invalid-argument", "Handle is required.");
        }
        const normalized = rawHandle.trim().toLowerCase();
        const sanitized = normalized.replace(/[^a-z0-9_.]/g, "");
        if (sanitized !== normalized || !HANDLE_REGEX.test(sanitized)) {
            throw new HttpsError("invalid-argument", "Handle must be 6-20 characters (a-z, 0-9, _, .).");
        }
        const handleLower = sanitized.toLowerCase();
        const now = FieldValue.serverTimestamp();

        await adminDb.runTransaction(async (tx) => {
            const publicRef = adminDb.collection("usersPublic").doc(uid);
            const publicSnap = await tx.get(publicRef);
            if (!publicSnap.exists) {
                throw new HttpsError("failed-precondition", "User profile not initialized.");
            }

            const handleRef = adminDb.collection("userHandles").doc(handleLower);
            const handleSnap = await tx.get(handleRef);
            const existingUid = handleSnap.exists ? handleSnap.data()?.uid : null;
            if (existingUid && existingUid !== uid) {
                throw new HttpsError("already-exists", "Handle is already taken.");
            }

            const currentHandleLower = publicSnap.data()?.handleLower || null;
            const handleDoc = { uid, updatedAt: now };
            if (!handleSnap.exists) {
                handleDoc.createdAt = now;
            }
            tx.set(handleRef, handleDoc, { merge: true });
            tx.update(publicRef, {
                handle: sanitized,
                handleLower,
                updatedAt: now,
            });
            if (currentHandleLower && currentHandleLower !== handleLower) {
                const prevHandleRef = adminDb.collection("userHandles").doc(currentHandleLower);
                tx.delete(prevHandleRef);
            }
        });

        const publicSnap = await adminDb.collection("usersPublic").doc(uid).get();
        const publicData = publicSnap.data() || {};
        await upsertSearchIndex(uid, {
            displayName: publicData.displayName || "",
            handle: sanitized,
            isPrivate: coerceBoolean(publicData.isPrivate, false),
        });

        await adminDb.collection("users").doc(uid).set({
            handle: sanitized,
            handleLower,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return { handle: sanitized };
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        logger.error("setUserHandle failure", error);
        throw new HttpsError("internal", "Failed to set handle.");
    }
});

export const computeHexagonStats = onCall({ region: "us-central1" }, async (request) => {
    try {
        if (!request.auth?.uid) {
            throw new HttpsError("unauthenticated", "Authentication required");
        }
        const zeroHex = {
            shoulders: 0,
            chest: 0,
            arms: 0,
            legs: 0,
            back: 0,
            abs: 0,
            overall: 0,
        };
        const zeroLast = {
            shoulders: 0,
            chest: 0,
            arms: 0,
            legs: 0,
            back: 0,
            abs: 0,
        };

        return {
            statsHexagon: zeroHex,
            lastTrained: zeroLast,
            statsExercises: {},
            debug: {},
        };
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        logger.error("computeHexagonStats failure", error);
        throw new HttpsError("invalid-argument", "Unable to compute hexagon stats");
    }
});

async function getAccessToken(scope = "basic") {
    const now = Date.now();
    const cached = tokenCacheByScope.get(scope);
    if (cached && cached.accessToken && now < cached.expiresAt - 60_000) {
        return cached.accessToken;
    }

    const client_id = FATSECRET_KEY.value();
    const client_secret = FATSECRET_SECRET.value();

    const resp = await fetch("https://oauth.fatsecret.com/connect/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            scope,
            client_id,
            client_secret,
        }).toString(),
    });

    if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        logger.error("FatSecret token error", { status: resp.status, text });
        throw new HttpsError("internal", "Failed to get FatSecret access token");
    }

    const data = await resp.json();
    if (!data?.access_token || !data?.expires_in) {
        logger.error("FatSecret token response missing fields", data);
        throw new HttpsError("internal", "Invalid token response from FatSecret");
    }

    const entry = { accessToken: data.access_token, expiresAt: now + data.expires_in * 1000 };
    tokenCacheByScope.set(scope, entry);
    return entry.accessToken;
}

async function fatSecretRequest(methodName, params = {}, scope = "basic") {
    const token = await getAccessToken(scope);
    const url = "https://platform.fatsecret.com/rest/server.api";

    const body = new URLSearchParams({
        method: methodName,
        format: "json",
        ...Object.fromEntries(
            Object.entries(params)
                .filter(([_, v]) => v !== undefined && v !== null)
                .map(([k, v]) => [k, String(v)])
        ),
    }).toString();

    const resp = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || json?.error) {
        logger.error("FatSecret API error", { status: resp.status, json });
        const message = json?.error?.message || `FatSecret request failed: ${resp.status}`;
        throw new HttpsError("internal", message);
    }

    return json;
}

// Allow-list only required methods
const ALLOWED_METHODS = new Set(["foods.search"]);

export const fatsecretMethod = onCall(
    { region: "us-central1", secrets: [FATSECRET_KEY, FATSECRET_SECRET] },
    async (request) => {
        const { method, params } = request.data || {};
        if (!method || typeof method !== "string") {
            throw new HttpsError("invalid-argument", "Missing 'method' string.");
        }
        if (!ALLOWED_METHODS.has(method)) {
            throw new HttpsError("permission-denied", `Method not allowed: ${method}`);
        }
        return await fatSecretRequest(method, params || {}, "basic");
    }
);

// Dedicated: get full food details (includes micro nutrients per serving)
export const fatsecretGetFood = onCall(
    { region: "us-central1", secrets: [FATSECRET_KEY, FATSECRET_SECRET] },
    async (request) => {
        const { food_id } = request.data || {};
        const fid = String(food_id || "").trim();
        if (!fid) throw new HttpsError("invalid-argument", "Missing 'food_id'.");

        // Ask API to flag default serving if possible
        const res = await fatSecretRequest("food.get.v2", { food_id: fid, flag_default_serving: "true" }, "basic");
        const food = res?.food || {};

        // Ensure minimal fields for client usage
        try {
            if (!food.food_description) {
                const servings = food?.servings?.serving;
                const arr = Array.isArray(servings) ? servings : (servings ? [servings] : []);
                const def = arr.find((s) => String(s?.is_default || "") === "1") || arr[0] || {};
                const calories = Number(def?.calories || 0);
                const fat = Number(def?.fat || 0);
                const carbs = Number(def?.carbohydrate || 0);
                const protein = Number(def?.protein || 0);
                const desc = `Per ${def?.serving_description || "1 serving"} - Calories: ${Math.round(calories)} kcal | Fat: ${+fat} g | Carbs: ${+carbs} g | Protein: ${+protein} g`;
                food.food_description = desc;
            }
        } catch { }

        return { food };
    }
);

export const fatsecretSearchFood = onCall(
    { region: "us-central1", secrets: [FATSECRET_KEY, FATSECRET_SECRET] },
    async (request) => {
        const { query, max_results = 10, page_number = 0 } = request.data || {};
        if (!query || typeof query !== "string") {
            throw new HttpsError("invalid-argument", "Missing 'query' string.");
        }

        // Clamp limits (FatSecret caps at 50 per page)
        const safeMax = Math.min(Math.max(Number(max_results) || 10, 1), 50);
        const safePage = Math.max(Number(page_number) || 0, 0);

        const overallStartedAt = Date.now();
        const qRaw = String(query || "");

        // -------------- helpers -------------- //
        const normalize = (s) =>
            String(s || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, " ")
                .replace(/\s+/g, " ")
                .trim();

        const toTokens = (s) => normalize(s).split(" ").filter(Boolean);

        const SYNONYM_TABLE = {
            soda: ["pop", "soft drink", "cola"],
            pop: ["soda", "soft drink", "cola"],
            cola: ["soda", "soft drink"],
            fries: ["french fries", "chips"],
            fry: ["french fry", "french fries", "chips"],
            potatoes: ["potato", "fries"],
            potato: ["potatoes", "fries"],
            oatmeal: ["porridge", "oats"],
            oats: ["oatmeal", "porridge"],
            yogurt: ["yoghurt"],
            yoghurt: ["yogurt"],
            candy: ["sweets", "confectionery"],
            cookies: ["biscuits"],
            cookie: ["biscuit", "cookies"],
            biscuit: ["cookie", "cookies"],
            pasta: ["spaghetti", "noodles"],
            noodles: ["pasta"],
            rice: ["white rice", "brown rice"],
            burger: ["hamburger"],
            hamburger: ["burger"],
            sandwich: ["sub", "hoagie"],
            sub: ["sandwich", "hoagie"],
            wrap: ["burrito"],
            burrito: ["wrap"],
            beans: ["legumes"],
            legumes: ["beans"],
            egg: ["eggs"],
            eggs: ["egg"],
            cereal: ["breakfast cereal"],
        };

        const expandTokensForMatch = (tokens) => {
            const expanded = new Set();
            for (const token of tokens) {
                if (!token) continue;
                expanded.add(token);
                const norm = normalize(token);
                if (norm) expanded.add(norm);
                if (norm.endsWith("ies")) expanded.add(norm.replace(/ies$/, "y"));
                if (norm.endsWith("es") && norm.length > 3) expanded.add(norm.replace(/es$/, ""));
                if (norm.endsWith("s") && norm.length > 3) expanded.add(norm.slice(0, -1));
                const syns = SYNONYM_TABLE[norm];
                if (Array.isArray(syns)) {
                    for (const syn of syns) {
                        expanded.add(syn);
                        for (const part of toTokens(syn)) expanded.add(part);
                    }
                }
            }
            return expanded;
        };

        const charNGrams = (s, n = 3) => {
            const str = normalize(s).replace(/\s+/g, "");
            const grams = new Set();
            if (!str) return grams;
            for (let i = 0; i <= Math.max(0, str.length - n); i++) {
                grams.add(str.slice(i, i + n));
            }
            if (grams.size === 0) grams.add(str);
            return grams;
        };

        const jaccard = (aSet, bSet) => {
            if (!aSet || !bSet || aSet.size === 0 || bSet.size === 0) return 0;
            let inter = 0;
            for (const x of aSet) if (bSet.has(x)) inter++;
            return inter / (aSet.size + bSet.size - inter);
        };

        const tokenOverlap = (aTokens, bTokens) => {
            if (!aTokens.length || !bTokens.length) return 0;
            const a = expandTokensForMatch(aTokens);
            const b = expandTokensForMatch(bTokens);
            let inter = 0;
            for (const t of a) if (b.has(t)) inter++;
            return (2 * inter) / (a.size + b.size);
        };

        const levenshteinSimilarity = (a, b) => {
            const from = normalize(a).replace(/\s+/g, "");
            const to = normalize(b).replace(/\s+/g, "");
            if (!from && !to) return 1;
            if (!from || !to) return 0;
            const maxLen = Math.max(from.length, to.length);
            if (maxLen === 0) return 1;

            const cappedFrom = from.slice(0, 80);
            const cappedTo = to.slice(0, 80);
            const m = cappedFrom.length;
            const n = cappedTo.length;
            let prev = new Array(n + 1);
            let curr = new Array(n + 1);
            for (let j = 0; j <= n; j++) prev[j] = j;
            for (let i = 1; i <= m; i++) {
                curr[0] = i;
                const charA = cappedFrom.charCodeAt(i - 1);
                for (let j = 1; j <= n; j++) {
                    const cost = charA === cappedTo.charCodeAt(j - 1) ? 0 : 1;
                    curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
                }
                [prev, curr] = [curr, prev];
            }
            const distance = prev[n];
            return Math.max(0, 1 - distance / maxLen);
        };

        const similarityScore = (queryStr, candidateStr) => {
            const qTokens = toTokens(queryStr);
            const cTokens = toTokens(candidateStr);
            const tokenScore = tokenOverlap(qTokens, cTokens);
            const qGrams = charNGrams(queryStr);
            const cGrams = charNGrams(candidateStr);
            const gramScore = jaccard(qGrams, cGrams);
            const levScore = levenshteinSimilarity(queryStr, candidateStr);

            let boost = 0;
            const normalizedQuery = normalize(queryStr);
            const normalizedCandidate = normalize(candidateStr);
            if (qTokens.length > 0 && normalizedCandidate.startsWith(qTokens[0])) boost += 0.05;
            if (normalizedQuery && normalizedCandidate.includes(normalizedQuery)) boost += 0.1;
            const allTokensPresent = qTokens.every((t) => normalizedCandidate.includes(t));
            if (allTokensPresent) boost += 0.05;

            const score = 0.45 * tokenScore + 0.25 * gramScore + 0.25 * levScore + boost;
            return Math.max(0, Math.min(1, score));
        };

        const buildDisplayName = (food) => {
            const name = String(food?.food_name || "");
            const brand = String(food?.brand_name || "");
            return brand ? `${name} ${brand}` : name;
        };

        const qNorm = normalize(qRaw);

        const qTokens = toTokens(qRaw);
        const candidates = new Set();

        const addCandidate = (expr) => {
            const cleaned = String(expr || "").trim();
            if (!cleaned) return;
            candidates.add(cleaned);
        };

        const addTokenVariants = (token) => {
            const variants = new Set();
            const raw = String(token || "").trim();
            if (!raw) return;
            variants.add(raw);
            const norm = normalize(raw);
            if (norm && norm !== raw) variants.add(norm);

            if (norm.endsWith("ies")) {
                const singular = norm.replace(/ies$/, "y");
                variants.add(singular);
            }
            if (norm.endsWith("es")) {
                variants.add(norm.replace(/es$/, ""));
            }
            if (norm.endsWith("s") && norm.length > 3) {
                variants.add(norm.slice(0, -1));
            } else {
                variants.add(`${norm}s`);
            }

            const syns = SYNONYM_TABLE[norm];
            if (Array.isArray(syns)) {
                for (const syn of syns) variants.add(syn);
            }

            for (const variant of variants) {
                addCandidate(variant);
            }
        };

        addCandidate(qRaw);
        if (qNorm && qNorm !== qRaw.trim()) addCandidate(qNorm);
        const qSynonyms = SYNONYM_TABLE[qNorm];
        if (Array.isArray(qSynonyms)) {
            for (const syn of qSynonyms) addCandidate(syn);
        }
        if (qTokens.length > 1) {
            const sorted = [...qTokens].sort().join(" ");
            if (sorted && sorted !== qNorm) candidates.add(sorted);
        }
        if (qTokens.length >= 2) {
            for (let size = Math.min(3, qTokens.length); size >= 2; size--) {
                for (let i = 0; i <= qTokens.length - size; i++) {
                    addCandidate(qTokens.slice(i, i + size).join(" "));
                }
            }
        }
        const STOP = new Set([
            "the", "and", "for", "with", "without", "of", "to", "in", "on", "a", "an", "per",
            "cup", "cups", "tbsp", "tsp", "tablespoon", "tablespoons", "teaspoon", "teaspoons",
            "oz", "ml", "l", "g", "kg", "gram", "grams", "milliliter", "milliliters", "liter", "liters",
        ]);
        for (const t0 of qTokens) {
            const t = t0.toLowerCase();
            if (STOP.has(t)) continue;
            if (t.length >= 3) addCandidate(t);
            if (t.length >= 4) addCandidate(t.slice(0, 3));
            if (t.length >= 5) addCandidate(t.slice(0, 4));
            addTokenVariants(t);
        }

        const variantListAll = Array.from(candidates);

        const rankVariants = (variants) => {
            return variants
                .map((expr, index) => {
                    const normalizedExpr = normalize(expr);
                    const similarity = similarityScore(qRaw, expr);
                    const exactBoost = normalizedExpr === qNorm ? 0.4 : 0;
                    const prefixBoost = normalizedExpr.startsWith(qNorm) && qNorm ? 0.2 : 0;
                    const lengthPenalty = Math.abs(expr.length - qRaw.length) * 0.005;
                    return {
                        expr,
                        score: similarity + exactBoost + prefixBoost - lengthPenalty,
                        index,
                    };
                })
                .sort((a, b) => {
                    if (b.score === a.score) return a.index - b.index;
                    return b.score - a.score;
                })
                .map((entry) => entry.expr);
        };

        const rankedVariants = rankVariants(variantListAll);

        const pageSize = safeMax;
        const startIndex = safePage * pageSize;
        const desiredUniqueCount = startIndex + pageSize;
        const RESULTS_PER_PAGE = Math.min(50, Math.max(pageSize, 20));
        const MAX_TOTAL_CALLS = 8;
        const MAX_CONCURRENT_VARIANTS = 3;
        const MAX_ADDITIONAL_PAGES = 3;
        const MAX_VARIANTS_PRIMARY = pageSize <= 10 ? 3 : 5;
        const MAX_VARIANTS_SECONDARY = 4;

        const cacheKeyRoot = `${qNorm}|${pageSize}`;
        const cachedContainer = fatsecretSearchCache.get(cacheKeyRoot);
        const cachedPayload = cachedContainer && cachedContainer.expiresAt > overallStartedAt ? cachedContainer.value || {} : null;
        const cachedRankedList = Array.isArray(cachedPayload?.rankedList) ? cachedPayload.rankedList : [];
        const cachedHasMore = cachedPayload?.hasMore;

        if (cachedPayload && (cachedRankedList.length >= startIndex + pageSize || cachedHasMore === false)) {
            const endIndex = startIndex + pageSize;
            const pageItems = cachedRankedList.slice(startIndex, endIndex).map((entry) => entry.item);
            const normalizedCachedHasMore = cachedHasMore === undefined ? true : !!cachedHasMore;
            const moreAvailable =
                cachedRankedList.length > endIndex || (normalizedCachedHasMore && cachedRankedList.length > startIndex);
            const response = {
                foods: {
                    food: pageItems,
                    max_results: String(pageSize),
                    page_number: String(safePage),
                    total_results: String(cachedRankedList.length),
                    has_more: moreAvailable,
                },
                debug: {
                    source: "cache",
                    uniqueFoodsConsidered: cachedRankedList.length,
                    cachedHasMore: cachedHasMore ?? null,
                },
            };

            const refreshed = {
                value: cachedPayload,
                expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
            };
            fatsecretSearchCache.set(cacheKeyRoot, refreshed);

            logger.info("fatsecretSearchFood stats", {
                query: qNorm,
                safeMax,
                safePage,
                cache: "hit",
                durationMs: Date.now() - overallStartedAt,
                cachedCount: cachedRankedList.length,
                cachedHasMore: cachedHasMore ?? null,
            });

            return response;
        }

        const byId = new Map();
        if (cachedRankedList.length) {
            for (const entry of cachedRankedList) {
                const fid = String(entry?.item?.food_id || "");
                if (!fid) continue;
                byId.set(fid, entry);
            }
        }

        const successfulVariants = new Set(Array.isArray(cachedPayload?.successfulVariants) ? cachedPayload.successfulVariants : []);
        let calls = 0;
        let scheduled = 0;
        let stopEarly = false;
        let totalCallDurationMs = 0;
        const attemptedTasks = new Set(Array.isArray(cachedPayload?.attemptedTasks) ? cachedPayload.attemptedTasks : []);

        const handleResultList = (expr, list) => {
            let anyAdded = false;
            for (const item of list) {
                const fid = String(item?.food_id || "");
                if (!fid) continue;
                const display = buildDisplayName(item);
                const score = similarityScore(qRaw, display);
                const prev = byId.get(fid);
                if (prev && score <= prev.bestScore) continue;
                byId.set(fid, { item, bestScore: score });
                anyAdded = true;
            }
            if (anyAdded) {
                successfulVariants.add(expr);
                if (byId.size >= desiredUniqueCount) {
                    stopEarly = true;
                }
            }
        };

        const executeTask = async ({ expr, page }) => {
            const requestStart = Date.now();
            try {
                const res = await fatSecretRequest(
                    "foods.search",
                    {
                        search_expression: expr,
                        max_results: RESULTS_PER_PAGE,
                        page_number: page,
                    },
                    "basic"
                );
                const foods = res?.foods?.food;
                if (!foods) return;
                const list = Array.isArray(foods) ? foods : [foods];
                if (!list.length) return;
                handleResultList(expr, list);
            } catch (e) {
                logger.warn("fatsecretSearchFood: variant search failed", {
                    expr,
                    page,
                    message: e?.message || e,
                });
            } finally {
                calls++;
                scheduled = Math.max(0, scheduled - 1);
                totalCallDurationMs += Date.now() - requestStart;
            }
        };

        const processQueue = async (queue) => {
            let index = 0;
            while (index < queue.length && !stopEarly) {
                const available = MAX_TOTAL_CALLS - (calls + scheduled);
                if (available <= 0) break;
                const batchSize = Math.min(MAX_CONCURRENT_VARIANTS, available, queue.length - index);
                if (batchSize <= 0) break;
                const batch = [];
                for (let i = 0; i < batchSize; i++) {
                    const task = queue[index++];
                    scheduled++;
                    batch.push(executeTask(task));
                }
                await Promise.all(batch);
            }
        };

        const runPageForVariants = async (page, variants) => {
            const queue = [];
            for (const expr of variants) {
                const cleaned = String(expr || "").trim();
                if (!cleaned) continue;
                const key = `${cleaned}|${page}`;
                if (attemptedTasks.has(key)) continue;
                attemptedTasks.add(key);
                queue.push({ expr: cleaned, page });
            }
            if (queue.length === 0) return;
            await processQueue(queue);
        };

        if (rankedVariants.length) {
            const primaryBatch = rankedVariants.slice(0, MAX_VARIANTS_PRIMARY);
            await runPageForVariants(safePage, primaryBatch);

            if (!stopEarly && byId.size < desiredUniqueCount) {
                const secondaryBatch = rankedVariants.slice(MAX_VARIANTS_PRIMARY, MAX_VARIANTS_PRIMARY + MAX_VARIANTS_SECONDARY);
                if (secondaryBatch.length) {
                    await runPageForVariants(safePage, secondaryBatch);
                }
            }

            if (!stopEarly && byId.size < desiredUniqueCount) {
                const remainingVariants = rankedVariants.slice(MAX_VARIANTS_PRIMARY + MAX_VARIANTS_SECONDARY);
                if (remainingVariants.length) {
                    await runPageForVariants(safePage, remainingVariants);
                }
            }
        }

        let pageOffset = 1;
        while (!stopEarly && byId.size < desiredUniqueCount && calls < MAX_TOTAL_CALLS && pageOffset <= MAX_ADDITIONAL_PAGES) {
            const nextPage = safePage + pageOffset;
            const followVariants = successfulVariants.size ? Array.from(successfulVariants) : rankedVariants;
            if (!followVariants.length) break;
            await runPageForVariants(nextPage, followVariants);
            pageOffset++;
        }

        const rankedEntries = Array.from(byId.values()).sort((a, b) => b.bestScore - a.bestScore);
        const rankedAll = rankedEntries.map((x) => x.item);
        const averageScore = rankedEntries.length
            ? rankedEntries.reduce((sum, entry) => sum + Number(entry.bestScore || 0), 0) / rankedEntries.length
            : 0;
        const topScore = rankedEntries.length ? rankedEntries[0].bestScore : 0;

        const endIndex = startIndex + pageSize;
        const pageItems = rankedAll.slice(startIndex, endIndex);
        const hasMore =
            rankedAll.length > endIndex ||
            (!stopEarly && calls < MAX_TOTAL_CALLS && successfulVariants.size > 0 && cachedHasMore !== false);

        const response = {
            foods: {
                food: pageItems,
                max_results: String(pageSize),
                page_number: String(safePage),
                total_results: String(rankedAll.length),
                has_more: hasMore,
            },
            debug: {
                fetchedPages: Array.from(attemptedTasks)
                    .map((key) => key.split("|")[1])
                    .filter((v, i, arr) => arr.indexOf(v) === i),
                uniqueFoodsConsidered: byId.size,
                calls,
                averageScore,
                topScore,
            },
        };

        const now = Date.now();
        const cacheValue = {
            rankedList: rankedEntries,
            hasMore,
            attemptedTasks: Array.from(attemptedTasks),
            successfulVariants: Array.from(successfulVariants),
            variantsConsidered: rankedVariants.length,
        };
        fatsecretSearchCache.set(cacheKeyRoot, { value: cacheValue, expiresAt: now + SEARCH_CACHE_TTL_MS });
        if (fatsecretSearchCache.size > 64) {
            for (const [key, entry] of fatsecretSearchCache) {
                if (entry.expiresAt <= now || fatsecretSearchCache.size > 64) {
                    fatsecretSearchCache.delete(key);
                }
                if (fatsecretSearchCache.size <= 64) break;
            }
        }

        logger.info("fatsecretSearchFood stats", {
            query: qNorm,
            safeMax,
            safePage,
            cache: "miss",
            variantsConsidered: rankedVariants.length,
            variantsWithHits: successfulVariants.size,
            totalCandidates: byId.size,
            calls,
            durationMs: Date.now() - overallStartedAt,
            totalCallDurationMs,
            stopEarly,
            hasMore,
            averageScore,
            topScore,
        });

        return response;
    }
);

// ---- Barcode Lookup (Premier Exclusive) ---- //
function toGtin13(raw) {
    try {
        const digits = String(raw || "").replace(/\D/g, "");
        if (!digits) return "";
        // Pad left with zeros to 13 (GTIN-13 requirement)
        return digits.length >= 13 ? digits.slice(-13) : digits.padStart(13, "0");
    } catch {
        return "";
    }
}

export const fatsecretLookupBarcode = onCall(
    { region: "us-central1", secrets: [FATSECRET_KEY, FATSECRET_SECRET] },
    async (request) => {
        const { barcode } = request.data || {};
        const gtin = toGtin13(barcode);
        if (!gtin || gtin.length !== 13) {
            throw new HttpsError("invalid-argument", "Invalid or missing barcode");
        }

        // Resolve barcode -> food (FatSecret v2 returns full payload)
        let foodRes;
        try {
            foodRes = await fatSecretRequest(
                "food.find_id_for_barcode.v2",
                { barcode: gtin, flag_default_serving: "true" },
                "premier barcode"
            );
        } catch (err) {
            if (err instanceof HttpsError) {
                const msg = String(err.message || "").toLowerCase();
                if (msg.includes("no food") || msg.includes("211")) {
                    throw new HttpsError("not-found", "No food found for this barcode");
                }
            }
            throw err;
        }

        const food = foodRes?.food || {};
        if (!food || Object.keys(food).length === 0) {
            throw new HttpsError("not-found", "No food found for this barcode");
        }

        // Ensure a FatSecret-like food_description exists (used by client to parse macros)
        try {
            if (!food.food_description) {
                const servings = food?.servings?.serving;
                const arr = Array.isArray(servings) ? servings : (servings ? [servings] : []);
                const def = arr.find((s) => String(s?.is_default || "") === "1") || arr[0] || {};
                const calories = Number(def?.calories || 0);
                const fat = Number(def?.fat || 0);
                const carbs = Number(def?.carbohydrate || 0);
                const protein = Number(def?.protein || 0);
                const desc = `Per ${def?.serving_description || "1 serving"} - Calories: ${Math.round(calories)} kcal | Fat: ${+fat} g | Carbs: ${+carbs} g | Protein: ${+protein} g`;
                food.food_description = desc;
            }
        } catch { }

        return { food };
    }
);


// --------------- Leaderboard Last Rank Refresh ---------------- //
const EPSILON = 1e-6;
const HEX_RANK_KEYS = ['overall', 'chest', 'shoulders', 'abs', 'back', 'legs', 'arms'];

function ensureMembersInValueMap(valueMap, memberIds) {
    memberIds.forEach((uid) => {
        if (!valueMap.has(uid)) {
            valueMap.set(uid, 0);
        }
    });
}

function buildEntriesForMembers(valueMap, memberIds) {
    if (!memberIds || !memberIds.length) return [];
    const sorted = memberIds.slice().sort((a, b) => safeNumber(valueMap.get(b)) - safeNumber(valueMap.get(a)));
    const entries = [];
    let lastValue = null;
    let lastRank = 0;
    sorted.forEach((uid, index) => {
        const value = safeNumber(valueMap.get(uid));
        let rank;
        if (index === 0) {
            rank = 1;
            lastValue = value;
            lastRank = rank;
        } else if (Math.abs(value - lastValue) > EPSILON) {
            rank = index + 1;
            lastValue = value;
            lastRank = rank;
        } else {
            rank = lastRank;
        }
        entries.push({ uid, rank });
    });
    return entries;
}

function toUid(value) {
    if (value === undefined || value === null) return null;
    try {
        const str = String(value).trim();
        return str ? str : null;
    } catch {
        return null;
    }
}

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function computeGlobalRanks(valueMap) {
    const entries = Array.from(valueMap.entries()).map(([uid, value]) => ({
        uid,
        value: safeNumber(value),
    }));
    entries.sort((a, b) => b.value - a.value);

    const ranks = new Map();
    let lastRank = 0;
    let lastValue = null;
    entries.forEach((entry, index) => {
        if (index === 0) {
            lastRank = 1;
            lastValue = entry.value;
        } else if (Math.abs(entry.value - lastValue) > EPSILON) {
            lastRank = index + 1;
            lastValue = entry.value;
        }
        ranks.set(entry.uid, lastRank);
    });
    return ranks;
}

export const refreshLeaderboardLastRanks = onSchedule(
    {
        schedule: '0 0 * * 0',
        timeZone: 'UTC',
        region: 'us-central1',
        timeoutSeconds: 540,
        memory: '1GiB',
    },
    async () => {
        const started = Date.now();
        const usersSnap = await adminDb.collection('usersPublic').get();
        if (usersSnap.empty) {
            logger.info('refreshLeaderboardLastRanks: no users found');
            return;
        }

        const users = [];
        const followingByUid = new Map();
        const statsByUid = new Map();
        const hexStatsByUid = new Map();

        usersSnap.forEach((docSnap) => {
            try {
                const data = docSnap.data() || {};
                const uid = toUid(data?.uid) || docSnap.id;
                if (!uid) return;
                const isPrivate =
                    data?.privacy?.profile === 'private' ||
                    data?.profilePrivacy === 'private' ||
                    data?.isProfilePrivate === true ||
                    data?.isPrivate === true;
                if (isPrivate) return;

                const ref = docSnap.ref;
                const statsExercises =
                    data?.statsExercises && typeof data.statsExercises === 'object'
                        ? data.statsExercises
                        : {};
                const statsHexagonRaw =
                    data?.statsHexagon && typeof data.statsHexagon === 'object'
                        ? data.statsHexagon
                        : {};
                const statsHexagon = Object.fromEntries(
                    Object.entries(statsHexagonRaw || {}).map(([k, v]) => [String(k).toLowerCase(), v]),
                );

                const followingSet = new Set([uid]);
                const followingArr = Array.isArray(data?.following) ? data.following : [];
                for (const entry of followingArr) {
                    const fUid = toUid(entry?.uid ?? entry?.id ?? entry);
                    if (fUid) followingSet.add(fUid);
                }

                users.push({ uid, ref, statsExercises, data });
                followingByUid.set(uid, followingSet);
                statsByUid.set(uid, statsExercises);
                hexStatsByUid.set(uid, statsHexagon);
            } catch (err) {
                logger.warn('refreshLeaderboardLastRanks: failed to process user doc', {
                    id: docSnap.id,
                    message: err?.message || err,
                });
            }
        });

        if (!users.length) {
            logger.info('refreshLeaderboardLastRanks: no users after filtering');
            return;
        }

        const snapshotId = new Date().toISOString();
        const snapshotMetaRef = adminDb.collection('leaderboardMeta').doc('currentSnapshot');

        const tribeMembers = new Map();
        const tribesForUser = new Map();
        try {
            const tribeSnap = await adminDb.collection('tribes').get();
            tribeSnap.forEach((docSnap) => {
                const tid = docSnap.id;
                const data = docSnap.data() || {};
                const membersArr = Array.isArray(data?.members) ? data.members : [];
                const set = tribeMembers.get(tid) || new Set();
                membersArr.forEach((member) => {
                    const mUid = toUid(member?.uid ?? member?.id ?? member);
                    if (!mUid) return;
                    set.add(mUid);
                    const byUser = tribesForUser.get(mUid) || new Set();
                    byUser.add(tid);
                    tribesForUser.set(mUid, byUser);
                });
                if (set.size) tribeMembers.set(tid, set);
            });
        } catch (err) {
            logger.warn('refreshLeaderboardLastRanks: tribe fetch failed', err?.message || err);
        }

        users.forEach(({ uid, data }) => {
            const arr = Array.isArray(data?.tribeIds) ? data.tribeIds : [];
            arr.forEach((tidRaw) => {
                const tid = toUid(tidRaw);
                if (!tid) return;
                const memberSet = tribeMembers.get(tid) || new Set();
                memberSet.add(uid);
                tribeMembers.set(tid, memberSet);
                const byUser = tribesForUser.get(uid) || new Set();
                byUser.add(tid);
                tribesForUser.set(uid, byUser);
            });
        });

        const allExercises = new Set();
        statsByUid.forEach((stats) => {
            Object.keys(stats || {}).forEach((exercise) => {
                if (exercise) allExercises.add(exercise);
            });
        });

        const allHexKeys = new Set();
        hexStatsByUid.forEach((stats) => {
            Object.keys(stats || {}).forEach((key) => {
                const normalized = String(key).toLowerCase();
                if (HEX_RANK_KEYS.includes(normalized)) {
                    allHexKeys.add(normalized);
                }
            });
        });

        if (!allExercises.size && !allHexKeys.size) {
            logger.info('refreshLeaderboardLastRanks: no leaderboard metrics found to rank');
            return;
        }

        const exerciseMaps = new Map();
        for (const exercise of allExercises) {
            const valueMap = new Map();
            users.forEach(({ uid }) => {
                const stats = statsByUid.get(uid) || {};
                const exStats = stats?.[exercise] || {};
                const value = safeNumber(exStats?.['1RM']);
                valueMap.set(uid, value);
            });
            const ranks = computeGlobalRanks(valueMap);
            exerciseMaps.set(exercise, { valueMap, ranks });
        }

        const hexMaps = new Map();
        for (const key of allHexKeys) {
            const valueMap = new Map();
            users.forEach(({ uid }) => {
                const stats = hexStatsByUid.get(uid) || {};
                const raw = stats?.[key];
                const value = safeNumber(raw);
                valueMap.set(uid, value);
            });
            const ranks = computeGlobalRanks(valueMap);
            hexMaps.set(key, { valueMap, ranks });
        }

        const globalMemberIds = users.map(({ uid }) => uid);
        const globalExerciseSnapshot = {};
        const globalHexSnapshot = {};

        for (const exercise of allExercises) {
            const config = exerciseMaps.get(exercise);
            if (!config) continue;
            ensureMembersInValueMap(config.valueMap, globalMemberIds);
            const entries = buildEntriesForMembers(config.valueMap, globalMemberIds);
            if (entries.length) globalExerciseSnapshot[exercise] = entries;
        }

        for (const hexKey of allHexKeys) {
            const config = hexMaps.get(hexKey);
            if (!config) continue;
            ensureMembersInValueMap(config.valueMap, globalMemberIds);
            const entries = buildEntriesForMembers(config.valueMap, globalMemberIds);
            if (entries.length) globalHexSnapshot[hexKey] = entries;
        }

        const updates = [];
        users.forEach(({ uid, ref, statsExercises }) => {
            const exerciseNames = Object.keys(statsExercises || {});
            const followingSet = followingByUid.get(uid) || new Set([uid]);
            if (!followingSet.has(uid)) followingSet.add(uid);
            const tribeSet = tribesForUser.get(uid) || new Set();

            const followingExercises = {};
            const followingHex = {};

            const followingIds = Array.from(followingSet).map((id) => String(id));

            exerciseNames.forEach((exercise) => {
                const config = exerciseMaps.get(exercise);
                if (!config) return;
                ensureMembersInValueMap(config.valueMap, followingIds);
                const entries = buildEntriesForMembers(config.valueMap, followingIds);
                if (entries.length) {
                    followingExercises[exercise] = { snapshotId, entries };
                }
            });

            allHexKeys.forEach((hexKey) => {
                const config = hexMaps.get(hexKey);
                if (!config) return;
                ensureMembersInValueMap(config.valueMap, followingIds);
                const entries = buildEntriesForMembers(config.valueMap, followingIds);
                if (entries.length) {
                    followingHex[hexKey] = { snapshotId, entries };
                }
            });

            const tribeSnapshots = {};
            tribeSet.forEach((tid) => {
                const memberSet = tribeMembers.get(tid) || new Set();
                if (!memberSet.size) return;
                if (!memberSet.has(uid)) memberSet.add(uid);
                const memberIds = Array.from(memberSet).map((id) => String(id));

                const tribeExercises = {};
                exerciseNames.forEach((exercise) => {
                    const config = exerciseMaps.get(exercise);
                    if (!config) return;
                    ensureMembersInValueMap(config.valueMap, memberIds);
                    const entries = buildEntriesForMembers(config.valueMap, memberIds);
                    if (entries.length) {
                        tribeExercises[exercise] = { snapshotId, entries };
                    }
                });

                const tribeHex = {};
                allHexKeys.forEach((hexKey) => {
                    const config = hexMaps.get(hexKey);
                    if (!config) return;
                    ensureMembersInValueMap(config.valueMap, memberIds);
                    const entries = buildEntriesForMembers(config.valueMap, memberIds);
                    if (entries.length) {
                        tribeHex[hexKey] = { snapshotId, entries };
                    }
                });

                const snapshot = {};
                if (Object.keys(tribeExercises).length) snapshot.exercises = tribeExercises;
                if (Object.keys(tribeHex).length) snapshot.hex = tribeHex;
                if (Object.keys(snapshot).length) {
                    tribeSnapshots[tid] = snapshot;
                }
            });

            const nextLastRanks = {};
            if (Object.keys(followingExercises).length || Object.keys(followingHex).length) {
                nextLastRanks.following = {};
                if (Object.keys(followingExercises).length) nextLastRanks.following.exercises = followingExercises;
                if (Object.keys(followingHex).length) nextLastRanks.following.hex = followingHex;
            }
            if (Object.keys(tribeSnapshots).length) {
                nextLastRanks.tribes = tribeSnapshots;
            }

            if (Object.keys(nextLastRanks).length === 0) {
                updates.push({
                    ref,
                    data: {
                        lastRanks: FieldValue.delete(),
                        lastRanksVersion: FieldValue.delete(),
                        lastRanksUpdatedAt: FieldValue.serverTimestamp(),
                    },
                });
            } else {
                updates.push({
                    ref,
                    data: {
                        lastRanks: nextLastRanks,
                        lastRanksVersion: 4,
                        lastRanksUpdatedAt: FieldValue.serverTimestamp(),
                    },
                });
            }
        });

        const snapshotDoc = {
            snapshotId,
            generatedAt: FieldValue.serverTimestamp(),
            exercises: globalExerciseSnapshot,
            hex: globalHexSnapshot,
        };
        await adminDb.collection('leaderboardSnapshots').doc(snapshotId).set(snapshotDoc);
        await snapshotMetaRef.set(
            {
                snapshotId,
                generatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );

        if (!updates.length) {
            logger.info(
                'refreshLeaderboardLastRanks: no user updates required (%d users, %d exercises, %dms)',
                users.length,
                allExercises.size,
                Date.now() - started,
            );
            return;
        }

        let batch = adminDb.batch();
        let writes = 0;
        for (const { ref, data } of updates) {
            batch.set(ref, data, { merge: true });
            writes += 1;
            if (writes === 400) {
                await batch.commit();
                batch = adminDb.batch();
                writes = 0;
            }
        }
        if (writes > 0) {
            await batch.commit();
        }

        logger.info(
            'refreshLeaderboardLastRanks: updated %d users (%d exercises) in %dms',
            updates.length,
            allExercises.size,
            Date.now() - started,
        );
    }
);


const toMillisSafe = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return numeric;
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) return parsed;
        return null;
    }
    if (value instanceof Date) {
        const ms = value.getTime();
        return Number.isFinite(ms) ? ms : null;
    }
    if (typeof value === "object") {
        try {
            if (typeof value.toDate === "function") {
                const date = value.toDate();
                if (date instanceof Date) {
                    const ms = date.getTime();
                    if (Number.isFinite(ms)) return ms;
                }
            }
        } catch { }
        const seconds = Number(value.seconds);
        if (Number.isFinite(seconds)) {
            const nanos = Number(value.nanoseconds ?? value.nanos ?? 0);
            const extra = Number.isFinite(nanos) ? Math.floor(nanos / 1e6) : 0;
            return seconds * 1000 + extra;
        }
    }
    return null;
};

const workoutIdentityKey = (workout) => {
    if (!workout || typeof workout !== "object") return null;
    const wid =
        workout?.wid ??
        workout?.id ??
        workout?.workoutId ??
        workout?.sessionId ??
        workout?.workoutUid ??
        null;
    if (wid !== null && wid !== undefined) {
        return `wid:${String(wid)}`;
    }

    const createdMs =
        toMillisSafe(workout?.completedAt) ??
        toMillisSafe(workout?.finishedAt) ??
        toMillisSafe(workout?.created) ??
        null;

    if (createdMs !== null) {
        const owner =
            workout?.creatorUID ??
            workout?.creatorUid ??
            workout?.uid ??
            workout?.ownerUid ??
            "";
        const name = typeof workout?.name === "string" ? workout.name.toLowerCase() : "";
        return `time:${createdMs}:${owner}:${name}`;
    }

    try {
        return `json:${JSON.stringify(workout)}`;
    } catch {
        return null;
    }
};

const normalizeWorkoutMedia = (workout) => {
    const output = [];
    const seen = new Set();

    const pushEntry = (uri, type = "image") => {
        if (!uri) return;
        const trimmed = String(uri).trim();
        if (!trimmed) return;
        const key = `${trimmed}|${type}`;
        if (seen.has(key)) return;
        seen.add(key);
        output.push({ uri: trimmed, type: type === "video" ? "video" : "image" });
    };

    const processEntry = (entry) => {
        if (!entry) return;
        if (typeof entry === "string") {
            pushEntry(entry, "image");
            return;
        }
        if (typeof entry === "object") {
            const uri =
                entry?.uri ??
                entry?.url ??
                entry?.image ??
                entry?.photoURL ??
                entry?.photoUrl ??
                entry?.source ??
                null;
            if (!uri) return;
            const rawType = (entry?.type ?? entry?.mediaType ?? entry?.kind ?? "").toString().toLowerCase();
            const type = rawType.includes("video") ? "video" : "image";
            pushEntry(uri, type);
        }
    };

    if (Array.isArray(workout?.media)) workout.media.forEach(processEntry);
    if (Array.isArray(workout?.images)) workout.images.forEach(processEntry);

    return output;
};

const sanitizeWorkoutSnapshot = (workout) => {
    if (!workout || typeof workout !== "object") return null;
    try {
        const clone = JSON.parse(JSON.stringify(workout));
        if (!clone) return null;
        const createdMs = toMillisSafe(clone.created);
        if (createdMs !== null) {
            clone.created = createdMs;
        } else {
            delete clone.created;
        }
        if (clone.wid !== undefined && clone.wid !== null) {
            clone.wid = String(clone.wid);
        }
        if (clone.id !== undefined && clone.id !== null && clone.wid === undefined) {
            clone.id = String(clone.id);
        }
        if (!clone.privacyMode || typeof clone.privacyMode !== "string" || !clone.privacyMode.trim()) {
            clone.privacyMode = "global";
        }
        return clone;
    } catch {
        const fallback = {
            wid: workout?.wid ?? workout?.id ?? null,
            name: workout?.name ?? workout?.templateName ?? null,
            created: toMillisSafe(workout?.created) ?? Date.now(),
        };
        if (!fallback.privacyMode) fallback.privacyMode = "global";
        if (fallback.wid !== null && fallback.wid !== undefined) {
            fallback.wid = String(fallback.wid);
        }
        return fallback;
    }
};

const resolveUserHandle = (userData, fallbackUid) => {
    const candidates = [userData?.handle, userData?.username, userData?.tag, userData?.name];
    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim();
        }
    }
    if (fallbackUid) {
        const suffix = String(fallbackUid).slice(-6) || String(fallbackUid);
        return `user-${suffix}`;
    }
    return "user";
};

const resolveUserAvatar = (userData) => {
    const candidates = [userData?.pfp, userData?.pfpUrl, userData?.image, userData?.photoURL, userData?.photoUrl];
    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim();
        }
    }
    return "";
};

export const onCompletedWorkoutAutoPost = onDocumentWritten(
    "users/{uid}",
    async (event) => {
        const uid = event.params?.uid ? String(event.params.uid) : "";
        if (!uid) return;

        try {
            const afterSnap = event.data?.after;
            if (!afterSnap || !afterSnap.exists) return;
            const afterData = afterSnap.data() || {};
            const beforeData = event.data?.before?.data() || {};

            const afterWorkouts = Array.isArray(afterData?.completedWorkouts)
                ? afterData.completedWorkouts
                : [];
            if (afterWorkouts.length === 0) return;

            const beforeWorkouts = Array.isArray(beforeData?.completedWorkouts)
                ? beforeData.completedWorkouts
                : [];

            const seenKeys = new Set();
            beforeWorkouts.forEach((workout) => {
                const key = workoutIdentityKey(workout);
                if (key) seenKeys.add(key);
            });

            const newWorkouts = [];
            afterWorkouts.forEach((workout) => {
                const key = workoutIdentityKey(workout);
                if (!key) return;
                if (seenKeys.has(key)) return;
                seenKeys.add(key);
                newWorkouts.push(workout);
            });

            if (!newWorkouts.length) return;

            const handle = resolveUserHandle(afterData, uid);
            const avatar = resolveUserAvatar(afterData);
            const postsCollection = adminDb.collection("posts");
            const batch = adminDb.batch();
            const postIds = [];
            const postIdByWorkoutKey = new Map();

            newWorkouts.forEach((workout) => {
                const workoutSnapshot = sanitizeWorkoutSnapshot(workout);
                if (!workoutSnapshot) return;

                const privacy = typeof workoutSnapshot?.privacyMode === "string"
                    ? workoutSnapshot.privacyMode.trim().toLowerCase()
                    : "";
                if (privacy === "hidden") return;

                const media = normalizeWorkoutMedia(workoutSnapshot);
                const createdMs =
                    toMillisSafe(workoutSnapshot?.completedAt) ??
                    toMillisSafe(workoutSnapshot?.finishedAt) ??
                    toMillisSafe(workoutSnapshot?.created) ??
                    Date.now();

                if (workoutSnapshot.created === undefined || workoutSnapshot.created === null) {
                    workoutSnapshot.created = createdMs;
                } else {
                    const normalizedCreated = toMillisSafe(workoutSnapshot.created);
                    workoutSnapshot.created = normalizedCreated ?? createdMs;
                }

                if (workoutSnapshot.privacyMode === undefined || workoutSnapshot.privacyMode === null) {
                    workoutSnapshot.privacyMode = "global";
                }

                const caption = (() => {
                    if (typeof workoutSnapshot?.name === "string" && workoutSnapshot.name.trim()) {
                        return workoutSnapshot.name.trim();
                    }
                    if (typeof workoutSnapshot?.templateName === "string" && workoutSnapshot.templateName.trim()) {
                        return workoutSnapshot.templateName.trim();
                    }
                    if (typeof workoutSnapshot?.template?.name === "string" && workoutSnapshot.template.name.trim()) {
                        return workoutSnapshot.template.name.trim();
                    }
                    return "";
                })();

                const comments = caption
                    ? [
                        {
                            content: caption,
                            handle,
                            isCaption: true,
                            pfp: avatar,
                            timestamp: createdMs,
                            uid,
                        },
                    ]
                    : [];

                const postRef = postsCollection.doc();
                const pid = postRef.id;
                const rawWorkoutKey = workoutIdentityKey(workout);
                const snapshotWorkoutKey = workoutIdentityKey(workoutSnapshot);
                if (rawWorkoutKey) {
                    postIdByWorkoutKey.set(rawWorkoutKey, pid);
                }
                if (snapshotWorkoutKey) {
                    postIdByWorkoutKey.set(snapshotWorkoutKey, pid);
                }

                workoutSnapshot.postPid = pid;
                if (!workoutSnapshot.pid) {
                    workoutSnapshot.pid = pid;
                }

                const postPayload = {
                    pid,
                    uid,
                    handle,
                    pfp: avatar,
                    created: createdMs,
                    caption,
                    workout: workoutSnapshot,
                    media,
                    likes: [],
                    comments,
                    tagged: [],
                    tags: [],
                    likeCount: 0,
                    commentCount: comments.length,
                    shareCount: 0,
                    autoGenerated: true,
                };

                if (workoutSnapshot?.wid || workoutSnapshot?.id) {
                    postPayload.workoutWid = String(workoutSnapshot?.wid ?? workoutSnapshot?.id);
                }

                batch.set(postRef, postPayload);
                postIds.push(pid);
            });

            if (!postIds.length) return;

            await batch.commit();

            if (postIdByWorkoutKey.size > 0) {
                const userRefLink = adminDb.doc(`users/${uid}`);
                const linkedAt = Date.now();
                try {
                    await adminDb.runTransaction(async (txn) => {
                        const snap = await txn.get(userRefLink);
                        if (!snap.exists) return;
                        const workoutsArr = Array.isArray(snap.get("completedWorkouts"))
                            ? snap.get("completedWorkouts")
                            : [];
                        let changed = false;
                        const updatedArr = workoutsArr.map((entry) => {
                            const key = workoutIdentityKey(entry);
                            if (!key) return entry;
                            const pid = postIdByWorkoutKey.get(key);
                            if (!pid) return entry;
                            if (entry?.postPid === pid) return entry;
                            changed = true;
                            const patched = {
                                ...entry,
                                postPid: pid,
                                postPidLinkedAt: linkedAt,
                            };
                            if (patched.pid !== pid) {
                                patched.pid = pid;
                            }
                            return patched;
                        });
                        if (changed) {
                            txn.update(userRefLink, { completedWorkouts: updatedArr });
                        }
                    });
                } catch (error) {
                    logger.warn("onCompletedWorkoutAutoPost: failed to attach postPid to completedWorkouts", {
                        uid,
                        error,
                    });
                }

                const publicRefLink = adminDb.doc(`usersPublic/${uid}`);
                try {
                    await adminDb.runTransaction(async (txn) => {
                        const snap = await txn.get(publicRefLink);
                        if (!snap.exists) return;
                        const workoutsArr = Array.isArray(snap.get("completedWorkouts"))
                            ? snap.get("completedWorkouts")
                            : [];
                        let changed = false;
                        const updatedArr = workoutsArr.map((entry) => {
                            const key = workoutIdentityKey(entry);
                            if (!key) return entry;
                            const pid = postIdByWorkoutKey.get(key);
                            if (!pid) return entry;
                            if (entry?.postPid === pid) return entry;
                            changed = true;
                            const patched = {
                                ...entry,
                                postPid: pid,
                                postPidLinkedAt: linkedAt,
                            };
                            if (patched.pid !== pid) {
                                patched.pid = pid;
                            }
                            return patched;
                        });
                        if (changed) {
                            txn.update(publicRefLink, { completedWorkouts: updatedArr });
                        }
                    });
                } catch (error) {
                    logger.warn("onCompletedWorkoutAutoPost: failed to attach postPid within usersPublic", {
                        uid,
                        error,
                    });
                }
            }

            const userRef = adminDb.doc(`users/${uid}`);
            const userPublicRef = adminDb.doc(`usersPublic/${uid}`);
            const postUpdatePayload = {
                posts: FieldValue.arrayUnion(...postIds),
                postCount: FieldValue.increment(postIds.length),
            };
            try {
                await userRef.set(postUpdatePayload, { merge: true });
            } catch (error) {
                logger.warn("onCompletedWorkoutAutoPost: failed to update legacy user posts array", {
                    uid,
                    error,
                });
            }

            try {
                await userPublicRef.set(postUpdatePayload, { merge: true });
            } catch (error) {
                logger.warn("onCompletedWorkoutAutoPost: failed to update usersPublic posts array", {
                    uid,
                    error,
                });
            }

            try {
                await adminDb.doc("global/posts").set(
                    {
                        PIDs: FieldValue.arrayUnion(...postIds),
                    },
                    { merge: true }
                );
            } catch (error) {
                logger.warn("onCompletedWorkoutAutoPost: failed to append to global posts", {
                    error,
                });
            }

            logger.info("onCompletedWorkoutAutoPost: created posts", {
                uid,
                count: postIds.length,
            });
        } catch (error) {
            logger.error("onCompletedWorkoutAutoPost: unexpected error", { uid, error });
        }
    }
);

// ---------------- Chat: Push Notifications on New Messages ---------------- //

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

export const onChatMessageCreated = onDocumentCreated(
    "messages/{cid}/content/{mid}",
    async (event) => {
        try {
            const snap = event.data;
            if (!snap) return;
            const message = snap.data();
            const { params } = event;
            const cid = params?.cid;
            if (!cid || !message) return;

            const senderUid =
                message?.sender?.uid || message?.senderUid || message?.uid || null;
            if (!senderUid) return;

            // Load parent chat to find all participants
            const chatDoc = await adminDb.collection("messages").doc(cid).get();
            if (!chatDoc.exists) {
                logger.warn("onChatMessageCreated missing chat doc", { cid });
                return;
            }
            const chat = chatDoc.data() || {};
            const memberUids = Array.isArray(chat?.memberUids)
                ? chat.memberUids
                : (Array.isArray(chat?.users) ? chat.users.map((u) => u?.uid).filter(Boolean) : []);
            const isGroup = !!(chat?.isGroup || (memberUids?.length > 2));

            const recipients = (memberUids || []).filter((uid) => uid && uid !== senderUid);
            if (!recipients.length) return;
            logger.info("onChatMessageCreated recipients", { cid, senderUid, recipients });

            // Fetch recipient push tokens and preferences
            const userDocs = await Promise.all(
                recipients.map((uid) => adminDb.collection("usersPrivate").doc(uid).get().catch(() => null))
            );
            const targets = [];
            const skipForeground = [];
            userDocs.forEach((d, i) => {
                try {
                    if (!d || !d.exists) return;
                    const data = d.data() || {};
                    const wantsPush = data?.settings?.push !== false;
                    const isForeground = data?.appForeground === true;
                    const token = (data?.expoPushToken || "").trim();
                    if (wantsPush && !isForeground && token && token.startsWith("ExponentPushToken")) {
                        targets.push({
                            uid: recipients[i],
                            token,
                        });
                    } else if (isForeground) {
                        skipForeground.push(recipients[i]);
                    }
                } catch { }
            });
            logger.info("onChatMessageCreated targets", { cid, targetCount: targets.length, skipForeground });

            // Build notification payload
            const senderName = message?.sender?.name || message?.sender?.handle || "Someone";
            const hasMedia = Array.isArray(message?.media) && message.media.length > 0;
            const bodyText = (message?.text || "").trim();
            const preview = bodyText
                ? bodyText.slice(0, 120)
                : (hasMedia ? "Sent a photo/video" : "Sent a message");
            const title = isGroup ? `${senderName} in chat` : `${senderName}`;

            // Send via Expo Push API in chunks
            const messages = targets.map((t) => ({
                to: t.token,
                sound: "default",
                title,
                body: preview,
                data: { type: "chat", cid, senderUid },
                priority: "high",
            }));

            for (const grp of chunk(messages, 90)) {
                try {
                    await fetch("https://exp.host/--/api/v2/push/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Accept: "application/json" },
                        body: JSON.stringify(grp),
                    });
                } catch (e) {
                    logger.error("Expo push send error", e);
                }
            }

            // Increment simple unread aggregate for recipients
            await Promise.all(
                recipients.map((uid) =>
                    adminDb.collection("usersPrivate").doc(uid).set({ unreadMessagesCount: FieldValue.increment(1) }, { merge: true })
                        .catch(() => { })
                )
            );
        } catch (err) {
            logger.error("onChatMessageCreated error", err);
        }
    }
);

// ---------------- Workouts: Append Per-Set History ---------------- //

function toDayKey(input) {
    try {
        const d = input instanceof Date ? input : new Date(Number(input) || Date.now());
        d.setHours(0, 0, 0, 0);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } catch {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
}

const ALLOWED_REPORT_REASONS = new Set([
    "spam",
    "harassment",
    "nudity",
    "self-harm",
    "misinformation",
    "other",
]);

const REPORT_DETAILS_MAX_LENGTH = 1000;
const REPORT_METADATA_VALUE_MAX = 300;

function sanitizeString(value, max = 255) {
    if (value === null || value === undefined) return "";
    const trimmed = String(value).trim();
    if (!trimmed) return "";
    if (trimmed.length <= max) return trimmed;
    return trimmed.slice(0, max);
}

function coerceReason(reasonRaw) {
    const sanitized = sanitizeString(reasonRaw, 60).toLowerCase();
    if (!sanitized) return "";
    if (ALLOWED_REPORT_REASONS.has(sanitized)) return sanitized;
    return sanitized.slice(0, 60);
}

function sanitizeMetadata(metadataRaw) {
    if (!metadataRaw || typeof metadataRaw !== "object") return {};
    const out = {};
    const entries = Object.entries(metadataRaw).slice(0, 12);
    entries.forEach(([key, value], index) => {
        if (!key) return;
        const safeKeyBase = sanitizeString(key, 40) || `field_${index}`;
        const safeKey = safeKeyBase.replace(/[^a-zA-Z0-9_.-]/g, "_");
        if (value === null || value === undefined) return;
        if (typeof value === "string") {
            out[safeKey] = sanitizeString(value, REPORT_METADATA_VALUE_MAX);
        } else if (typeof value === "number" || typeof value === "boolean") {
            out[safeKey] = value;
        } else {
            try {
                const serialized = JSON.stringify(value);
                out[safeKey] = sanitizeString(serialized, REPORT_METADATA_VALUE_MAX);
            } catch {
                // ignore non-serializable entries
            }
        }
    });
    return out;
}

function sanitizeClientInfo(info) {
    if (!info || typeof info !== "object") return {};
    const out = {};
    if (info.platform) out.platform = sanitizeString(info.platform, 32).toLowerCase();
    if (info.appVersion) out.appVersion = sanitizeString(info.appVersion, 32);
    if (info.buildNumber) out.buildNumber = sanitizeString(info.buildNumber, 32);
    if (info.deviceName) out.deviceName = sanitizeString(info.deviceName, 64);
    if (info.locale) out.locale = sanitizeString(info.locale, 32);
    if (info.appOwnership) out.appOwnership = sanitizeString(info.appOwnership, 16);
    out.receivedAt = Date.now();
    return out;
}

export const appendWorkoutSets = onCall({ region: "us-central1" }, async (request) => {
    const authUid = request?.auth?.uid || null;
    if (!authUid) throw new HttpsError("unauthenticated", "Must be signed in.");

    const { wid, created, exercises } = request.data || {};
    if (!wid || !Array.isArray(exercises)) {
        throw new HttpsError("invalid-argument", "Missing 'wid' or 'exercises' array.");
    }

    const day = toDayKey(created);
    const ref = adminDb.doc(`users/${authUid}`);

    // Build a single update payload with dotted paths + arrayUnion for each exercise
    const updatePayload = {};

    exercises.forEach((ex) => {
        try {
            const name = String(ex?.name || "").trim();
            if (!name) return;
            const sets = Array.isArray(ex?.sets) ? ex.sets : [];
            const clean = sets
                .map((s) => ({ reps: Number(s?.reps) || 0, weight: Number(s?.weight) || 0 }))
                .filter((s) => s.reps > 0 && s.weight > 0)
                .map((s) => ({ ...s, date: day, wid: String(wid) }));
            if (!clean.length) return;

            // Use arrayUnion to append without overwriting other fields; create nested map if absent
            updatePayload[`statsExercises.${name}.sets`] = FieldValue.arrayUnion(...clean);
        } catch { }
    });

    // If nothing to append, short-circuit
    if (Object.keys(updatePayload).length === 0) return { ok: true, appended: 0 };

    // Apply update with field transforms
    await ref.update(updatePayload);

    // Optionally recompute hex using updated stats (best-effort)
    try {
        const snap = await ref.get();
        if (snap.exists) {
            const zeroHex = {
                shoulders: 0,
                chest: 0,
                arms: 0,
                legs: 0,
                back: 0,
                abs: 0,
                overall: 0,
            };
            await ref.set({ statsHexagon: zeroHex }, { merge: true });
        }
    } catch (e) {
        logger.warn("appendWorkoutSets: hexagon recompute skipped", e?.message || e);
    }

    return { ok: true, appended: Object.keys(patch.statsExercises).length };
});

export const submitModerationReport = onCall({ region: "us-central1" }, async (request) => {
    const { reason, details = "", context = {}, clientInfo = {}, reporterUid: reporterUidRaw } = request.data || {};

    const reporterUid = request.auth?.uid ? String(request.auth.uid).trim() : sanitizeString(reporterUidRaw, 64);
    if (!reporterUid) {
        throw new HttpsError("unauthenticated", "Reporter identity required.");
    }

    const reasonClean = coerceReason(reason);
    if (!reasonClean) {
        throw new HttpsError("invalid-argument", "Missing or invalid report reason.");
    }

    const targetType = sanitizeString(context?.targetType, 64).toLowerCase();
    const targetId = sanitizeString(context?.targetId, 128);
    if (!targetType || !targetId) {
        throw new HttpsError("invalid-argument", "Missing target information.");
    }

    const ownerUid = sanitizeString(context?.ownerUid, 64);
    const ownerHandle = sanitizeString(context?.ownerHandle, 80);
    const source = sanitizeString(context?.source, 64);
    const metadata = sanitizeMetadata(context?.metadata);
    const detailClean = sanitizeString(details, REPORT_DETAILS_MAX_LENGTH);

    let reporterHandle = "";
    try {
        const reporterSnap = await adminDb.doc(`users/${reporterUid}`).get();
        if (reporterSnap.exists) {
            const data = reporterSnap.data() || {};
            reporterHandle = sanitizeString(data.handle || data.username || data.tag || "", 80);
        }
    } catch (error) {
        logger.warn("submitModerationReport: failed to load reporter profile", error?.message || error);
    }

    const doc = {
        reporterUid,
        reporterHandle,
        targetType,
        targetId,
        ownerUid,
        ownerHandle,
        source,
        reason: reasonClean,
        details: detailClean,
        metadata,
        clientInfo: sanitizeClientInfo(clientInfo),
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
        lastUpdatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection("moderationReports").add(doc);

    logger.info("submitModerationReport: stored report", { reporterUid, reportId: docRef.id, targetType, targetId });

    return { ok: true, reportId: docRef.id };
});

export const deleteOwnAccount = onCall({ region: "us-central1" }, async (request) => {
    const uidFromAuth = request.auth?.uid ? String(request.auth.uid).trim() : "";
    const uidFromPayload = typeof request.data?.uid === "string" ? request.data.uid.trim() : "";
    const uid = uidFromAuth || uidFromPayload;

    if (!uid) {
        throw new HttpsError("invalid-argument", "Missing user identifier.");
    }

    const handleHint = typeof request.data?.handle === "string" ? request.data.handle : "";

    const normalizeHandle = (value) => {
        if (value === null || value === undefined) return "";
        const trimmed = String(value).trim();
        if (!trimmed) return "";
        const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
        return withoutAt.trim().toLowerCase();
    };

    let userDocSnap = null;

    if (!uidFromAuth) {
        if (!handleHint) {
            throw new HttpsError("invalid-argument", "Handle confirmation required.");
        }

        try {
            userDocSnap = await adminDb.doc(`users/${uid}`).get();
        } catch (error) {
            logger.error("deleteOwnAccount: failed to load user doc", { uid, error: error?.message || error });
            throw new HttpsError("internal", "Unable to verify account. Please try again.");
        }

        if (!userDocSnap.exists) {
            throw new HttpsError("not-found", "Account not found.");
        }

        const data = userDocSnap.data() || {};
        const docHandle = normalizeHandle(data.handle || data.username || data.tag || "");
        const providedHandle = normalizeHandle(handleHint);

        if (docHandle && providedHandle && docHandle !== providedHandle) {
            throw new HttpsError("permission-denied", "Handle confirmation failed.");
        }
    }

    try {
        const summary = await deleteUserAndContentByUid(uid, { handleHint, userDocSnap });
        return { success: true, summary };
    } catch (error) {
        logger.error("deleteOwnAccount failure", { uid, error: error?.message || error });
        throw new HttpsError("internal", "Unable to delete account. Please contact support.");
    }
});
