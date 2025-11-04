import arrayErase from "../helper/firebase/arrayErase";

const normalizeRef = (u) => ({
    uid: String(u?.uid || u?.id || ''),
    handle: u?.handle || u?.username || '',
    name: u?.name || u?.displayName || '',
    pfp: u?.pfp || u?.image || u?.photoURL || '',
});

export default async function cancelFollowRequest(this_user, user) {
    const meRef = normalizeRef(this_user);
    const otherRef = normalizeRef(user);

    if (!meRef.uid || !otherRef.uid) return false;

    let mutated = false;
    try { await arrayErase('usersPrivate', meRef.uid, 'followRequestsOut', otherRef); mutated = true; } catch {}
    try { await arrayErase('usersPrivate', otherRef.uid, 'followRequestsIn', meRef); mutated = true; } catch {}
    return mutated;
}
