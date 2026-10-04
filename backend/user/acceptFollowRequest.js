import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase.config";
import coerceUid from "./coerceTargetUid";

const respondCallable = httpsCallable(functions, "respondFollowRequestAction");

export default async function acceptFollowRequest(this_user, requester) {
    const requesterUid = coerceUid(requester);
    if (!requesterUid) return { status: "error", reason: "missing-uid" };

    try {
        const response = await respondCallable({ requesterUid, decision: "accept" });
        return response?.data || { status: "accepted" };
    } catch (error) {
        console.log("acceptFollowRequest callable error", error?.message || error);
        throw error;
    }
}
