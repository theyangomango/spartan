import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../firebase.config';

export default async function arrayAppend(col, did, arr, value) {
    await updateDoc(doc(db, col, did), {
        [arr]: arrayUnion(value)
    }, {
        merge: true
    });
}