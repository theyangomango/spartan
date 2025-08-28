// hooks/useUserDoc.js
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";

/**
 * Subscribes to users/{uid}, returns {user} and also writes into global.userData.
 * No deep deps on global.* so we avoid update loops.
 */
export default function useUserDoc(uid) {
    const [user, setUser] = useState(null);

    // pre-seed global with uid so other code that reads global has it immediately
    useEffect(() => {
        if (uid) {
            global.userData = { ...(global.userData || {}), uid, id: uid };
        }
    }, [uid]);

    useEffect(() => {
        if (!uid) return;
        const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
            const data = snap.data() || {};
            setUser(data);
            // keep global in sync for legacy consumers
            global.userData = { ...(global.userData || {}), ...data, uid, id: uid };
        });
        return () => unsub();
    }, [uid]);

    return user; // may be null during first paint
}
