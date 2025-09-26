import arrayAppend from "../helper/firebase/arrayAppend";
import incrementDocValue from '../helper/firebase/incrementDocValue'
import sendNotification from "../sendNotification";

// Normalize objects stored inside arrays so arrayUnion/arrayRemove match reliably
const normalizeRef = (u) => ({
    uid: String(u?.uid || u?.id || ''),
    handle: u?.handle || '',
    name: u?.name || '',
    pfp: u?.pfp || u?.image || u?.photoURL || '',
});

export default async function followUser(this_user, user) {
    const meRef = normalizeRef(this_user);
    const otherRef = normalizeRef(user);

    // Append normalized entries; arrayUnion prevents duplicates of the same shape
    try { await arrayAppend('users', meRef.uid, 'following', otherRef); } catch {}
    try { await incrementDocValue('users', meRef.uid, 'followingCount'); } catch {}

    try { await arrayAppend('users', otherRef.uid, 'followers', meRef); } catch {}
    try { await incrementDocValue('users', otherRef.uid, 'followerCount'); } catch {}

    try {
        if (meRef.uid && meRef.uid !== otherRef.uid) {
            const event = {
                uid: meRef.uid,
                handle: meRef.handle,
                name: meRef.name,
                pfp: meRef.pfp,
                pfpVersion: this_user?.pfpVersion || this_user?.imageVersion || 0,
                type: 'follow',
                timestamp: Date.now(),
            };
            await sendNotification(otherRef.uid, event);
        }
    } catch (err) {
        console.log('followUser notification error', err?.message || err);
    }
}
