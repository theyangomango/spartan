import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import readDoc from "../../backend/helper/firebase/readDoc";
import { getUserMessages } from "../../backend/getUserFeed";
import {
    clearMessagesCache,
    getMessagesCache,
    getMessagesPreloadState,
    hydrateMessagesCache,
    mergeLatestBatchIntoCache,
    setMessagesPreloadState,
} from "../state/messagesCache";

const extractMids = (messages) => (
    Array.from(
        new Set(
            (Array.isArray(messages) ? messages : [])
                .map((entry) => entry?.mid || entry?.cid || entry?.id || entry?.messageId)
                .map((value) => String(value || ""))
                .filter((value) => value.length > 0)
        )
    )
);

const activeListeners = new Map();

const stopListener = (cid) => {
    const unsub = activeListeners.get(cid);
    if (!unsub) return;
    try { unsub(); } catch { }
    activeListeners.delete(cid);
};

const attachListener = (cid) => {
    if (!cid || activeListeners.has(cid)) return;
    try {
        const contentRef = collection(db, "messages", cid, "content");
        const q = query(contentRef, orderBy("timestamp", "desc"), limit(1));
        const unsub = onSnapshot(q, (snapshot) => {
            const latest = snapshot.docs[0]?.data();
            mergeLatestBatchIntoCache({ [cid]: latest ? [latest] : [] });
        }, () => {});
        activeListeners.set(cid, unsub);
    } catch {}
};

export const syncMessageListeners = (cids = []) => {
    const next = new Set(
        (Array.isArray(cids) ? cids : [])
            .map((cid) => String(cid || ""))
            .filter((cid) => cid.length > 0)
    );

    activeListeners.forEach((_, cid) => {
        if (!next.has(cid)) {
            stopListener(cid);
        }
    });

    next.forEach((cid) => attachListener(cid));
};

export const ensureMessageListener = (cid) => {
    const safeCid = String(cid || "");
    if (!safeCid) return;
    attachListener(safeCid);
};

export const teardownMessageListeners = () => {
    activeListeners.forEach((unsub) => {
        try { unsub(); } catch { }
    });
    activeListeners.clear();
};

const buildSaneUser = (uid, userDoc) => {
    const normalizedUid = String(uid || "");
    const docData = userDoc || {};
    return {
        uid: normalizedUid,
        ...(docData || {}),
        messages: Array.isArray(docData?.messages) ? docData.messages : [],
    };
};

export const preloadMessagesForUid = async (uid, { userDoc } = {}) => {
    const normalizedUid = String(uid || "");
    if (!normalizedUid) return [];

    const cacheSnapshot = getMessagesCache();
    const expectedMidsFromDoc = extractMids(userDoc?.messages);
    const { promise, uid: promiseUid } = getMessagesPreloadState();

    if (promise && promiseUid === normalizedUid) {
        return promise;
    }

    if (!promise && promiseUid === normalizedUid && cacheSnapshot.length > 0) {
        if (expectedMidsFromDoc.length === 0) {
            syncMessageListeners(cacheSnapshot.map((chat) => chat.cid));
            return cacheSnapshot;
        }

        const cachedCids = new Set(cacheSnapshot.map((chat) => chat?.cid).filter(Boolean));
        const missingMids = expectedMidsFromDoc.filter((mid) => !cachedCids.has(mid));
        if (missingMids.length === 0) {
            syncMessageListeners(cacheSnapshot.map((chat) => chat.cid));
            return cacheSnapshot;
        }
    }

    const loadPromise = (async () => {
        const baseDoc = userDoc || await readDoc('usersPrivate', normalizedUid);
        const saneUser = buildSaneUser(normalizedUid, baseDoc);
        const expectedMids = extractMids(saneUser.messages);
        const messages = await getUserMessages(saneUser);
        const hydrated = hydrateMessagesCache(messages);
        let finalList = hydrated;
        if (expectedMids.length > 0) {
            const byCid = new Map(hydrated.map((chat) => [chat.cid, chat]));
            const expectedSet = new Set(expectedMids);
            const ordered = expectedMids
                .map((mid) => byCid.get(mid))
                .filter(Boolean);
            const extras = hydrated.filter((chat) => !expectedSet.has(chat.cid));
            if (ordered.length > 0 || extras.length > 0) {
                finalList = hydrateMessagesCache([...ordered, ...extras]);
            }
        }
        syncMessageListeners(finalList.map((chat) => chat.cid));
        return finalList;
    })();

    setMessagesPreloadState({ promise: loadPromise, uid: normalizedUid });

    try {
        const result = await loadPromise;
        // Mark hydration complete for this uid while keeping listeners active.
        setMessagesPreloadState({ promise: null, uid: normalizedUid });
        return result;
    } catch (err) {
        setMessagesPreloadState({ promise: null, uid: null });
        throw err;
    }
};

export const resetMessagesState = () => {
    teardownMessageListeners();
    clearMessagesCache();
    setMessagesPreloadState({ promise: null, uid: null });
};
