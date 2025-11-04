import { db } from "../firebase.config";
import readDoc from "./helper/firebase/readDoc";
import getReverse from "./helper/getReverse";
import retrievePosts from "./posts/retrievePosts";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { ensureUidArray, coerceUid } from "./helper/userRefs";

// 1. 🔹 Get posts from global.post list (reversed)
export async function getUserPosts() {
    const postsDoc = await readDoc('global', 'posts').catch(() => null);
    const pids = Array.isArray(postsDoc?.PIDs) ? postsDoc.PIDs : [];
    if (!pids.length) {
        return [];
    }
    const db_posts = await retrievePosts(getReverse(pids));
    return db_posts;
}

// 2. 🔹 Get user's message threads
export async function getUserMessages(userData) {
    const db_messages = [];
    if (!userData || typeof userData !== 'object') return db_messages;

    const myUid = String(userData?.uid || "");
    const myBlocked = new Set(ensureUidArray(userData?.blockedUidList || userData?.blocked));
    const myBlockedBy = new Set(ensureUidArray(userData?.blockedByUidList || userData?.blockedBy));

    const chatIsHidden = (chat) => {
        if (!chat || typeof chat !== "object") return false;
        const hiddenFor = Array.isArray(chat.hiddenFor) ? chat.hiddenFor : [];
        if (hiddenFor.includes(myUid)) return true;
        if (chat.isBlockedThread) return true;
        const members = Array.isArray(chat.memberUids)
            ? chat.memberUids
            : Array.isArray(chat.users)
                ? chat.users.map((u) => coerceUid(u)).filter(Boolean)
                : [];
        return members.some((uid) => myBlocked.has(uid) || myBlockedBy.has(uid));
    };

    // Prefetch latest message for each thread (desc, limit 1)
    const fetchLatest = async (cid) => {
        try {
            const ref = collection(db, 'messages', cid, 'content');
            const q = query(ref, orderBy('timestamp', 'desc'), limit(1));
            const snap = await getDocs(q);
            const data = snap.docs[0]?.data();
            return data ? [data] : [];
        } catch {
            return [];
        }
    };

    const arr = Array.isArray(userData.messages) ? userData.messages : [];
    if (arr.length > 0) {
        // Fetch chats serially but latest in parallel per chat to avoid stampedes
        for (const msg of arr) {
            const mid = msg?.mid;
            if (!mid) continue;

            const messageData = await readDoc('messages', mid).catch(() => null);
            if (!messageData || typeof messageData !== "object") {
                console.warn?.("[getUserMessages] missing chat doc", mid);
                continue;
            }

            if (chatIsHidden(messageData)) continue;

            const content = await fetchLatest(mid);
            db_messages.push({ ...messageData, content });
        }
    } else if (userData?.uid) {
        // Fallback: discover chats by membership (array-contains)
        try {
            const messagesRef = collection(db, 'messages');
            const q = query(messagesRef, where('memberUids', 'array-contains', userData.uid), orderBy('lastMessageAt', 'desc'), limit(50));
            const snap = await getDocs(q);
            for (const docSnap of snap.docs) {
                const chat = { ...docSnap.data(), cid: docSnap.id };
                if (chatIsHidden(chat)) continue;
                const content = await fetchLatest(chat.cid);
                db_messages.push({ ...chat, content });
            }
        } catch (e) {
            // ignore fallback errors; return empty list
        }
    }

    // Sort newest first by the preloaded content timestamp to match UI immediately
    const getEpoch = (chat) => {
        const t = chat?.content?.[0]?.timestamp;
        if (!t) return 0;
        if (typeof t === 'number') return t;
        if (typeof t === 'string') return Date.parse(t) || 0;
        if (typeof t?.toMillis === 'function') return t.toMillis();
        if (typeof t?.seconds === 'number') return t.seconds * 1000;
        try { return new Date(t).getTime() || 0; } catch { return 0; }
    };
    db_messages.sort((a, b) => getEpoch(b) - getEpoch(a));

    return db_messages;
}

// 🔄 Main orchestrator
export default async function getUserFeed(userData) {
    const posts = await getUserPosts();
    const messages = await getUserMessages(userData);

    return [posts, messages];
}
