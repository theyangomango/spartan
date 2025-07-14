import { collection, addDoc } from "firebase/firestore";
import incrementDocValue from "./helper/firebase/incrementDocValue";
import { db } from "../firebase.config";

export default async function sendNotification(uid, event) {
    // Increment notification counters
    switch (event.type) {
        case 'liked-post':
        case 'liked-comment':
        case 'liked-story':
            incrementDocValue('users', uid, 'notificationNewLikes');
            break;
        case 'comment':
        case 'replied-comment':
            incrementDocValue('users', uid, 'notificationNewComments');
            break;
    }
    incrementDocValue('users', uid, 'notificationNewEvents');

    // Add event to the user's notifications subcollection
    const notificationsRef = collection(db, 'users', uid, 'notifications');
    await addDoc(notificationsRef, {
        ...event,
        read: false            // Optional: add `read` flag
    });
}
