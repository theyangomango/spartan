import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";

const VERIFIED_CACHE = new Map();
const INFLIGHT_PROMISES = new Map();

const normalizeUid = (uid) => {
    if (!uid) return "";
    const str = String(uid).trim();
    return str;
};

const coerceBoolean = (value, fallback = false) => {
    if (typeof value === "boolean") return value;
    if (value == null) return fallback;
    return Boolean(value);
};

export default function useUserVerified(uid, fallback) {
    const normalizedUid = useMemo(() => normalizeUid(uid), [uid]);
    const fallbackBool = useMemo(() => coerceBoolean(fallback, false), [fallback]);

    const [isVerified, setIsVerified] = useState(() => {
        if (!normalizedUid) return false;
        if (VERIFIED_CACHE.has(normalizedUid)) return VERIFIED_CACHE.get(normalizedUid);
        return fallbackBool;
    });

    useEffect(() => {
        if (!normalizedUid) {
            setIsVerified(false);
            return;
        }

        const cached = VERIFIED_CACHE.get(normalizedUid);
        if (typeof cached === "boolean") {
            setIsVerified(cached);
            return;
        }

        if (fallbackBool !== undefined) {
            setIsVerified(fallbackBool);
        }

        const updateState = (value) => {
            VERIFIED_CACHE.set(normalizedUid, value);
            setIsVerified(value);
        };

        let cancelled = false;
        const resolver = (value) => {
            if (!cancelled) updateState(value);
        };

        const request = INFLIGHT_PROMISES.get(normalizedUid);
        if (request) {
            request.then(resolver).catch(() => {});
            return () => { cancelled = true; };
        }

        const promise = getDoc(doc(db, "users", normalizedUid))
            .then((snap) => {
                const data = snap?.data?.() ?? snap?.data();
                return coerceBoolean(data?.isVerified ?? data?.verified, false);
            })
            .catch(() => fallbackBool)
            .finally(() => {
                INFLIGHT_PROMISES.delete(normalizedUid);
            });

        INFLIGHT_PROMISES.set(normalizedUid, promise);
        promise.then(resolver).catch(() => {});

        return () => { cancelled = true; };
    }, [normalizedUid, fallbackBool]);

    return isVerified;
}
