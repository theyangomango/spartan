// Pure helpers of NotificationCard: the message text of a notification and uid / user-ref normalisation.
import { resolvePhotoURL } from "../../../utils/profilePhoto";

const ellipsize = (str = "", max = 60) => {
    const s = String(str || "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

export function getDisplayMessage(item) {
    switch (item.type) {
        case "follow":
            return "followed you";
        case "follow-request":
            return "requested to follow you";
        case "follow-accepted":
            return "accepted your follow request";
        case "liked-post":
            return "liked your post";
        case "liked-comment":
            return `liked your comment "${ellipsize(item.content, 50)}"`;
        case "comment":
            return `commented "${ellipsize(item.content, 50)}"`;
        case "replied-comment":
            return `replied to your comment "${ellipsize(item.content, 50)}"`;
        case "mention":
            return "mentioned you";
        case "workout-invite":
            return "invited you to a workout";
        case "friend-workout-started":
            return "just started a workout";
        default:
            return "";
    }
}

export const readUid = (value) => {
    if (!value) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') return String(value?.uid || '');
    return '';
};

export const normalizeUserRef = (u = {}) => {
    const resolved = resolvePhotoURL(u, u?.pfp || '');
    return {
        uid: String(u?.uid || ''),
        handle: u?.handle || '',
        name: u?.name || '',
        pfp: resolved,
        photoURL: resolved,
        image: resolved,
    };
};
