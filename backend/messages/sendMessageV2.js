import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase.config";

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
export default async function sendMessageV2(payload) {
    const { cid, sender, text = "", media = [], replyTo = null, replyPreview = null } = payload;
    const ref = collection(db, "messages", cid, "content");

    const docRef = await addDoc(ref, {
        sender,
        senderUid: sender.uid,
        text,
        media,
        replyTo: replyTo || null,
        replyPreview: replyPreview || null,
        reactions: {},             // emoji -> [uids]
        timestamp: serverTimestamp(),
    });

    // optionally update chat summary
    await updateDoc(doc(db, "messages", cid), {
        lastMessageText: text || (media.length ? "[media]" : ""),
        lastMessageAt: serverTimestamp(),
    });

    return docRef.id;
}
