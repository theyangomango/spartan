import { doc, increment, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase.config';

export default async function incrementDocValue(col, did, key, diff = 1) {
    await setDoc(doc(db, col, did), {
        [key]: increment(diff)
    }, {
        merge: true
    });
}