import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase.config';

export default async function createDoc(col, did, data) {
    console.log({ col }, { did }, { data });
    await setDoc(doc(db, col, did), data);
}