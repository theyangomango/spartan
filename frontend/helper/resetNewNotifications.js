import { db } from '../../firebase.config';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

const resetNewNotifications = async () => {
    const uid = global.userData?.uid;
    if (!uid) return;

    const notificationsRef = collection(db, 'users', uid, 'notifications');
    const q = query(notificationsRef, where('read', '==', false));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);

    snapshot.forEach(doc => {
        batch.update(doc.ref, { read: true });
    });

    await batch.commit();
    console.log(`✅ Marked ${snapshot.size} notifications as read.`);
};

export default resetNewNotifications;
