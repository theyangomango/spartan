// Pure helpers for chat messages: timestamp normalisation, day keys and sender lookup.
export const chatTimestampToMillis = (t) => {
    if (!t) return 0;
    if (typeof t === "number") return t < 1e12 ? t * 1000 : t;
    if (typeof t === "string") return Date.parse(t) || 0;
    if (typeof t?.toMillis === "function") return t.toMillis();
    if (typeof t?.seconds === "number") return t.seconds * 1000;
    if (t instanceof Date) return t.getTime();
    return 0;
};

export const dateKeyFromMs = (ms) => {
    const d = new Date(ms || 0);
    if (isNaN(+d)) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export const getMessageTimeMs = (m) => {
    // Prefer server timestamp; fallback to clientTs for stable ordering
    const s = chatTimestampToMillis(m?.timestamp);
    return s || Number(m?.clientTs) || 0;
};

export const getMessageSenderUid = (msg) => {
    return (
        msg?.sender?.uid ??
        msg?.senderUid ??
        msg?.fromUid ??
        msg?.uid ??
        msg?.userId ??
        msg?.authorId ??
        msg?.from?.uid ??
        msg?.author?.uid ??
        null
    );
};
