import arrayAppend from "./helper/firebase/arrayAppend";
import incrementDocValue from "./helper/firebase/incrementDocValue";

export default async function sendNotification(uid, event) {
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
    arrayAppend('users', uid, 'notificationEvents', event);
}