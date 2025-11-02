import { doc, setDoc, updateDoc as nativeUpdateDoc } from 'firebase/firestore';
import { db } from '../../../firebase.config';

export default async function updateDoc(col, did, data, options = {}) {
    const { allowCreate = col !== 'users' } = options;
    const ref = doc(db, col, did);
    try {
        await nativeUpdateDoc(ref, data);
        return true;
    } catch (err) {
        if (err?.code === 'not-found') {
            if (allowCreate) {
                await setDoc(ref, data, { merge: true });
                return true;
            }
            return false; // skip creating missing docs (notably for users)
        }
        throw err;
    }
}
