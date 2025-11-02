import { doc, updateDoc as nativeUpdateDoc, deleteField } from "firebase/firestore";
import { db } from "../../firebase.config";
import arrayErase from "../helper/firebase/arrayErase";
import { normalizeUserRef } from "../helper/userRefs";

export default async function unblockUser(this_user, user) {
    const meRef = normalizeUserRef(this_user);
    const otherRef = normalizeUserRef(user);

    if (!meRef || !otherRef) return;

    const meUid = meRef.uid;
    const otherUid = otherRef.uid;

    const meDocRef = doc(db, "users", meUid);
    const otherDocRef = doc(db, "users", otherUid);

    await Promise.all([
        arrayErase("users", meUid, "blocked", otherRef),
        arrayErase("users", meUid, "blockedUidList", otherUid),
        arrayErase("users", otherUid, "blockedBy", meRef),
        arrayErase("users", otherUid, "blockedByUidList", meUid),
    ]);

    // Do not automatically restore follows/tribes/messages; the user must initiate fresh connections.
    try {
        await nativeUpdateDoc(meDocRef, {
            [`blockedTimestamps.${otherUid}`]: deleteField(),
        });
    } catch {}
    try {
        await nativeUpdateDoc(otherDocRef, {
            [`blockedByTimestamps.${meUid}`]: deleteField(),
        });
    } catch {}
}
