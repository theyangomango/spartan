// hooks/useUserDoc.js
import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";

/**
 * Subscribes to users/{uid}, returns {user} and also writes into global.userData.
 * No deep deps on global.* so we avoid update loops.
 */
export default function useUserDoc(uid, options = {}) {
    const { ignoreKeys = [] } = options || {};
    const [user, setUser] = useState(null);
    const prevRef = useRef(null);

    const stripKeys = (obj, keys) => {
        if (!obj || typeof obj !== "object") return obj;
        if (!Array.isArray(keys) || keys.length === 0) return obj;
        const out = {};
        for (const k of Object.keys(obj)) {
            if (!keys.includes(k)) out[k] = obj[k];
        }
        return out;
    };

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
            // keep global in sync for legacy consumers (full object)
            global.userData = { ...(global.userData || {}), ...data, uid, id: uid };

            // apply ignoreKeys to reduce needless rerenders in interested screens
            const cmp = stripKeys(data, ignoreKeys);

            // shallow compare against previous
            const prev = prevRef.current;
            let changed = false;
            if (!prev) changed = true;
            else {
                const aKeys = Object.keys(cmp);
                const bKeys = Object.keys(prev);
                if (aKeys.length !== bKeys.length) changed = true;
                else {
                    for (const k of aKeys) {
                        if (prev[k] !== cmp[k]) { changed = true; break; }
                    }
                }
            }
            if (changed) {
                prevRef.current = cmp;
                setUser(cmp);
            }
        });
        return () => unsub();
    }, [uid, ignoreKeys.join("|")]);

    return user; // may be null during first paint
}
