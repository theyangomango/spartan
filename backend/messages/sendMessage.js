import { arrayAppend } from "../helper/firebase/arrayAppend";

export default async function sendMessage(uid, cid, content) {
    arrayAppend('messages', cid, messages, {
        uid: uid,
        content: content
    });
}