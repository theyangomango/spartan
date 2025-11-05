import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase.config";

const respondCallable = httpsCallable(functions, "respondFollowRequestAction");

const coerceUid = (value) => {
    if (!value && value !== 0) return "";
    if (typeof value === "string" || typeof value === "number") return String(value).trim();
    if (typeof value === "object") {
        return coerceUid(value.uid || value.id || value.userUid || value.profileUid);
    }
    return "";
};

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
