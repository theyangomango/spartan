import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase.config';

export default function useFilteredFeed(followingUsers, max = 50) {
    const [feed, setFeed] = useState([]);

    useEffect(() => {
        if (!Array.isArray(followingUsers) || followingUsers.length === 0) {
            setFeed([]);
            return;
        }

        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('created', 'desc'), limit(max));

        const unsub = onSnapshot(q, (snapshot) => {
            const filtered = snapshot.docs
                .map(doc => ({ ...doc.data() }))
                .filter(p => followingUsers.some(u => {
                    return (u?.uid || u) == p.uid;
                }) || global.userData?.uid == p.uid);

            setFeed(filtered);
        });

        return () => unsub();
    // Use a stable string key derived from following to avoid crashes when undefined
    }, [JSON.stringify(Array.isArray(followingUsers) ? followingUsers.map(u => (u?.uid || u)) : []), max]);

    return feed;
}
