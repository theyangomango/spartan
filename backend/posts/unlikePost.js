import { doc, runTransaction } from "firebase/firestore";
import { db } from "../../firebase.config";

const matchesUid = (entry, uid) => {
    const target = String(uid);
    if (!entry && entry !== 0) return false;
    if (typeof entry === "string" || typeof entry === "number") {
        return String(entry) === target;
    }
    if (typeof entry === "object") {
        const value = entry?.uid;
        if (value === undefined || value === null) return false;
        return String(value) === target;
    }
    return false;
};

export async function unlikePost(pid, uid) {
    if (!pid || !uid) return;

    try {
        const postRef = doc(db, "posts", pid);
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(postRef);
            if (!snap.exists()) return;

            const data = snap.data() || {};
            const likes = Array.isArray(data.likes) ? data.likes : [];
            const nextLikes = likes.filter((entry) => !matchesUid(entry, uid));
            const nextCount = nextLikes.length;

            if (nextLikes.length === likes.length && Number(data.likeCount) === nextCount) {
                return;
            }

            tx.update(postRef, {
                likes: nextLikes,
                likeCount: nextCount,
            });
        });
    } catch (error) {
        console.warn("unlikePost: failed to prune like entry", error);
    }
}
