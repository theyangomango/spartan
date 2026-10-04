import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase.config";
import coerceUid from "./coerceTargetUid";

const cancelCallable = httpsCallable(functions, "cancelFollowRequestAction");

export default async function cancelFollowRequest(this_user, user) {
    const targetUid = coerceUid(user);
    if (!targetUid) return false;

    try {
        await cancelCallable({ targetUid });
        return true;
    } catch (error) {
        console.log("cancelFollowRequest callable error", error?.message || error);
        return false;
    }
}
