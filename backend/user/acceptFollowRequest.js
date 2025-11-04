import arrayAppend from "../helper/firebase/arrayAppend";
import arrayErase from "../helper/firebase/arrayErase";
import incrementDocValue from "../helper/firebase/incrementDocValue";
import sendNotification from "../sendNotification";

const normalizeRef = (u) => ({
    uid: String(u?.uid || u?.id || ''),
    handle: u?.handle || u?.username || '',
    name: u?.name || u?.displayName || '',
    pfp: u?.pfp || u?.image || u?.photoURL || '',
});

export default async function acceptFollowRequest(this_user, requester) {
    const meRef = normalizeRef(this_user);
    const otherRef = normalizeRef(requester);

    if (!meRef.uid || !otherRef.uid) return { status: 'error', reason: 'missing-uid' };

    try { await arrayErase('usersPrivate', meRef.uid, 'followRequestsIn', otherRef); } catch {}
    try { await arrayErase('usersPrivate', otherRef.uid, 'followRequestsOut', meRef); } catch {}

    try { await arrayAppend('usersPublic', meRef.uid, 'followers', otherRef); } catch {}
    try { await incrementDocValue('usersPublic', meRef.uid, 'followerCount'); } catch {}

    try { await arrayAppend('usersPublic', otherRef.uid, 'following', meRef); } catch {}
    try { await incrementDocValue('usersPublic', otherRef.uid, 'followingCount'); } catch {}

    try {
        if (meRef.uid !== otherRef.uid) {
            const event = {
                uid: meRef.uid,
                handle: meRef.handle,
                name: meRef.name,
                pfp: meRef.pfp,
                pfpVersion: this_user?.pfpVersion || this_user?.imageVersion || 0,
                type: 'follow-accepted',
                timestamp: Date.now(),
            };
            await sendNotification(otherRef.uid, event);
        }
    } catch (err) {
        console.log('acceptFollowRequest notification error', err?.message || err);
    }

    return { status: 'accepted' };
}
