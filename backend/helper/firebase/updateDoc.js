import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase.config';

export default async function updateDoc(col, did, data) {
    await setDoc(doc(db, col, did), data, {
        merge: true
    });
}