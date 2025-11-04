import arrayAppend from "../helper/firebase/arrayAppend";
import arrayErase from "../helper/firebase/arrayErase";
import incrementDocValue from "../helper/firebase/incrementDocValue";
import sendNotification from "../sendNotification";
import readUserProfiles from "../helper/firebase/readUserProfiles";
import { normalizeUserRef, ensureUidArray } from "../helper/userRefs";

export default async function followUser(this_user, user) {
    const meRef = normalizeUserRef(this_user);
    const otherRef = normalizeUserRef(user);

    if (!meRef.uid || !otherRef.uid) {
        return { status: 'error', reason: 'missing-uid' };
    }

    const [{ publicProfile: targetPublic, privateProfile: targetPrivate }, { publicProfile: mePublic, privateProfile: mePrivate }] = await Promise.all([
        readUserProfiles(otherRef.uid),
        readUserProfiles(meRef.uid),
    ]);

    const targetBlocked = ensureUidArray(targetPrivate?.blockedUidList || targetPrivate?.blocked);
    const meBlocked = ensureUidArray(mePrivate?.blockedUidList || mePrivate?.blocked);
    const targetBlockedBy = ensureUidArray(targetPrivate?.blockedByUidList || targetPrivate?.blockedBy);

    if (targetBlocked.includes(meRef.uid) || meBlocked.includes(otherRef.uid) || targetBlockedBy.includes(meRef.uid)) {
        return { status: "error", reason: "blocked" };
    }

    const isPrivate = !!targetPublic?.isPrivate;
    const followersArr = Array.isArray(targetPublic?.followers) ? targetPublic.followers : [];
    const followRequestsIn = Array.isArray(targetPrivate?.followRequestsIn) ? targetPrivate.followRequestsIn : [];
    const alreadyFollower = followersArr.some((entry) => String(entry?.uid || entry?.id || entry) === meRef.uid);
    const alreadyRequested = followRequestsIn.some((entry) => String(entry?.uid || entry?.id || entry) === meRef.uid);

    if (isPrivate && !alreadyFollower) {
        if (!alreadyRequested) {
            try { await arrayAppend('usersPrivate', otherRef.uid, 'followRequestsIn', meRef); } catch {}
            try { await arrayAppend('usersPrivate', meRef.uid, 'followRequestsOut', otherRef); } catch {}

            try {
                if (meRef.uid !== otherRef.uid) {
                    const event = {
                        uid: meRef.uid,
                        handle: meRef.handle,
                        name: meRef.name,
                        pfp: meRef.pfp,
                        pfpVersion: this_user?.pfpVersion || this_user?.imageVersion || 0,
                        type: 'follow-request',
                        timestamp: Date.now(),
                    };
                    await sendNotification(otherRef.uid, event);
                }
            } catch (err) {
                console.log('followUser follow-request notification error', err?.message || err);
            }
        }

        return { status: 'requested', private: true };
    }

    // Ensure any stale requests are cleared before finalizing follow
    try { await arrayErase('usersPrivate', otherRef.uid, 'followRequestsIn', meRef); } catch {}
    try { await arrayErase('usersPrivate', meRef.uid, 'followRequestsOut', otherRef); } catch {}

    // Append normalized entries; arrayUnion prevents duplicates of the same shape
    try { await arrayAppend('usersPublic', meRef.uid, 'following', otherRef); } catch {}
    try { await incrementDocValue('usersPublic', meRef.uid, 'followingCount'); } catch {}

    try { await arrayAppend('usersPublic', otherRef.uid, 'followers', meRef); } catch {}
    try { await incrementDocValue('usersPublic', otherRef.uid, 'followerCount'); } catch {}

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

    return { status: 'following', private: isPrivate };
}
