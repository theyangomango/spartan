import { httpsCallable } from "firebase/functions";
import { functions, auth } from "../../firebase.config";
import { coerceUid } from "../helper/userRefs";

const unblockCallable = httpsCallable(functions, "unblockUserAction");

export default async function unblockUser(this_user, user) {
    const targetUid = coerceUid(user);
    if (!targetUid) return;

    let idToken = "";
    try {
        const currentUser = auth?.currentUser;
        if (currentUser?.getIdToken) {
            idToken = await currentUser.getIdToken();
        }
    } catch (tokenError) {
        console.log("unblockUser getIdToken error", tokenError?.message || tokenError);
    }

    const payload = { targetUid };
    if (idToken) payload.idToken = idToken;

    try {
        await unblockCallable(payload);
    } catch (error) {
        console.log("unblockUser callable error", error?.message || error);
        throw error;
    }
}
