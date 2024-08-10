import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../../firebase.config';

export default async function arrayErase(col, did, arr, value) {
    await updateDoc(doc(db, col, did), {
        [arr]: arrayRemove(value)
    }, {
        merge: true
    });
}