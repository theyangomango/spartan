import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase.config';

export default function useFilteredStories(followingUsers, max = 30) {
    const [storiesData, setStoriesData] = useState([]);
    const [storiesUserList, setStoriesUserList] = useState([]);

    useEffect(() => {
        if (!Array.isArray(followingUsers) || followingUsers.length === 0) {
            setStoriesData([]);
            setStoriesUserList([]);
            return;
        }

        const storiesRef = collection(db, 'stories');
        const q = query(storiesRef, orderBy('created'), limit(max));

        const unsub = onSnapshot(q, (snapshot) => {
            const filtered = snapshot.docs
                .map(doc => ({ ...doc.data() }))
                .filter(s => followingUsers.some(u => {
                    return u.uid == s.uid; // someone you follow
                }) || global.userData.uid == s.uid); // your own story

            const groupedByUser = [{
                uid: global.userData.uid,
                handle: global.userData.handle,
                pfp: global.userData.pfp,
                name: global.userData.name,
                stories: []
            }];
          
            for (const story of filtered) {
                if (groupedByUser.find(u => u.uid == story.uid)) { // existing user
                    groupedByUser.find(u => u.uid == story.uid).stories.push(story.sid);
                }
                else { // new user
                    groupedByUser.push({
                        uid: story.uid,
                        handle: story.handle,
                        pfp: story.pfp,
                        name: story.name,
                        stories: [story.sid]
                    });
                }
            }

            setStoriesData(filtered);
            setStoriesUserList(groupedByUser);
        });


        return () => unsub();
    }, [followingUsers, max]);

    return {
        storiesData,
        storiesUserList
    };
}
