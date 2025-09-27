// usePfp.js (JS)
import { useEffect, useState } from "react";
import { getPfpUrl } from "../pfpCache"; // ← adjust path

/**
 * Resolve the photo URL for a user.
 * - `fallbackUri` lets callers seed the hook with an immediate image (e.g. Google auth photo)
 *   so brand-new users see an avatar before Storage finishes syncing a cached copy.
 * - When the Firebase storage asset exists, it will override the fallback.
 */
export function usePfp(uid, version = 0, fallbackUri) {
    const normalisedFallback = fallbackUri ? String(fallbackUri) : null;
    const [uri, setUri] = useState(normalisedFallback);

    // Keep state in sync if the provided fallback changes (e.g. post payload refreshed)
    useEffect(() => {
        setUri(normalisedFallback);
    }, [normalisedFallback]);

    useEffect(() => {
        if (!uid) {
            setUri(normalisedFallback);
            return () => { };
        }

        let alive = true;
        (async () => {
            try {
                const resolved = await getPfpUrl(uid, version);
                if (alive) setUri(resolved);
            } catch (e) {
                if (alive) setUri(normalisedFallback);
            }
        })();

        return () => {
            alive = false;
        };
    }, [uid, version, normalisedFallback]);

    return uri;
}
