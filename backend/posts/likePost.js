import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "../../firebase.config";

const pickString = (...values) => {
    for (let i = 0; i < values.length; i += 1) {
        const candidate = values[i];
        if (typeof candidate === "string") {
            const trimmed = candidate.trim();
            if (trimmed) return trimmed;
        }
    }
    return "";
};

async function buildLikePayload(uid) {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        const data = snap.exists() ? (snap.data() || {}) : {};
        const payload = {
            uid,
            handle: pickString(data.handle, data.username, data.userName),
            name: pickString(data.name, data.fullName, data.displayName),
            pfp: pickString(data.image, data.pfp, data.pfpUrl, data.photoURL, data.avatar),
        };
        if (typeof data.pfpVersion === "number") {
            payload.pfpVersion = data.pfpVersion;
        }
        return payload;
    } catch (error) {
        console.warn("likePost: failed to fetch user metadata", error);
        return { uid };
    }
}

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

const mergeLikeEntry = (existing, payload) => {
    if (!existing || typeof existing !== "object") {
        return { value: { ...payload }, changed: true };
    }

    let changed = false;
    const merged = { ...existing };

    if (!matchesUid(existing, payload.uid)) {
        merged.uid = payload.uid;
        changed = true;
    }

    const apply = (key, value) => {
        const normalized = typeof value === "string" ? value.trim() : value;
        if (normalized && normalized !== merged[key]) {
            merged[key] = normalized;
            changed = true;
        }
    };

    apply("handle", payload.handle);
    apply("name", payload.name);
    apply("pfp", payload.pfp);

    if (payload.pfpVersion !== undefined && payload.pfpVersion !== merged.pfpVersion) {
        merged.pfpVersion = payload.pfpVersion;
        changed = true;
    }

    return { value: changed ? merged : existing, changed };
};

export async function likePost(pid, uid) {
    if (!pid || !uid) return;

    const postRef = doc(db, "posts", pid);
    const likePayload = await buildLikePayload(uid);

    await runTransaction(db, async (tx) => {
        const snap = await tx.get(postRef).catch(() => null);
        const current = snap && snap.exists() ? (snap.data() || {}) : {};
        const likes = Array.isArray(current.likes) ? current.likes.filter(Boolean) : [];

        let hasExisting = false;
        let updated = false;

        const nextLikes = likes.map((entry) => {
            if (!matchesUid(entry, uid)) return entry;
            hasExisting = true;
            const { value, changed } = mergeLikeEntry(entry, likePayload);
            if (changed) updated = true;
            return value;
        });

        if (!hasExisting) {
            nextLikes.push(likePayload);
            updated = true;
        }

        const nextCount = nextLikes.length;
        const currentCount = Number(current.likeCount);

        if (!updated && currentCount === nextCount) {
            return;
        }

        if (snap && snap.exists()) {
            tx.update(postRef, {
                likes: nextLikes,
                likeCount: nextCount,
            });
        } else {
            tx.set(postRef, {
                likes: nextLikes,
                likeCount: nextCount,
            }, { merge: true });
        }
    });
}
