import { useEffect, useMemo, useRef } from "react";
import { useSafeAreaInsets, initialWindowMetrics } from "react-native-safe-area-context";

/**
 * Returns safe area insets that do not momentarily report zero on first render.
 * Falls back to the window metrics captured at launch and gradually adopts
 * larger inset values (e.g. after orientation changes).
 */
export default function useStableSafeAreaInsets() {
    const rawInsets = useSafeAreaInsets();
    const fallbackRef = useRef({
        top: initialWindowMetrics?.insets?.top || 0,
        bottom: initialWindowMetrics?.insets?.bottom || 0,
        left: initialWindowMetrics?.insets?.left || 0,
        right: initialWindowMetrics?.insets?.right || 0,
    });

    useEffect(() => {
        fallbackRef.current = {
            top: Math.max(fallbackRef.current.top, rawInsets.top || 0),
            bottom: Math.max(fallbackRef.current.bottom, rawInsets.bottom || 0),
            left: Math.max(fallbackRef.current.left, rawInsets.left || 0),
            right: Math.max(fallbackRef.current.right, rawInsets.right || 0),
        };
    }, [rawInsets.bottom, rawInsets.left, rawInsets.right, rawInsets.top]);

    return useMemo(() => ({
        top: rawInsets.top || fallbackRef.current.top || 0,
        bottom: rawInsets.bottom || fallbackRef.current.bottom || 0,
        left: rawInsets.left || fallbackRef.current.left || 0,
        right: rawInsets.right || fallbackRef.current.right || 0,
    }), [rawInsets.bottom, rawInsets.left, rawInsets.right, rawInsets.top]);
}
