import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";

let callableInstance = null;

const getCallable = () => {
    if (!callableInstance) {
        callableInstance = httpsCallable(functions, "sendUserNotification");
    }
    return callableInstance;
};

export default async function sendNotification(uid, rawEvent) {
    const targetUid = typeof uid === "string" || typeof uid === "number" ? String(uid).trim() : "";
    if (!targetUid) return;
    const event = rawEvent && typeof rawEvent === "object" ? rawEvent : {};

    try {
        await getCallable()({
            targetUid,
            event,
        });
    } catch (error) {
        // Swallow permission or network issues to avoid breaking UX,
        // but surface unexpected errors for debugging.
        const code = error?.code || error?.name || "";
        if (code !== "permission-denied" && code !== "functions/permission-denied") {
            console.warn("sendNotification: failed to dispatch event", error);
        }
    }
}
