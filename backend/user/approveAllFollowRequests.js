import acceptFollowRequest from "./acceptFollowRequest";
import updateDoc from "../helper/firebase/updateDoc";
import readUserProfiles from "../helper/firebase/readUserProfiles";

export default async function approveAllFollowRequests(uid) {
    const safeUid = String(uid || '');
    if (!safeUid) return { processed: 0 };

    const { publicProfile, privateProfile } = await readUserProfiles(safeUid);
    const pending = Array.isArray(privateProfile?.followRequestsIn) ? privateProfile.followRequestsIn : [];
    if (pending.length === 0) return { processed: 0 };

    const selfPayload = {
        uid: safeUid,
        handle: publicProfile?.handle || '',
        name: publicProfile?.displayName || publicProfile?.name || '',
        pfp: publicProfile?.photoURL || publicProfile?.pfp || '',
        pfpVersion: publicProfile?.pfpVersion || publicProfile?.imageVersion || 0,
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
        await updateDoc('usersPrivate', safeUid, { followRequestsIn: [] });
    } catch {}

    return { processed };
}
