import { deleteDoc, doc } from "firebase/firestore";
import { db } from '../../../firebase.config';

export default async function eraseDoc(cid, did) {
    await deleteDoc(doc(db, cid, did));
}