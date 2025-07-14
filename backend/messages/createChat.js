import createDoc from "../helper/firebase/createDoc";

export default async function createChat(creatorUID, users, cid) {
    const newChat = {
        cid: cid,
        creatorUID: creatorUID,
        users: users,
        userCount: users.length,
        isGroup: users.length > 2,
        created: Date.now()
        // 🔥 No content field here — it's now a subcollection
    };

    // Creates document at: messages/{cid}
    await createDoc('messages', cid, newChat);

    return newChat;
}
