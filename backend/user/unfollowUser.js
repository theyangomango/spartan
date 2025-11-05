import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase.config";

const unfollowCallable = httpsCallable(functions, "unfollowUserAction");

const coerceUid = (value) => {
    if (!value && value !== 0) return "";
    if (typeof value === "string" || typeof value === "number") return String(value).trim();
    if (typeof value === "object") {
        return coerceUid(value.uid || value.id || value.userUid || value.profileUid);
    }
    return "";
};

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
