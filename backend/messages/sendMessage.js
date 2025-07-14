import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';
import makeID from '../helper/makeID';

export default async function sendMessage(uid, handle, cid, content, timestamp = Date.now()) {
    const message = {
        uid,
        handle,
        text: content,
        timestamp,
    };

    console.log(uid, cid, content, timestamp);

    // Generate a custom message ID
    const msgId = makeID(); // e.g., 12-char alphanumeric

    // Reference to: messages/{cid}/content/{msgId}
    const msgRef = doc(collection(db, 'messages', cid, 'content'), msgId);

    // Create the document with the custom ID
    await setDoc(msgRef, message);
}
