// hooks/useLiveFollowing.js
import { useEffect, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../../firebase.config";

const toMillis = (v) => {
    if (typeof v === "number") return v;
    if (v instanceof Date) return v.getTime();
    if (v?.toMillis) return v.toMillis();
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
};

export default function useLiveFollowing(user) {
    const [liveUsers, setLiveUsers] = useState([]); // [{uid, pfp, pfpVersion, isLive:true, _ts:number}]

    useEffect(() => {
        const following = (() => {
            if (Array.isArray(user?.following)) return user.following;
            if (Array.isArray(user?.friends)) return user.friends.map((f) => f?.uid).filter(Boolean);
            if (user?.followingMap && typeof user.followingMap === "object") return Object.keys(user.followingMap);
            return [];
        })();

        if (!following || following.length === 0) {
            setLiveUsers([]);
            return;
        }

        let mounted = true;
        const unsubMap = new Map();

        const upsert = (uid, entryOrNull) => {
            setLiveUsers((prev) => {
                const next = prev.filter((x) => x.uid !== uid);
                if (entryOrNull) next.push(entryOrNull);
                next.sort((a, b) => (b._ts || 0) - (a._ts || 0));
                return next;
            });
        };

        following.forEach((f) => {
            const fuid = typeof f === "string" ? f : f?.uid;
            if (!fuid) return;
            try {
                const unsub = onSnapshot(doc(db, "usersPublic", String(fuid)), (snap) => {
                    if (!mounted) return;
                    const data = snap.data() || {};
                    const cw = data.currentWorkout || null;
                    if (cw) {
                        const ts = toMillis(cw.created ?? cw.createdAt);
                        upsert(String(fuid), {
                            uid: String(fuid),
                            pfp: data.pfp || data.photoURL || data.image || data.avatar || "",
                            pfpVersion: data.pfpVersion || 0,
                            isLive: true,
                            currentWorkout: true,
                            _ts: ts || Date.now(),
                        });
                    } else {
                        upsert(String(fuid), null);
                    }
                });
                unsubMap.set(String(fuid), unsub);
            } catch {
                /* ignore */
            }
        });

        return () => {
            mounted = false;
            unsubMap.forEach((u) => u && u());
            unsubMap.clear();
        };
    }, [user?.following, user?.friends, user?.followingMap]);

    return liveUsers;
}
