import { useEffect, useState } from 'react';
import { ensureAuthBackgroundAsync, getAuthBackgroundSource } from '../utils/authBackground';

const markReady = () => {
    try {
        if (typeof global.__markAuthBackgroundReady === 'function') {
            global.__markAuthBackgroundReady();
        }
    } catch {}
};

const useAuthBackgroundSource = () => {
    const [source, setSource] = useState(() => getAuthBackgroundSource());

    useEffect(() => {
        let cancelled = false;
        ensureAuthBackgroundAsync()
            .then(() => {
                if (!cancelled) {
                    setSource(getAuthBackgroundSource());
                }
                markReady();
            })
            .catch(() => {
                if (!cancelled) {
                    setSource(getAuthBackgroundSource());
                }
                markReady();
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return source;
};

export default useAuthBackgroundSource;
