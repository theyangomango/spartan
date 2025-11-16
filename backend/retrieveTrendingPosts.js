import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../firebase.config";
import retrievePosts from "./posts/retrievePosts";

const DEFAULT_LIMIT = 50;

export default async function retrieveTrendingPosts(limitCount = DEFAULT_LIMIT) {
    try {
        const colRef = collection(db, "globalTrendingPosts");
        const q = query(colRef, orderBy("priority", "desc"), limit(limitCount));
        const snapshot = await getDocs(q);
        if (!snapshot || snapshot.empty) {
            return [];
        }

        const entries = snapshot.docs.map((docSnap, index) => {
            const data = docSnap.data() || {};
            const pid = data?.pid || data?.postPid || docSnap.id;
            return {
                pid,
                docId: docSnap.id,
                priority: Number.isFinite(Number(data?.priority)) ? Number(data.priority) : snapshot.size - index,
                boost: Number(data?.boostScore ?? data?.boost ?? 0),
                expiresAt: data?.expiresAt ?? null,
                taggedTopics: Array.isArray(data?.topics) ? data.topics : [],
            };
        }).filter((entry) => !!entry.pid);

        if (!entries.length) {
            return [];
        }

        const pidList = entries.map((entry) => entry.pid);
        const posts = await retrievePosts(pidList);

        const map = new Map(entries.map((entry) => [entry.pid, entry]));
        return posts
            .filter(Boolean)
            .map((post) => ({
                post,
                meta: map.get(post?.pid || post?.id) || null,
            }));
    } catch (error) {
        console.warn?.("retrieveTrendingPosts: failed", error?.message || error);
        return [];
    }
}
