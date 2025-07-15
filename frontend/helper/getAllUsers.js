import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.config";
import readDoc from "../../backend/helper/firebase/readDoc";

export default async function getAllUsers() {
    const res = [];

    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        res.push(doc.data());
    });

    return res;
}