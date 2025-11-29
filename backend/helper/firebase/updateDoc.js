import { doc, setDoc, updateDoc as nativeUpdateDoc } from 'firebase/firestore';
import { db } from '../../../firebase.config';

const skipCreateCollections = new Set(['users', 'usersPublic', 'usersPrivate']);

export default async function updateDoc(col, did, data, options = {}) {
    const { allowCreate = !skipCreateCollections.has(col) } = options;
    const ref = doc(db, col, did);
    try {
        await nativeUpdateDoc(ref, data);
        return true;
    } catch (err) {
        if (err?.code === 'not-found' || err?.code === 'permission-denied') {
            if (allowCreate) {
                try {
                    await setDoc(ref, data, { merge: true });
                    return true;
                } catch (fallbackError) {
                    console.warn?.('updateDoc fallback setDoc failed', { col, did, code: fallbackError?.code, message: fallbackError?.message, dataKeys: Object.keys(data || {}) });
                    throw fallbackError;
                }
            }
            return false; // skip creating missing docs (notably for users)
        }
        console.warn?.('updateDoc failed', { col, did, code: err?.code, message: err?.message, dataKeys: Object.keys(data || {}) });
        throw err;
    }
}
