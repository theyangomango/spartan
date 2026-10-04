// Pure helpers for the participant lists of a group workout.

export const ensureString = (value) => (value == null ? "" : String(value));
export const sanitizeParticipant = (payload = {}) => ({
    uid: ensureString(payload.uid || payload.id || ""),
    handle: payload.handle || "",
    image: payload.image || "",
    pfpVersion: payload.pfpVersion || 0,
    updatedAt: payload.updatedAt || 0,
});

export const mergeParticipants = (baseList = [], extras = []) => {
    if (!extras.length) return baseList;
    const seen = new Set();
    const ordered = [];
    baseList.forEach((item) => {
        if (!item) return;
        const uid = ensureString(item.uid);
        if (uid && !seen.has(uid)) {
            seen.add(uid);
            ordered.push(item);
        }
    });
    extras.forEach((item) => {
        if (!item) return;
        const uid = ensureString(item.uid);
        if (!uid || seen.has(uid)) return;
        seen.add(uid);
        ordered.push(item);
    });
    return ordered;
};

export const areParticipantListsEqual = (a = [], b = []) => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        const prev = a[i] || {};
        const next = b[i] || {};
        if (ensureString(prev.uid) !== ensureString(next.uid)) return false;
        if ((prev.handle || "") !== (next.handle || "")) return false;
        if ((prev.image || "") !== (next.image || "")) return false;
        if ((prev.pfpVersion || 0) !== (next.pfpVersion || 0)) return false;
        if ((prev.updatedAt || 0) !== (next.updatedAt || 0)) return false;
    }
    return true;
};
