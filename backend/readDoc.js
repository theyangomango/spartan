import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.config';

export async function readDoc(col, did) {
    const docRef = doc(db, col, did);
    const docSnap = await getDoc(docRef);
    return docSnap.data();
}