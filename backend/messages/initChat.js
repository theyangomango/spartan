import { createDoc } from "../helper/firebase/createDoc";
import makeID from "../helper/makeID";

export default async function initChat(creatorUID, users) {
    let cid = makeID();
    createDoc('messages', cid, {
        cid: cid,
        creatorUID: creatorUID,
        users: users,
        created: Date.now(),
        messages: []
    });
}