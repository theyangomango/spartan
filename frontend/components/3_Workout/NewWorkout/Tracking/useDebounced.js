// Debounces a callback (latest function wins) and exposes an immediate flush.
import { useCallback, useEffect, useRef } from "react";

// simple debounce
const useDebounced = (fn, delay = 120) => {
    const fnRef = useRef(fn);
    const tRef = useRef(null);
    useEffect(() => { fnRef.current = fn; }, [fn]);
    const schedule = useCallback((...args) => {
        if (tRef.current) clearTimeout(tRef.current);
        tRef.current = setTimeout(() => fnRef.current(...args), delay);
    }, [delay]);
    const flush = useCallback((...args) => {
        if (tRef.current) clearTimeout(tRef.current);
        fnRef.current(...args);
    }, []);
    useEffect(() => () => { if (tRef.current) clearTimeout(tRef.current); }, []);
    return { schedule, flush };
};

export default useDebounced;
