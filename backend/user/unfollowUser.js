import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase.config";
import coerceUid from "./coerceTargetUid";

const unfollowCallable = httpsCallable(functions, "unfollowUserAction");

export default async function unfollowUser(this_user, user) {
    const targetUid = coerceUid(user);
    if (!targetUid) return;

    try {
        await unfollowCallable({ targetUid });
    } catch (error) {
        console.log("unfollowUser callable error", error?.message || error);
        throw error;
    }
}
