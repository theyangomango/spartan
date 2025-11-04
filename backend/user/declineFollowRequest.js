import arrayErase from "../helper/firebase/arrayErase";

const normalizeRef = (u) => ({
    uid: String(u?.uid || u?.id || ''),
    handle: u?.handle || u?.username || '',
    name: u?.name || u?.displayName || '',
    pfp: u?.pfp || u?.image || u?.photoURL || '',
});

export default async function declineFollowRequest(this_user, requester) {
    const meRef = normalizeRef(this_user);
    const otherRef = normalizeRef(requester);

    if (!meRef.uid || !otherRef.uid) return { status: 'error', reason: 'missing-uid' };

    try { await arrayErase('usersPrivate', meRef.uid, 'followRequestsIn', otherRef); } catch {}
    try { await arrayErase('usersPrivate', otherRef.uid, 'followRequestsOut', meRef); } catch {}

    return { status: 'declined' };
}
