import { db } from "../firebase.config";
import readDoc from "./helper/firebase/readDoc";
import getReverse from "./helper/getReverse";
import retrievePosts from "./posts/retrievePosts";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { ensureUidArray, coerceUid } from "./helper/userRefs";
import updateDoc from "./helper/firebase/updateDoc";
import registerChatParticipants from "./messages/registerChatParticipants";

const normalizeParticipantRef = (input) => {
    const uid = coerceUid(input);
    if (!uid) return null;
    const handle = input?.handle || input?.username || "";
    const name = input?.name || input?.displayName || "";
    const pfp = input?.pfp || input?.image || input?.photoURL || "";
    const image = input?.image || pfp;
    const photoURL = input?.photoURL || image;
    const displayName = input?.displayName || name;
    return {
        uid,
        handle,
        name,
        pfp,
        image,
        photoURL,
        displayName,
    };
};

const gatherParticipantsFromEntry = (entry, userData, myUid) => {
    const candidates = [];
    if (Array.isArray(entry?.users)) candidates.push(...entry.users);
    if (Array.isArray(entry?.otherUsers)) candidates.push(...entry.otherUsers);

    const memberUids = ensureUidArray(entry?.memberUids || entry?.members || entry?.memberUidList || entry?.participantUids);
    memberUids.forEach((uid) => {
        candidates.push({ uid });
    });

    if (myUid) {
        const selfRef = {
            uid: myUid,
            handle: userData?.handle || userData?.username || "",
            name: userData?.name || userData?.displayName || "",
            pfp: userData?.pfp || userData?.image || userData?.photoURL || "",
            image: userData?.image || userData?.pfp || userData?.photoURL || "",
            photoURL: userData?.photoURL || userData?.image || userData?.pfp || "",
            displayName: userData?.displayName || userData?.name || "",
        };
        candidates.push(selfRef);
    }

    const normalized = [];
    const seen = new Set();
    for (const candidate of candidates) {
        const ref = normalizeParticipantRef(candidate);
        if (!ref) continue;
        if (seen.has(ref.uid)) continue;
        seen.add(ref.uid);
        normalized.push(ref);
    }
    return normalized;
};

const backfillMissingChatDoc = async (cid, entry, userData, myUid) => {
    const participants = gatherParticipantsFromEntry(entry, userData, myUid);
    if (participants.length < 2) return null;

    const memberUids = participants.map((user) => user.uid);
    const creator = coerceUid(entry?.creatorUID || entry?.creatorUid || entry?.creator) || myUid || memberUids[0];
    const createdValue = entry?.created;

    const payload = {
        cid,
        creatorUID: creator,
        users: participants,
        memberUids,
        userCount: participants.length,
        isGroup: entry?.isGroup === true || participants.length > 2,
        created: createdValue ?? Date.now(),
    };

    const threadName = entry?.threadName || entry?.name || entry?.title;
    if (typeof threadName === "string" && threadName.trim()) payload.threadName = threadName;
    const threadImage = entry?.threadImage || entry?.image || entry?.photoURL || entry?.pfp;
    if (typeof threadImage === "string" && threadImage.trim()) payload.threadImage = threadImage;

    const hiddenFor = ensureUidArray(entry?.hiddenFor);
    if (hiddenFor.length > 0) payload.hiddenFor = hiddenFor;
    if (entry?.isBlockedThread) payload.isBlockedThread = true;

    if (typeof entry?.lastMessageText === "string" && entry.lastMessageText.length) payload.lastMessageText = entry.lastMessageText;
    if (entry?.lastMessageAt) payload.lastMessageAt = entry.lastMessageAt;
    if (typeof entry?.lastMessageSender === "string" && entry.lastMessageSender.length) payload.lastMessageSender = entry.lastMessageSender;
    if (typeof entry?.lastMessageSenderHandle === "string" && entry.lastMessageSenderHandle.length) payload.lastMessageSenderHandle = entry.lastMessageSenderHandle;

    try {
        await updateDoc("messages", cid, payload);
        try {
            await registerChatParticipants({ cid, participants });
        } catch (err) {
            console.log("[getUserMessages] register participants fallback error", err?.message || err);
        }
        return payload;
    } catch (err) {
        console.warn?.("[getUserMessages] failed to backfill chat doc", cid, err?.message || err);
        return null;
    }
};

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

            let messageData = await readDoc('messages', mid).catch(() => null);
            if (!messageData || typeof messageData !== "object") {
                const recovered = await backfillMissingChatDoc(mid, msg, userData, myUid);
                if (recovered) {
                    messageData = recovered;
                } else {
                    console.warn?.("[getUserMessages] missing chat doc", mid);
                    continue;
                }
            }

            if (chatIsHidden(messageData)) continue;

            const content = await fetchLatest(mid);
            db_messages.push({ ...messageData, content });
        }
    } else if (userData?.uid) {
        // Fallback: discover chats by membership (array-contains)
        const messagesRef = collection(db, 'messages');
        const processSnapshot = async (snap) => {
            for (const docSnap of snap.docs) {
                const chat = { ...docSnap.data(), cid: docSnap.id };
                if (chatIsHidden(chat)) continue;
                const content = await fetchLatest(chat.cid);
                db_messages.push({ ...chat, content });
            }
        };

        let snapshot = null;
        try {
            const orderedQuery = query(
                messagesRef,
                where('memberUids', 'array-contains', userData.uid),
                orderBy('lastMessageAt', 'desc'),
                limit(50)
            );
            snapshot = await getDocs(orderedQuery);
        } catch (err) {
            const code = err?.code || err?.name || "";
            const message = String(err?.message || "").toLowerCase();
            const requiresIndex = code === "failed-precondition" || message.includes("requires an index");
            if (requiresIndex) {
                try {
                    const fallbackQuery = query(
                        messagesRef,
                        where('memberUids', 'array-contains', userData.uid),
                        limit(50)
                    );
                    snapshot = await getDocs(fallbackQuery);
                } catch {
                    snapshot = null;
                }
            } else {
                snapshot = null;
            }
        }
        if (snapshot) {
            await processSnapshot(snapshot);
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
