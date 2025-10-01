import acceptFollowRequest from "./acceptFollowRequest";
import readDoc from "../helper/firebase/readDoc";
import updateDoc from "../helper/firebase/updateDoc";

export default async function approveAllFollowRequests(uid) {
    const safeUid = String(uid || '');
    if (!safeUid) return { processed: 0 };

    let userDoc = null;
    try { userDoc = await readDoc('users', safeUid); }
    catch { userDoc = null; }

    const pending = Array.isArray(userDoc?.followRequestsIn) ? userDoc.followRequestsIn : [];
    if (pending.length === 0) return { processed: 0 };

    const selfPayload = {
        uid: safeUid,
        handle: userDoc?.handle || '',
        name: userDoc?.name || '',
        pfp: userDoc?.pfp || userDoc?.image || '',
        pfpVersion: userDoc?.pfpVersion || userDoc?.imageVersion || 0,
    };

    let processed = 0;
    for (const entry of pending) {
        try {
            await acceptFollowRequest(selfPayload, entry);
            processed += 1;
        } catch (err) {
            console.log('approveAllFollowRequests error', err?.message || err);
        }
    }

    try {
        await updateDoc('users', safeUid, { followRequestsIn: [] });
    } catch {}

    return { processed };
}
