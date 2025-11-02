import arrayAppend from "../helper/firebase/arrayAppend";
import arrayErase from "../helper/firebase/arrayErase";
import incrementDocValue from "../helper/firebase/incrementDocValue";
import sendNotification from "../sendNotification";
import readDoc from "../helper/firebase/readDoc";
import { normalizeUserRef, ensureUidArray } from "../helper/userRefs";

export default async function followUser(this_user, user) {
    const meRef = normalizeUserRef(this_user);
    const otherRef = normalizeUserRef(user);

    if (!meRef.uid || !otherRef.uid) {
        return { status: 'error', reason: 'missing-uid' };
    }

    let targetDoc = null;
    let meDoc = null;
    try { targetDoc = await readDoc('users', otherRef.uid); }
    catch { targetDoc = null; }
    try { meDoc = await readDoc('users', meRef.uid); }
    catch { meDoc = null; }

    const targetBlocked = ensureUidArray(targetDoc?.blockedUidList || targetDoc?.blocked);
    const meBlocked = ensureUidArray(meDoc?.blockedUidList || meDoc?.blocked);
    const targetBlockedBy = ensureUidArray(targetDoc?.blockedByUidList || targetDoc?.blockedBy);

    if (targetBlocked.includes(meRef.uid) || meBlocked.includes(otherRef.uid) || targetBlockedBy.includes(meRef.uid)) {
        return { status: "error", reason: "blocked" };
    }

    const isPrivate = !!targetDoc?.settings?.profilePrivate;
    const alreadyFollower = Array.isArray(targetDoc?.followers)
        ? targetDoc.followers.some((entry) => String(entry?.uid || entry?.id || entry) === meRef.uid)
        : false;
    const alreadyRequested = Array.isArray(targetDoc?.followRequestsIn)
        ? targetDoc.followRequestsIn.some((entry) => String(entry?.uid || entry?.id || entry) === meRef.uid)
        : false;

    if (isPrivate && !alreadyFollower) {
        if (!alreadyRequested) {
            try { await arrayAppend('users', otherRef.uid, 'followRequestsIn', meRef); } catch {}
            try { await arrayAppend('users', meRef.uid, 'followRequestsOut', otherRef); } catch {}

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
    try { await arrayErase('users', otherRef.uid, 'followRequestsIn', meRef); } catch {}
    try { await arrayErase('users', meRef.uid, 'followRequestsOut', otherRef); } catch {}

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

    return { status: 'following', private: isPrivate };
}
