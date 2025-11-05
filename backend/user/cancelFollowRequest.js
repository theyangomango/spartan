import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase.config";

const cancelCallable = httpsCallable(functions, "cancelFollowRequestAction");

const coerceUid = (value) => {
    if (!value && value !== 0) return "";
    if (typeof value === "string" || typeof value === "number") return String(value).trim();
    if (typeof value === "object") {
        return coerceUid(value.uid || value.id || value.userUid || value.profileUid);
    }
    return "";
};

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
