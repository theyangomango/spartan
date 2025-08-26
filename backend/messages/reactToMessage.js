// backend/messages/reactToMessage.js
import { doc, runTransaction } from "firebase/firestore";
import { db } from "../../firebase.config";

/**
 * iOS-style: each user may have at most ONE tapback per message.
 * Tapping the same emoji again removes it; tapping a different one switches.
 */
export default async function reactToMessage({ cid, mid, emoji, uid }) {
    const ref = doc(db, "messages", cid, "content", mid);
    await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const data = snap.data();
        const reactions = data.reactions || {}; // { emoji: string[] }

        // Remove user from all emojis first
        for (const key of Object.keys(reactions)) {
            reactions[key] = (reactions[key] || []).filter((u) => u !== uid);
            if (reactions[key].length === 0) delete reactions[key];
        }

        // Toggle selected emoji
        if (!data.reactions || !data.reactions[emoji] || !data.reactions[emoji].includes(uid)) {
            reactions[emoji] = [...(reactions[emoji] || []), uid];
        }

        tx.update(ref, { reactions });
    });
}
