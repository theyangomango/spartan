import createDoc from "../helper/firebase/createDoc";

export default async function initChat(creatorUID, users, cid) {
    const newChat = {
        cid: cid,
        creatorUID: creatorUID,
        users: users,
        userCount: users.length,
        isGroup: users.length > 2,
        created: Date.now(),
        content: []
    }

    await createDoc('messages', cid, newChat);
    return newChat;
}