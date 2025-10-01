import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';
import arrayErase from '../helper/firebase/arrayErase'
import incrementDocValue from '../helper/firebase/incrementDocValue'

// Normalize objects stored inside arrays so arrayUnion/arrayRemove match reliably
const normalizeRef = (u) => ({
    uid: String(u?.uid || u?.id || ''),
    handle: u?.handle || '',
    name: u?.name || '',
    pfp: u?.pfp || u?.image || u?.photoURL || '',
});

export default async function unfollowUser(this_user, user) {
    const meRef = normalizeRef(this_user);
    const otherRef = normalizeRef(user);

    // Clear any lingering follow requests in either direction
    try { await arrayErase('users', meRef.uid, 'followRequestsOut', otherRef); } catch {}
    try { await arrayErase('users', otherRef.uid, 'followRequestsIn', meRef); } catch {}

    // First attempt fast arrayRemove with normalized shapes (covers recent follows)
    try { await arrayErase('users', meRef.uid, 'following', otherRef); } catch {}
    try { await arrayErase('users', otherRef.uid, 'followers', meRef); } catch {}

    // Defensive cleanup: read both docs and purge any entries matching by uid (handles shape drift & rapid taps)
    try {
        const meDocRef = doc(db, 'users', meRef.uid);
        const otherDocRef = doc(db, 'users', otherRef.uid);

        const [meSnap, otherSnap] = await Promise.all([getDoc(meDocRef), getDoc(otherDocRef)]);
        const meData = meSnap.exists() ? (meSnap.data() || {}) : {};
        const otherData = otherSnap.exists() ? (otherSnap.data() || {}) : {};

        const meFollowing = Array.isArray(meData.following) ? meData.following : [];
        const otherFollowers = Array.isArray(otherData.followers) ? otherData.followers : [];

        const nextFollowing = meFollowing.filter((x) => String(x?.uid || x?.id || '') !== otherRef.uid);
        const nextFollowers = otherFollowers.filter((x) => String(x?.uid || x?.id || '') !== meRef.uid);

        // Only write if something actually changed
        const writes = [];
        if (nextFollowing.length !== meFollowing.length) {
            writes.push(updateDoc(meDocRef, { following: nextFollowing, followingCount: Math.max(0, nextFollowing.length) }));
        } else {
            // maintain non-negative count even if prior increments went out-of-sync
            const safeCount = Number.isFinite(meData.followingCount) ? Math.max(0, meData.followingCount) : nextFollowing.length;
            writes.push(updateDoc(meDocRef, { followingCount: safeCount }));
        }
        if (nextFollowers.length !== otherFollowers.length) {
            writes.push(updateDoc(otherDocRef, { followers: nextFollowers, followerCount: Math.max(0, nextFollowers.length) }));
        } else {
            const safeCount = Number.isFinite(otherData.followerCount) ? Math.max(0, otherData.followerCount) : nextFollowers.length;
            writes.push(updateDoc(otherDocRef, { followerCount: safeCount }));
        }

        await Promise.all(writes);
    } catch {
        // Fallback to counter decrement if reads fail
        try { await incrementDocValue('users', meRef.uid, 'followingCount', -1); } catch {}
        try { await incrementDocValue('users', otherRef.uid, 'followerCount', -1); } catch {}
    }
}
