import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase.config";

const registerCallable = httpsCallable(functions, "registerChatParticipantsAction");

const ensureParticipantsArray = (participants) => {
    if (!Array.isArray(participants)) return [];
    return participants
        .map((entry) => (entry && typeof entry === "object" ? entry : null))
        .filter(Boolean);
};

export default async function registerChatParticipants({ cid, participants }) {
    const safeCid = String(cid || "").trim();
    if (!safeCid) {
        throw new Error("registerChatParticipants requires cid");
    }
    const payload = {
        cid: safeCid,
        participants: ensureParticipantsArray(participants),
    };
    const response = await registerCallable(payload);
    return response?.data || null;
}
