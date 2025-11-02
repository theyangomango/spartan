/**
 * Checks if a user is this device's current user
 * @param uid - user's UID
 * @return bool
 */

const isThisUser = (candidate) => {
    if (candidate == null) return false;

    const targetUid = typeof candidate === "object" && candidate !== null && "uid" in candidate
        ? candidate.uid
        : candidate;

    const currentUid = global?.userData?.uid;
    if (targetUid == null || currentUid == null) return false;

    return String(targetUid) === String(currentUid);
};

export default isThisUser;
