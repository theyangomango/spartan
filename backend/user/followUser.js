import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase.config";

const followCallable = httpsCallable(functions, "followUserAction");

const coerceUid = (value) => {
    if (!value && value !== 0) return "";
    if (typeof value === "string" || typeof value === "number") return String(value).trim();
    if (typeof value === "object") {
        return coerceUid(value.uid || value.id || value.userUid || value.profileUid);
    }
    return "";
};

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
