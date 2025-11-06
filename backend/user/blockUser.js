import { httpsCallable } from "firebase/functions";
import { functions, auth } from "../../firebase.config";
import { coerceUid } from "../helper/userRefs";

const blockCallable = httpsCallable(functions, "blockUserAction");

export default async function blockUser(this_user, user) {
    const targetUid = coerceUid(user);
    if (!targetUid) return;

    let idToken = "";
    try {
        const currentUser = auth?.currentUser;
        if (currentUser?.getIdToken) {
            idToken = await currentUser.getIdToken();
        }
    } catch (tokenError) {
        console.log("blockUser getIdToken error", tokenError?.message || tokenError);
    }

    const payload = { targetUid };
    if (idToken) payload.idToken = idToken;

    try {
        await blockCallable(payload);
    } catch (error) {
        console.log("blockUser callable error", error?.message || error);
        throw error;
    }
}
