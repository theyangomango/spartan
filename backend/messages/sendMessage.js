import arrayAppend from "../helper/firebase/arrayAppend";

export default async function sendMessage(uid, handle, cid, content, timestamp = Date.now()) {
    console.log(uid, cid, content, timestamp);
    arrayAppend('messages', cid, 'content', {
        uid: uid,
        handle: handle,
        text: content,
        timestamp: timestamp
    });
}