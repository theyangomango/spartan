import createDoc from "../helper/firebase/createDoc";
import registerChatParticipants from "./registerChatParticipants";

const normalizeParticipant = (entry) => {
    if (!entry || typeof entry !== "object") return null;
    const uidCandidate =
        entry.uid ||
        entry.id ||
        entry.userUid ||
        entry.profileUid ||
        entry.memberUid ||
        entry.creatorUid ||
        entry.creatorUID;
    const uid = typeof uidCandidate === "string" || typeof uidCandidate === "number"
        ? String(uidCandidate).trim()
        : "";
    if (!uid) return null;

    const handle =
        (typeof entry.handle === "string" && entry.handle) ||
        (typeof entry.username === "string" && entry.username) ||
        "";
    const display =
        (typeof entry.displayName === "string" && entry.displayName) ||
        (typeof entry.name === "string" && entry.name) ||
        "";
    const photo =
        (typeof entry.pfp === "string" && entry.pfp) ||
        (typeof entry.image === "string" && entry.image) ||
        (typeof entry.photoURL === "string" && entry.photoURL) ||
        "";
    const pfpVersion = Number(entry?.pfpVersion ?? entry?.imageVersion ?? 0) || 0;

    return {
        uid,
        handle,
        name: display || handle || "",
        displayName: display || handle || "",
        pfp: photo || "",
        image: photo || "",
        photoURL: photo || "",
        pfpVersion,
    };
};

export default async function createChat(creatorUID, users, cid) {
    const safeCid = String(cid || "").trim();
    if (!safeCid) throw new Error("createChat requires cid");

    const participants = Array.isArray(users) ? users.map(normalizeParticipant).filter(Boolean) : [];
    const memberUids = participants.map((p) => p.uid);

    const newChat = {
        cid: safeCid,
        creatorUID: String(creatorUID || ""),
        users: participants,
        userCount: participants.length,
        isGroup: participants.length > 2,
        memberUids,
        created: Date.now(),
    };

    await createDoc("messages", safeCid, newChat);

    try {
        await registerChatParticipants({ cid: safeCid, participants });
    } catch (err) {
        console.log("createChat register participants error", err?.message || err);
    }

    return newChat;
}
