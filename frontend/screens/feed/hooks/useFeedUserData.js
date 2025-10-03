import { useCallback, useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { initUserFeed, registerFeedSetters } from "../../../helper/initUserFeed";
import millisToHoursMinutesSeconds from "../../../helper/millisToHoursMinutesSeconds";
import { db } from "../../../../firebase.config";
import { getMessagesCache, subscribeMessagesCache } from "../../../state/messagesCache";

export default function useFeedUserData({ UID, navigation, route, isScreenFocused }) {
    const [messages, setMessages] = useState(() => getMessagesCache());
    const [footerKey, setFooterKey] = useState(0);
    const [activeWorkout, setActiveWorkout] = useState(null);

    const userDataRef = useRef(null);
    const headerTimerRef = useRef("");
    const headerTimerIdRef = useRef(null);

    const toMillis = useCallback((value) => {
        if (typeof value === "number") return value;
        if (value?.toMillis) return value.toMillis();
        if (typeof value?.seconds === "number") return value.seconds * 1000;
        const parsed = new Date(value).getTime();
        return Number.isFinite(parsed) ? parsed : 0;
    }, []);

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

        const unsubscribe = onSnapshot(doc(db, "users", UID), (snap) => {
            userDataRef.current = snap.data();
            try { global.userData = userDataRef.current; } catch { }

            const killUntil = Number(global?.__suppressCurrentWorkoutUntil || 0);
            const now = Date.now();
            const workout = (now < killUntil) ? null : (userDataRef.current?.currentWorkout || null);
            setActiveWorkout(workout);
        });

        return () => unsubscribe();
    }, [UID]);

    useEffect(() => {
        if (headerTimerIdRef.current) {
            try { clearInterval(headerTimerIdRef.current); } catch { }
            headerTimerIdRef.current = null;
        }
        headerTimerRef.current = "";

        const wid = String(activeWorkout?.wid || "");
        const createdMs = toMillis(activeWorkout?.created ?? activeWorkout?.createdAt);
        if (!wid || !createdMs || !isScreenFocused) return undefined;

        const tick = () => {
            const diff = Math.max(1000, Date.now() - createdMs);
            headerTimerRef.current = millisToHoursMinutesSeconds(diff);
        };

        tick();
        headerTimerIdRef.current = setInterval(tick, 1000);

        return () => {
            if (headerTimerIdRef.current) {
                try { clearInterval(headerTimerIdRef.current); } catch { }
                headerTimerIdRef.current = null;
            }
        };
    }, [activeWorkout?.wid, activeWorkout?.created, activeWorkout?.createdAt, isScreenFocused, toMillis]);

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
        activeWorkout,
        footerKey,
        headerTimerRef,
        toMessagesScreen,
    };
}
