// Uid helpers for group workouts: the signed-in user's follower uids and member-array filtering.

export const extractFollowerUids = () => {
    try {
        const followers = Array.isArray(global?.userData?.followers) ? global.userData.followers : [];
        const deduped = new Set();
        const uids = [];
        followers.forEach((entry) => {
            let uid = "";
            if (typeof entry === "string" || typeof entry === "number") {
                uid = String(entry).trim();
            } else if (entry && typeof entry === "object") {
                uid = String(entry.uid || entry.id || entry.userUid || entry.followerUid || "").trim();
            }
            if (!uid) return;
            if (deduped.has(uid)) return;
            deduped.add(uid);
            uids.push(uid);
        });
        return uids;
    } catch {
        return [];
    }
};

// robust equality against array elements that could be string/number/object
const asUid = (x) => {
    if (typeof x === "string" || typeof x === "number") return String(x);
    if (x && typeof x === "object") return String(x.uid || x.id || "");
    return "";
};
export const filterOutUid = (arr, uidStr) =>
    (Array.isArray(arr) ? arr : []).filter((v) => asUid(v) !== uidStr);
