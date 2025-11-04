import { getDoc, updateDoc } from 'firebase/firestore';
import arrayErase from '../helper/firebase/arrayErase';
import incrementDocValue from '../helper/firebase/incrementDocValue';
import { normalizeUserRef } from '../helper/userRefs';
import { userPublicDoc } from '../../shared/firestoreRefs';

export default async function unfollowUser(this_user, user) {
    const meRef = normalizeUserRef(this_user);
    const otherRef = normalizeUserRef(user);

    if (!meRef || !otherRef) return;

    // Clear any lingering follow requests in either direction
    try { await arrayErase('usersPrivate', meRef.uid, 'followRequestsOut', otherRef); } catch {}
    try { await arrayErase('usersPrivate', otherRef.uid, 'followRequestsIn', meRef); } catch {}

    // First attempt fast arrayRemove with normalized shapes (covers recent follows)
    try { await arrayErase('usersPublic', meRef.uid, 'following', otherRef); } catch {}
    try { await arrayErase('usersPublic', otherRef.uid, 'followers', meRef); } catch {}

    // Defensive cleanup: read both docs and purge any entries matching by uid (handles shape drift & rapid taps)
    try {
        const meDocRef = userPublicDoc(meRef.uid);
        const otherDocRef = userPublicDoc(otherRef.uid);

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
        try { await incrementDocValue('usersPublic', meRef.uid, 'followingCount', -1); } catch {}
        try { await incrementDocValue('usersPublic', otherRef.uid, 'followerCount', -1); } catch {}
    }
}
