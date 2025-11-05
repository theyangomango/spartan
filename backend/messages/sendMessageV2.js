import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { coerceUid } from "../helper/userRefs";

const toSafeString = (value) => (typeof value === "string" ? value : "");

const sanitizeSender = (rawSender = {}) => {
    const uid = coerceUid(rawSender);
    if (!uid) {
        throw new Error("sendMessageV2 requires sender uid");
    }

    const handle = toSafeString(rawSender.handle || rawSender.username).trim();
    const display = toSafeString(rawSender.name || rawSender.displayName).trim();
    const pfp = toSafeString(rawSender.pfp || rawSender.image || rawSender.photoURL).trim();
    const image = toSafeString(rawSender.image || rawSender.photoURL || pfp).trim();
    const photoURL = toSafeString(rawSender.photoURL || image || pfp).trim();

    return {
        uid,
        handle,
        name: display || handle,
        displayName: display || handle,
        pfp,
        image: image || pfp,
        photoURL: photoURL || image || pfp,
    };
};

const sanitizeMedia = (items = []) => {
    if (!Array.isArray(items)) return [];
    return items
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const type = item.type === "video" ? "video" : "image";
            const url = toSafeString(item.url || item.uri).trim();
            if (!url) return null;
            const sanitized = { type, url };
            const thumb = toSafeString(item.thumbnailUrl || item.thumbnail).trim();
            if (thumb) sanitized.thumbnailUrl = thumb;
            if (Number.isFinite(item.duration)) sanitized.duration = item.duration;
            if (Number.isFinite(item.width)) sanitized.width = item.width;
            if (Number.isFinite(item.height)) sanitized.height = item.height;
            return sanitized;
        })
        .filter(Boolean);
};

const sanitizeReplyPreview = (preview) => {
    if (!preview || typeof preview !== "object") return null;
    const senderHandle = toSafeString(preview.senderHandle).trim();
    const text = toSafeString(preview.text);
    const hasMedia = Boolean(preview.hasMedia);
    if (!senderHandle && !text && !hasMedia) return null;
    return {
        senderHandle,
        text,
        hasMedia,
    };
};

/**
 * payload = {
 *   cid,
 *   sender: { uid, handle, pfp, name },
 *   text: string,
 *   media: [{ type: 'image'|'video', url, thumbnailUrl? }],
 *   replyTo?: messageId | null,
 *   replyPreview?: { senderHandle, text, hasMedia }
 * }
 */
export default async function sendMessageV2(payload = {}) {
    const safeCid = String(payload?.cid || "").trim();
    if (!safeCid) {
        throw new Error("sendMessageV2 requires conversation id");
    }

    const safeSender = sanitizeSender(payload.sender);
    const safeText = toSafeString(payload.text).slice(0, 4000); // guard against runaway payloads
    const safeMedia = sanitizeMedia(payload.media);
    const safeReplyTo = payload.replyTo ? String(payload.replyTo) : null;
    const safeReplyPreview = sanitizeReplyPreview(payload.replyPreview);

    const ref = collection(db, "messages", safeCid, "content");

    const docRef = await addDoc(ref, {
        sender: safeSender,
        senderUid: safeSender.uid,
        text: safeText,
        media: safeMedia,
        replyTo: safeReplyTo,
        replyPreview: safeReplyPreview,
        reactions: {}, // emoji -> [uids]
        timestamp: serverTimestamp(),
        clientTs: Date.now(),
    });

    await updateDoc(doc(db, "messages", safeCid), {
        lastMessageText: safeText || (safeMedia.length ? "[media]" : ""),
        lastMessageAt: serverTimestamp(),
    });

    return docRef.id;
}
