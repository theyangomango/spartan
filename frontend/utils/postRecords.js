import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';

let ownerMapCache = null;
let ownerMapPromise = null;

async function loadOwnerMap() {
    const ref = doc(db, 'global', 'posts');
    const snap = await getDoc(ref);
    ownerMapCache = snap.exists() ? (snap.data()?.ownerMap || {}) : {};
    ownerMapPromise = null;
    return ownerMapCache;
}

export function invalidateOwnerMapCache() {
    ownerMapCache = null;
    ownerMapPromise = null;
}

export async function resolvePostOwner(pid) {
    if (!pid) return null;
    if (!ownerMapCache) {
        if (!ownerMapPromise) ownerMapPromise = loadOwnerMap();
        else await ownerMapPromise;
    }
    if (ownerMapCache && pid in ownerMapCache) return ownerMapCache[pid];
    // Reload if cache existed but missing pid (might be new)
    ownerMapCache = null;
    if (!ownerMapPromise) ownerMapPromise = loadOwnerMap();
    else await ownerMapPromise;
    return ownerMapCache?.[pid] || null;
}

export async function fetchPostRecord(pid, hintUid) {
    if (!pid) return null;
    let ownerUid = hintUid ? String(hintUid) : await resolvePostOwner(pid);
    if (!ownerUid) return null;
    const userSnap = await getDoc(doc(db, 'users', ownerUid));
    if (!userSnap.exists()) return null;
    const data = userSnap.data() || {};
    const record = data.postRecords?.[pid];
    if (!record) return null;
    return { ...record, pid, uid: record?.uid || ownerUid };
}

export async function fetchUserPostRecords(uid) {
    if (!uid) return { order: [], records: {} };
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return { order: [], records: {} };
    const data = snap.data() || {};
    const order = Array.isArray(data.posts) ? data.posts : Object.keys(data.postRecords || {});
    const records = data.postRecords || {};
    return { order, records };
}
