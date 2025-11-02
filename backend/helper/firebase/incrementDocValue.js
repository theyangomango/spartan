import { doc, increment, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase.config';

export default async function incrementDocValue(col, did, key, diff = 1, options = {}) {
    const { allowCreate = col !== 'users' } = options;
    const ref = doc(db, col, did);
    try {
        await updateDoc(ref, {
            [key]: increment(diff)
        });
        return true;
    } catch (err) {
        if (err?.code === 'not-found') {
            if (allowCreate) {
                await setDoc(ref, {
                    [key]: increment(diff)
                }, { merge: true });
                return true;
            }
            return false; // skip creating new docs for missing users
        }
        throw err;
    }
}
