import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import { normalizeUserRef } from "../utils/userRefs";

const DOC_COLLECTION = "global";
const DOC_ID = "suggestedUsers";

const mapEntry = (entry) => {
    const normalized = normalizeUserRef(entry);
    if (!normalized) return null;

    const rawVersion = Number(entry?.pfpVersion ?? entry?.photoVersion ?? 0);
    const pfpVersion = Number.isFinite(rawVersion) ? rawVersion : 0;
    const resolvedPfp = entry?.pfp || entry?.photoURL || normalized.pfp || "";

    return {
        ...normalized,
        pfp: resolvedPfp,
        photoURL: entry?.photoURL || resolvedPfp,
        pfpVersion,
        isVerified: Boolean(entry?.isVerified ?? entry?.verified),
        tagline: entry?.tagline || "",
        bio: entry?.bio || "",
        location: entry?.location || "",
    };
};

/**
 * Subscribes to the curated suggested-users document so the list can be updated
 * server-side (Firestore console, admin panel, etc.) without shipping an app update.
 * Expected schema:
 * global/suggestedUsers => { list: [{ uid, handle, name, pfp, ... }] }
 */
export default function useSuggestedUsersList() {
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const ref = doc(db, DOC_COLLECTION, DOC_ID);
        const unsubscribe = onSnapshot(
            ref,
            (snapshot) => {
                setIsLoaded(true);
                const data = snapshot.data() || {};
                const rawList = Array.isArray(data?.list)
                    ? data.list
                    : Array.isArray(data?.users)
                        ? data.users
                        : [];
                const mapped = rawList.map(mapEntry).filter(Boolean);
                setSuggestedUsers(mapped);
            },
            () => {
                setIsLoaded(true);
                setSuggestedUsers([]);
            }
        );
        return () => {
            try { unsubscribe(); } catch { }
        };
    }, []);

    return { suggestedUsers, isLoaded };
}
