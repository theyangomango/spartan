import { collection, addDoc, doc, getDoc } from "firebase/firestore";
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

    // Try push notification via Expo (best-effort, no throw)
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        const target = snap.exists() ? (snap.data() || {}) : {};
        const to = String(target?.expoPushToken || '');
        if (!to || !to.startsWith('ExponentPushToken')) return;

        // Compose a friendly title/body based on event
        const h = event?.handle || 'Someone';
        let title = 'New activity';
        let body = '';
        switch (event?.type) {
            case 'liked-post':
                title = 'New like'; body = `${h} liked your post`; break;
            case 'liked-comment':
                title = 'New like'; body = `${h} liked your comment`; break;
            case 'comment':
                title = 'New comment'; body = `${h}: ${String(event?.content || '').slice(0, 80)}`; break;
            case 'replied-comment':
                title = 'New reply'; body = `${h} replied: ${String(event?.content || '').slice(0, 80)}`; break;
            default:
                title = 'New notification'; body = `${h} interacted with you`; break;
        }

        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, sound: 'default', title, body, data: { nidType: event?.type || 'event', pid: event?.pid || null } })
        });
    } catch (e) { /* ignore network errors to avoid blocking UX */ }
}
