import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.config";

let cachedUsers = null;
let inflightPromise = null;

async function fetchAllUsers() {
    const res = [];
    const querySnapshot = await getDocs(collection(db, "usersPublic"));
    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        res.push({
            uid: docSnap.id,
            handle: data?.handle || data?.handleLower || "",
            name: data?.name || data?.displayName || "",
            pfp: data?.photoURL || data?.image || data?.pfp || "",
            photoURL: data?.photoURL || data?.image || data?.pfp || "",
            pfpVersion: data?.pfpVersion || 0,
            isVerified: data?.isVerified || data?.verified || false,
        });
    });
    cachedUsers = res;
    return res;
}

export function primeAllUsers() {
    if (cachedUsers) return Promise.resolve(cachedUsers);
    if (inflightPromise) return inflightPromise;
    inflightPromise = fetchAllUsers()
        .catch((err) => {
            inflightPromise = null;
            throw err;
        })
        .then((res) => {
            inflightPromise = null;
            return res;
        });
    return inflightPromise;
}

export default async function getAllUsers({ forceRefresh = false } = {}) {
    if (!forceRefresh) {
        if (cachedUsers) return cachedUsers;
        if (inflightPromise) return inflightPromise;
    }
    inflightPromise = fetchAllUsers()
        .catch((err) => {
            inflightPromise = null;
            if (forceRefresh) throw err;
            throw err;
        })
        .then((res) => {
            inflightPromise = null;
            return res;
        });
    return inflightPromise;
}
