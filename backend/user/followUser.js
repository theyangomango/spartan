import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase.config";
import coerceUid from "./coerceTargetUid";

const followCallable = httpsCallable(functions, "followUserAction");

export default async function followUser(this_user, user) {
    const targetUid = coerceUid(user);
    if (!targetUid) {
        return { status: "error", reason: "missing-uid" };
    }

    try {
        const response = await followCallable({ targetUid });
        return response?.data || { status: "error" };
    } catch (error) {
        console.log("followUser callable error", error?.message || error);
        throw error;
    }
}
