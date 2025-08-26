import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.config";

/** Toggle emoji reaction per-user */
export default async function toggleReactionV2({ cid, messageId, emoji, uid }) {
    const ref = doc(db, "messages", cid, "content", messageId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data() || {};
    const reactions = { ...(data.reactions || {}) };
    const arr = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
    const has = arr.includes(uid);
    reactions[emoji] = has ? arr.filter((u) => u !== uid) : [...arr, uid];

    await updateDoc(ref, { reactions });
}
