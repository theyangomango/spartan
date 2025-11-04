import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import incrementDocValue from "./helper/firebase/incrementDocValue";
import { db } from "../firebase.config";

const sanitizeEventPayload = (event = {}) => {
    if (!event || typeof event !== "object") return {};

    const cleaned = {};

    const assignIfValid = (key, value) => {
        if (value === undefined) return;
        if (value === null || typeof value === "boolean") {
            cleaned[key] = value;
            return;
        }
        if (typeof value === "number") {
            if (Number.isFinite(value)) cleaned[key] = value;
            return;
        }
        if (typeof value === "string") {
            const str = value.trim();
            if (str.length) cleaned[key] = str;
            return;
        }
        if (value instanceof Date) {
            cleaned[key] = value.getTime();
            return;
        }
        if (typeof value === "object") {
            try {
                cleaned[key] = JSON.parse(JSON.stringify(value));
            } catch {
                // skip unserializable value
            }
        }
    };

    Object.entries(event).forEach(([key, value]) => {
        if (key === "timestamp") {
            const numeric = Number(value);
            cleaned.timestamp = Number.isFinite(numeric) ? numeric : Date.now();
            return;
        }
        if (key === "uid") {
            if (value !== undefined && value !== null) {
                cleaned.uid = String(value);
            }
            return;
        }
        assignIfValid(key, value);
    });

    if (!cleaned.type && typeof event.type === "string") {
        cleaned.type = event.type.trim();
    }
    if (!("timestamp" in cleaned)) {
        cleaned.timestamp = Date.now();
    }

    return cleaned;
};

export default async function sendNotification(uid, rawEvent) {
    const event = rawEvent && typeof rawEvent === "object" ? rawEvent : {};

    // Increment notification counters
    switch (event.type) {
        case 'liked-post':
        case 'liked-comment':
        case 'liked-story':
            incrementDocValue('usersPrivate', uid, 'notificationNewLikes');
            break;
        case 'comment':
        case 'replied-comment':
            incrementDocValue('usersPrivate', uid, 'notificationNewComments');
            break;
        case 'workout-invite':
            // leave counters unchanged for now (only contributes to general events)
            break;
        case 'follow':
        case 'follow-request':
        // falls through to overall events counter only
            break;
        case 'follow-accepted':
            // overall events counter only
            break;
    }
    incrementDocValue('usersPrivate', uid, 'notificationNewEvents');

    const sanitizedEvent = sanitizeEventPayload(event);
    if (!sanitizedEvent.uid && event?.uid != null) {
        sanitizedEvent.uid = String(event.uid);
    }
    if (!sanitizedEvent.handle && typeof event?.handle === "string") {
        const str = event.handle.trim();
        if (str) sanitizedEvent.handle = str;
    }
    if (!sanitizedEvent.name && typeof event?.name === "string") {
        const str = event.name.trim();
        if (str) sanitizedEvent.name = str;
    }
    if (!sanitizedEvent.type) {
        sanitizedEvent.type = "event";
    }

    // Add event to the user's notifications subcollection
    const notificationsRef = collection(db, 'usersPrivate', uid, 'notifications');
    await addDoc(notificationsRef, {
        ...sanitizedEvent,
        read: false,
    });

    // Try push notification via Expo (best-effort, no throw)
    try {
        const snap = await getDoc(doc(db, 'usersPrivate', uid));
        const target = snap.exists() ? (snap.data() || {}) : {};
        const to = String(target?.expoPushToken || '');
        if (!to || !to.startsWith('ExponentPushToken')) return;

        // Compose a friendly title/body based on event
        const h = sanitizedEvent.handle || sanitizedEvent.name || 'Someone';
        let title = 'New activity';
        let body = '';
        switch (sanitizedEvent?.type) {
            case 'liked-post':
                title = 'New like'; body = `${h} liked your post`; break;
            case 'liked-comment':
                title = 'New like'; body = `${h} liked your comment`; break;
            case 'comment':
                title = 'New comment'; body = `${h}: ${String(sanitizedEvent?.content || '').slice(0, 80)}`; break;
            case 'replied-comment':
                title = 'New reply'; body = `${h} replied: ${String(sanitizedEvent?.content || '').slice(0, 80)}`; break;
            case 'workout-invite':
                title = 'Workout invite'; body = `${h} invited you to a workout`; break;
            case 'follow':
                title = 'New follower'; body = `${h} followed you`; break;
            case 'follow-request':
                title = 'Follow request'; body = `${h} requested to follow you`; break;
            case 'follow-accepted':
                title = 'Follow request accepted'; body = `${h} accepted your follow request`; break;
            case 'friend-workout-started':
                title = `${h} started a workout`;
                body = sanitizedEvent?.workoutName ? `${sanitizedEvent.workoutName}` : 'Cheer them on!';
                break;
            default:
                title = 'New notification'; body = `${h} interacted with you`; break;
        }

        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to,
                sound: 'default',
                title,
                body,
                data: {
                    nidType: sanitizedEvent?.type || 'event',
                    pid: sanitizedEvent?.pid || null,
                    wid: sanitizedEvent?.wid || null,
                    inviteId: sanitizedEvent?.inviteId || null,
                    followerUid: sanitizedEvent?.uid || null,
                },
            })
        });
    } catch (e) { /* ignore network errors to avoid blocking UX */ }
}
