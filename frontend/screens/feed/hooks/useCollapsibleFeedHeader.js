// Collapsible Feed header: show/hide animation, pointer events and measured height.
import { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

import scaleSize from "../../../helper/scaleSize";

const MIN_HEADER_MEASURE = scaleSize(24);

export default function useCollapsibleFeedHeader() {
    const headerVisibility = useRef(new Animated.Value(1)).current;
    const [headerPointerEvents, setHeaderPointerEvents] = useState("auto");
    const [headerMeasuredHeight, setHeaderMeasuredHeight] = useState(0);
    const isHeaderHiddenRef = useRef(false);
    const isAnimatingHeaderRef = useRef(false);

    const animateHeaderVisibility = useCallback(
        (toValue) => {
            if (isAnimatingHeaderRef.current) {
                headerVisibility.stopAnimation?.();
            }
            isAnimatingHeaderRef.current = true;
            if (toValue === 1) {
                setHeaderPointerEvents("auto");
            }
            Animated.timing(headerVisibility, {
                toValue,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start(() => {
                isAnimatingHeaderRef.current = false;
                if (toValue === 0) {
                    setHeaderPointerEvents("none");
                }
            });
        },
        [headerVisibility]
    );

    const showHeader = useCallback(() => {
        if (!isHeaderHiddenRef.current) return;
        isHeaderHiddenRef.current = false;
        animateHeaderVisibility(1);
    }, [animateHeaderVisibility]);

    const hideHeader = useCallback(() => {
        if (isHeaderHiddenRef.current) return;
        isHeaderHiddenRef.current = true;
        animateHeaderVisibility(0);
    }, [animateHeaderVisibility]);

    const handleHeaderLayout = useCallback(
        (event) => {
            const height = event?.nativeEvent?.layout?.height || 0;
            if (
                (headerMeasuredHeight === 0 && height > 0) ||
                (height > MIN_HEADER_MEASURE && Math.abs(height - headerMeasuredHeight) > 1)
            ) {
                setHeaderMeasuredHeight(height);
            }
        },
        [headerMeasuredHeight]
    );

    const headerHeightForAnimation = headerMeasuredHeight > 0 ? headerMeasuredHeight : scaleSize(88);

    const headerAnimatedStyle = useMemo(
        () => ({
            opacity: headerVisibility,
            marginBottom: headerVisibility.interpolate({
                inputRange: [0, 1],
                outputRange: [-headerHeightForAnimation, scaleSize(2)],
            }),
            transform: [
                {
                    translateY: headerVisibility.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-(headerHeightForAnimation + scaleSize(12)), 0],
                    }),
                },
            ],
        }),
        [headerHeightForAnimation, headerVisibility]
    );

    return {
        headerAnimatedStyle,
        headerPointerEvents,
        handleHeaderLayout,
        showHeader,
        hideHeader,
    };
}
