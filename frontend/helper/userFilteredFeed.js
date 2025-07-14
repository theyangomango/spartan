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
        const q = query(postsRef, orderBy('created'), limit(max));

        const unsub = onSnapshot(q, (snapshot) => {

            followingUsers.forEach(u => console.log(u.uid));
            console.log('\n');
            snapshot.docs.map(doc => ({ ...doc.data() })).forEach(p => console.log(p.uid));
            console.log('\n');
            console.log('\n');


            const filtered = snapshot.docs
                .map(doc => ({ ...doc.data() }))
                .filter(p => followingUsers.some(u => {
                    return u.uid == p.uid;
                }));

            console.log(filtered);

            setFeed(filtered);
        });

        return () => unsub();
    }, [followingUsers.join(','), max]); // join to avoid infinite re-renders on array identity change

    return feed;
}
