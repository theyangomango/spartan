import { db } from "../firebase.config";
import readDoc from "./helper/firebase/readDoc";
import getReverse from "./helper/getReverse";
import retrievePosts from "./posts/retrievePosts";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";

// 1. 🔹 Get all stories
export async function getUserStories(userData) {
    const db_stories = [];

    for (const user of userData.feedStories) {
        for (const sid of user.stories) {
            const storyData = await readDoc('stories', sid);
            db_stories.push(storyData);
        }
    }

    return {
        storiesData: db_stories,
        storiesUserList: userData.feedStories
    };
}

// 2. 🔹 Get posts from global.post list (reversed)
export async function getUserPosts() {
    const postsDoc = await readDoc('global', 'posts');
    const db_posts = await retrievePosts(getReverse(postsDoc.PIDs));
    return db_posts;
}

// 3. 🔹 Get user's message threads
export async function getUserMessages(userData) {
    const db_messages = [];

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

    // Fetch chats serially but latest in parallel per chat to avoid stampedes
    for (const msg of userData.messages) {
        const messageData = await readDoc('messages', msg.mid);
        const content = await fetchLatest(msg.mid);
        db_messages.push({ ...messageData, content });
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
    const stories = await getUserStories(userData);
    const posts = await getUserPosts();
    const messages = await getUserMessages(userData);

    return [stories, posts, messages];
}
