// hooks/useResolvedUid.js
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function useResolvedUid(route) {
    // route param -> global -> auth
    const [uid, setUid] = useState(() => route?.params?.uid ?? global?.userData?.uid ?? null);

    // react to route param changes
    useEffect(() => {
        if (route?.params?.uid && route.params.uid !== uid) setUid(route.params.uid);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route?.params?.uid]);

    // resolve from Firebase Auth on cold start
    useEffect(() => {
        if (uid) return;
        const auth = getAuth();
        const current = auth.currentUser?.uid;
        if (current) {
            setUid(current);
            return;
        }
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user?.uid) setUid((prev) => prev || user.uid);
        });
        return () => unsub();
    }, [uid]);

    return uid;
}
