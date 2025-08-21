// usePfp.js (JS)
import { useEffect, useState } from "react";
import { getPfpUrl } from "../pfpCache"; // ← adjust path

export function usePfp(uid, version = 0) {
    const [uri, setUri] = useState(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const u = await getPfpUrl(uid, version);
                if (alive) setUri(u);
            } catch (e) {
                if (alive) setUri(null);
            }
        })();
        return () => { alive = false; };
    }, [uid, version]);

    return uri;
}
