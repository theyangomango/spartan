// backend/messages/sendMessageV2.js
import {
    collection,
    addDoc,
    serverTimestamp,
    updateDoc,
    doc,
} from "firebase/firestore";
import { db } from "../../firebase.config";

/**
 * Flexible sender for text & media messages.
 * @param {Object} params
 *  - cid (string): chat id
 *  - sender: { uid, handle, pfp?, name? }
 *  - text (string): optional text or caption
 *  - media (array): optional media array (see uploadMediaAssets)
 */
export default async function sendMessageV2({ cid, sender, text = "", media = [] }) {
    const contentRef = collection(db, "messages", cid, "content");

    // derive type for quick filtering
    let type = "text";
    if (media.length && !text) {
        const hasVideo = media.some((m) => m.type === "video");
        type = hasVideo ? "video" : "image";
    } else if (media.length && text) {
        type = "mixed";
    }

    const message = {
        type,                        // 'text' | 'image' | 'video' | 'mixed'
        text: text || "",
        media,                       // [] or [{url, mimeType, width, height, duration, type, thumbnailUrl}]
        sender: {
            uid: sender.uid,
            handle: sender.handle,
            pfp: sender.pfp || null,
            name: sender.name || null,
        },
        timestamp: serverTimestamp(),
        status: "sent",
    };

    // write message doc
    await addDoc(contentRef, message);

    // update chat doc summary fields (for inbox preview & sorting)
    const chatRef = doc(db, "messages", cid);
    const preview =
        type === "text"
            ? message.text.slice(0, 200)
            : type === "image"
                ? "📷 Photo"
                : type === "video"
                    ? "🎥 Video"
                    : message.text
                        ? `📎 ${message.text.slice(0, 180)}`
                        : "📎 Attachment";

    await updateDoc(chatRef, {
        lastMessageAt: serverTimestamp(),
        lastMessagePreview: preview,
        lastMessageType: type,
        lastMessageSender: sender.uid,
    });
}
