import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.config";

export default async function getAllUsers() {
    const res = [];

    const querySnapshot = await getDocs(collection(db, "usersPublic"));
    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        res.push({
            uid: docSnap.id,
            handle: data?.handle || data?.handleLower || '',
            name: data?.name || data?.displayName || '',
            pfp: data?.photoURL || data?.image || data?.pfp || '',
            photoURL: data?.photoURL || data?.image || data?.pfp || '',
            pfpVersion: data?.pfpVersion || 0,
            isVerified: data?.isVerified || data?.verified || false,
        });
    });

    return res;
}
