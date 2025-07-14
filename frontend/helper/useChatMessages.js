import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase.config';

export default function useChatMessages(cid) {
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        if (!cid) return;

        const contentRef = collection(db, 'messages', cid, 'content');
        const q = query(contentRef, orderBy('timestamp', 'desc')); // latest messages first

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setMessages(msgList);
        });

        return () => unsubscribe(); // Clean up on unmount
    }, [cid]);

    return messages;
}
