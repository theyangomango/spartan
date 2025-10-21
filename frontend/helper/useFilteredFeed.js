import { useEffect, useRef, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase.config';

export default function useFilteredFeed(followingUsers, max = 50) {
    const [feed, setFeed] = useState([]);
    const mapRef = useRef(new Map()); // id -> post object
    const orderRef = useRef([]);      // array of ids in display order

    const myUid = global?.userData?.uid ? String(global.userData.uid) : null;

    useEffect(() => {
        const followingArray = Array.isArray(followingUsers) ? followingUsers : [];
        const allowedUids = new Set(
            followingArray
                .map((u) => (u?.uid || u))
                .filter(Boolean)
                .map(String)
        );
        if (myUid) allowedUids.add(myUid);

        if (allowedUids.size === 0) {
            setFeed([]);
            return;
        }

        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('created', 'desc'), limit(max));

        // Exclusions: users I blocked or who blocked me
        const myBlocked = Array.isArray(global?.userData?.blocked) ? global.userData.blocked : [];
        const myBlockedBy = Array.isArray(global?.userData?.blockedBy) ? global.userData.blockedBy : [];
        const excludeUids = new Set([
            ...myBlocked.map((x) => (x?.uid || x)).filter(Boolean),
            ...myBlockedBy.map((x) => (x?.uid || x)).filter(Boolean),
        ].map(String));

        // Reset caches when filtering basis changes
        mapRef.current = new Map();
        orderRef.current = [];

        const unsub = onSnapshot(q, (snapshot) => {
            // Build the desired order from snapshot (respect query order), filtered by allowed uids
            const idsInSnapshot = [];
            snapshot.docs.forEach(d => {
                const data = d.data();
                const uid = String(data?.uid || '');
                const include = allowedUids.has(uid) && !excludeUids.has(uid);
                if (include) idsInSnapshot.push(d.id);
            });

            // Apply doc changes to the map, creating new objects only for changed docs
            const nextMap = new Map(mapRef.current);
            let touched = false;
            snapshot.docChanges().forEach(c => {
                const id = c.doc.id;
                const data = c.doc.data();
                const uid = String(data?.uid || '');
                const include = allowedUids.has(uid) && !excludeUids.has(uid);
                if (c.type === 'removed' || !include) {
                    if (nextMap.has(id)) { nextMap.delete(id); touched = true; }
                    return;
                }
                // For added/modified within allowed set, replace object to trigger rerender for that post only
                const prev = nextMap.get(id);
                const base = prev ? { ...prev } : {};
                const obj = { ...base, ...data, pid: data?.pid ?? id };
                nextMap.set(id, obj);
                touched = true;
            });

            // If nothing changed according to docChanges, still ensure order consistency
            const equalOrder = (
                orderRef.current.length === idsInSnapshot.length &&
                orderRef.current.every((v, i) => v === idsInSnapshot[i])
            );

            if (!touched && equalOrder) return; // no-op

            mapRef.current = nextMap;
            orderRef.current = idsInSnapshot;
            const arr = idsInSnapshot.map(id => nextMap.get(id)).filter(Boolean);
            setFeed(arr);
        });

        return () => unsub();
    // Use a stable string key derived from following to avoid crashes when undefined
    }, [JSON.stringify(Array.isArray(followingUsers) ? followingUsers.map(u => (u?.uid || u)) : []), max, myUid]);

    return feed;
}
