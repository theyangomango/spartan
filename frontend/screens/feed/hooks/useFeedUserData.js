import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { initUserFeed, registerFeedSetters } from "../../../helper/initUserFeed";
import { db } from "../../../../firebase.config";
import { getMessagesCache, subscribeMessagesCache } from "../../../state/messagesCache";

export default function useFeedUserData({ UID, navigation, route }) {
    const [messages, setMessages] = useState(() => getMessagesCache());
    const [footerKey, setFooterKey] = useState(0);
    // Only the setter is used: the re-render it triggers is what makes the Feed re-read global.userData.
    const [, setActiveWorkout] = useState(null);

    const userDataRef = useRef(null);

    useEffect(() => {
        registerFeedSetters({
            setMessages,
            setFooterKey,
        });

        if (UID) initUserFeed(UID);
    }, [UID]);

    useEffect(() => {
        const unsubscribe = subscribeMessagesCache((snapshot) => {
            setMessages(snapshot);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!UID) return undefined;

        const unsubscribe = onSnapshot(doc(db, "usersPublic", UID), (snap) => {
            userDataRef.current = snap.data();
            // Merge: replacing the record with the public document would drop the private fields App merged in.
            try { if (userDataRef.current) global.userData = { ...(global.userData || {}), ...userDataRef.current }; } catch { }

            const killUntil = Number(global?.__suppressCurrentWorkoutUntil || 0);
            const now = Date.now();
            const workout = (now < killUntil) ? null : (userDataRef.current?.currentWorkout || null);
            setActiveWorkout(workout);
        });

        return () => unsubscribe();
    }, [UID]);

    useEffect(() => {
        if (route?.params?.messages) {
            setMessages(route.params.messages);
        }
    }, [route?.params?.messages]);

    const toMessagesScreen = useCallback(() => {
        try {
            if (global.userData && messages) {
                navigation.navigate("Messages", {
                    userData: userDataRef.current || global.userData,
                    messages,
                });
                return;
            }
        } catch { }

        try { navigation.navigate("Messages"); } catch { }
    }, [messages, navigation]);

    return {
        footerKey,
        toMessagesScreen,
    };
}
