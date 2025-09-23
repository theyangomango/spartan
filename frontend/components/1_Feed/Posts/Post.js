import React, {
    useRef,
    useState,
    useEffect,
    useMemo,
    useCallback,
    forwardRef,
    useImperativeHandle,
    useContext,
} from "react";
import {
    StyleSheet,
    View,
    Animated,
    Dimensions,
    Easing,
} from "react-native";
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";
import FeedFocusContext from "../../../screens/feed/hooks/FeedFocusContext";
import PostMediaCarousel from "./PostMediaCarousel";

const { width: W } = Dimensions.get("window");
const AR = 0.8;
const BORDER = 35;

const B_IN = 1.02;
const B_OUT = 1;
const B_FRICTION = 60;

const Post = forwardRef(function Post({
    data,
    index,
    isFocused,
    isSomePostFocused,
    // Reanimated shared values from Feed for focus/unfocus
    focusModeSV,
    interactiveUnfocusSV,
    // Profile/ViewProfile: force rounded bottom corners when focused, even without shared values
    forceRoundedBottomOnFocus,
    // Profile/ViewProfile: fade the post in when it becomes focused
    fadeInOnFocus,
    handleFocusPost,
    openCommentsModal,
    openShareModal,
    toViewProfile,
    openViewWorkoutModal,
    shouldPlay, // when NO post is focused: true if this post is centered
    // highlight when navigating from notifications
    highlightPid,
    highlightSignal,
    programFocusPid,
    programFocusSignal,
}, ref) {
    const { pfp } = data;
    const {
        isSomePostFocused: ctxIsSomePostFocused = false,
        focusedIndex: ctxFocusedIndex = -1,
        focusModeSV: ctxFocusModeSV = null,
        interactiveUnfocusSV: ctxInteractiveUnfocusSV = null,
        unfocusGestureActive: ctxUnfocusGestureActive = false,
        handleFocusPost: ctxHandleFocusPost = () => {},
    } = useContext(FeedFocusContext) || {};

    const resolvedIsSomePostFocused = isSomePostFocused ?? ctxIsSomePostFocused;
    const resolvedIsFocused = isFocused ?? (resolvedIsSomePostFocused && ctxFocusedIndex === index);
    const resolvedFocusModeSV = focusModeSV ?? ctxFocusModeSV;
    const resolvedInteractiveUnfocusSV = interactiveUnfocusSV ?? ctxInteractiveUnfocusSV;
    const resolvedHandleFocusPost = handleFocusPost ?? ctxHandleFocusPost;
    // Normalize media for backward compatibility where posts stored `images: string[]`
    const mediaList = useMemo(() => {
        if (Array.isArray(data?.media)) return data.media;
        if (Array.isArray(data?.images)) return data.images.map((u) => ({ uri: u, type: 'image' }));
        return [];
    }, [data?.media, data?.images]);
    const highlightOpacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const viewRef = useRef(null);
    const carouselRef = useRef(null);
    const footerRef = useRef(null);

    const [currentIndex, setCurrentIndex] = useState(0);

    // Animate bottom corners during unfocus: BORDER -> 0 as interactiveUnfocusSV goes 0 -> 1
    const roundedBottomStyle = useAnimatedStyle(() => {
        try {
            const inFocus = (resolvedFocusModeSV?.value === 1) || !!forceRoundedBottomOnFocus;
            if (inFocus && resolvedIsFocused) {
                let r = BORDER;
                if (resolvedInteractiveUnfocusSV && typeof resolvedInteractiveUnfocusSV.value === 'number') {
                    const p = Math.max(0, Math.min(1, resolvedInteractiveUnfocusSV?.value || 0));
                    r = BORDER * (1 - p);
                }
                return { borderBottomLeftRadius: r, borderBottomRightRadius: r };
            }
        } catch {}
        return { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 };
    }, [resolvedIsFocused, forceRoundedBottomOnFocus, resolvedFocusModeSV, resolvedInteractiveUnfocusSV]);

    // Focus fade-in for Profile/ViewProfile flows when requested
    const focusFadeOpacity = useRef(new Animated.Value(1)).current;
    const wasFocusedRef = useRef(resolvedIsFocused);
    useEffect(() => {
        if (!fadeInOnFocus) return;
        // Trigger fade only when transitioning into focused state
        if (resolvedIsFocused && !wasFocusedRef.current) {
            try { focusFadeOpacity.stopAnimation(); } catch {}
            focusFadeOpacity.setValue(0);
            Animated.timing(focusFadeOpacity, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        } else if (!resolvedIsFocused) {
            // ensure fully opaque when not focused
            try { focusFadeOpacity.setValue(1); } catch {}
        }
        wasFocusedRef.current = resolvedIsFocused;
    }, [resolvedIsFocused, fadeInOnFocus]);

    // Flash highlight when this post matches target pid and signal updates
    useEffect(() => {
        const match = highlightPid && String(data?.pid || '') === String(highlightPid);
        if (!match || !highlightSignal) return;
        try { highlightOpacity.stopAnimation(); } catch {}
        highlightOpacity.setValue(0);
        Animated.sequence([
            Animated.timing(highlightOpacity, { toValue: 0.22, duration: 180, useNativeDriver: true }),
            Animated.timing(highlightOpacity, { toValue: 0, duration: 420, useNativeDriver: true }),
        ]).start();
    }, [highlightSignal, highlightPid, data?.pid]);

    // Programmatic focus (simulate user tap) when matching pid.
    // React exactly once per unique programFocusSignal to avoid re-triggering
    // after unfocus toggles isSomePostFocused back to false.
    const lastProgramFocusHandledRef = useRef(null);
    useEffect(() => {
        const should = programFocusPid && String(programFocusPid) === String(data?.pid || '');
        const sig = programFocusSignal;
        if (!should) return;
        // Only handle a new signal once
        if (lastProgramFocusHandledRef.current === sig) return;
        // If something is currently focused, skip this cycle; a new signal will be issued if needed
        if (resolvedIsSomePostFocused) return;
        lastProgramFocusHandledRef.current = sig;
        const id = setTimeout(() => {
            try { focusMe(true); } catch {}
        }, 20);
        return () => clearTimeout(id);
    }, [programFocusSignal, programFocusPid, resolvedIsSomePostFocused, data?.pid]);

    // Bounce animation (kept if you use it elsewhere)
    const bounce = useCallback(() => {
        Animated.sequence([
            Animated.spring(scale, {
                toValue: B_IN,
                useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: B_OUT,
                friction: B_FRICTION,
                useNativeDriver: true,
            }),
        ]).start();
    }, [scale]);

    // Focus handler
    const focusMe = useCallback((preferWaitForHeader = false) => {
        if (resolvedIsFocused) return;
        const node = viewRef.current;
        if (!node) return;

        const handleMeasure = (pageY) => {
            if (typeof pageY === 'number') {
                resolvedHandleFocusPost(index, pageY, preferWaitForHeader);
            } else {
                resolvedHandleFocusPost(index, undefined, preferWaitForHeader);
            }
        };

        if (node.measureInWindow) {
            node.measureInWindow((_, y) => handleMeasure(y));
            return;
        }
        if (node.measure) {
            node.measure((_, __, ___, ____, _____, pageY) => handleMeasure(pageY));
        }
    }, [resolvedIsFocused, resolvedHandleFocusPost, index]);

    const handleIndexChange = useCallback((nextIndex) => {
        setCurrentIndex((prev) => (prev === nextIndex ? prev : nextIndex));
    }, []);

    const handleFooterTapFromOverlay = useCallback((absoluteX, absoluteY) => {
        if (!footerRef.current?.handleTapAt) return;
        footerRef.current.handleTapAt(absoluteX, absoluteY);
    }, []);

    // Imperative horizontal pan control from Feed-level gesture
    useImperativeHandle(ref, () => ({
        hSwipeBegin: () => (carouselRef.current?.hSwipeBegin?.() ?? false),
        hSwipeUpdate: (dx) => { carouselRef.current?.hSwipeUpdate?.(dx); },
        hSwipeEnd: (dx, vx) => { carouselRef.current?.hSwipeEnd?.(dx, vx); },
        measureScreenTop: () => new Promise((resolve) => {
            try {
                if (viewRef.current?.measureInWindow) {
                    viewRef.current.measureInWindow((_, y) => resolve(typeof y === 'number' ? y : null));
                    return;
                }
                if (viewRef.current?.measure) {
                    viewRef.current.measure((_, __, ___, ____, _____, pageY) => resolve(typeof pageY === 'number' ? pageY : null));
                    return;
                }
            } catch {}
            resolve(null);
        }),
        measureScreenFrame: () => new Promise((resolve) => {
            try {
                if (viewRef.current?.measureInWindow) {
                    viewRef.current.measureInWindow((_, y, __, height) => {
                        if (typeof y === 'number' && typeof height === 'number') {
                            resolve({ top: y, height, bottom: y + height });
                        } else {
                            resolve(null);
                        }
                    });
                    return;
                }
                if (viewRef.current?.measure) {
                    viewRef.current.measure((_, __, ___, height, _____, pageY) => {
                        if (typeof pageY === 'number' && typeof height === 'number') {
                            resolve({ top: pageY, height, bottom: pageY + height });
                        } else {
                            resolve(null);
                        }
                    });
                    return;
                }
            } catch {}
            resolve(null);
        }),
        handleFooterTap: handleFooterTapFromOverlay,
    }), [carouselRef, viewRef, handleFooterTapFromOverlay]);

    // (external swipe state removed; handled via imperative hSwipe* methods)

    // During interactive unfocus (bottom->top pan), gradually fade other posts into view.
    // We override the RN Animated opacity only while a post is focused and this post is NOT the focused one.
    const interactiveFadeStyle = useAnimatedStyle(() => {
        try {
            const inFocusMode = resolvedFocusModeSV?.value === 1;
            if (inFocusMode && !resolvedIsFocused) {
                const p = Math.max(0, Math.min(1, resolvedInteractiveUnfocusSV?.value || 0));
                return { opacity: p };
            }
        } catch {}
        return {};
    }, [resolvedIsFocused, resolvedFocusModeSV, resolvedInteractiveUnfocusSV]);

    // useEffect(() => {
    //     console.log(resolvedIsFocused, resolvedIsSomePostFocused, index);
    // }, [resolvedIsFocused, resolvedIsSomePostFocused])

    return (
        <Reanimated.View
            ref={viewRef}
            style={[styles.wrapper, interactiveFadeStyle]}
            // When a different post is focused, completely disable pointer events
            // on this post so it can’t intercept gestures.
            pointerEvents={(resolvedIsSomePostFocused && !resolvedIsFocused) ? "none" : "auto"}
        >
            <Animated.View
                style={[
                    styles.card,
                    resolvedIsFocused && { zIndex: 10 },
                    { transform: [{ scale }] },
                    fadeInOnFocus ? { opacity: focusFadeOpacity } : null,
                ]}
            >
                <View style={styles.body}>
                    <Reanimated.View style={[styles.gallery, roundedBottomStyle, { overflow: 'hidden' }]}>
                        <PostMediaCarousel
                            ref={carouselRef}
                            mediaList={mediaList}
                            currentIndex={currentIndex}
                            onIndexChange={handleIndexChange}
                            isFocused={resolvedIsFocused}
                            isAnyPostFocused={resolvedIsSomePostFocused}
                            shouldPlay={shouldPlay}
                            onRequestFocus={focusMe}
                            galleryStyle={{ width: '100%', height: '100%' }}
                            imageStyle={styles.image}
                        />
                    </Reanimated.View>
                </View>

                <PostHeader
                    data={data}
                    url={pfp}
                    position={currentIndex}
                    totalImages={mediaList.length}
                    toViewProfile={() => toViewProfile(index)}
                    openViewWorkout={() => openViewWorkoutModal(index)}
                />
                <PostFooter
                    ref={footerRef}
                    data={data}
                    image={pfp}
                    isSomePostFocused={resolvedIsSomePostFocused}
                    isUnfocusing={resolvedIsFocused ? ctxUnfocusGestureActive : false}
                    focusModeSV={resolvedFocusModeSV}
                    interactiveUnfocusSV={resolvedInteractiveUnfocusSV}
                    onPressCommentButton={() => {
                        if (!resolvedIsSomePostFocused) focusMe(true);
                        if (resolvedIsFocused) openCommentsModal(index);
                    }}
                    onPressShareButton={() => {
                        if (!resolvedIsSomePostFocused) focusMe(true);
                        if (resolvedIsFocused) openShareModal(index);
                    }}
                />

                {/* highlight overlay above content */}
                <Animated.View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { borderRadius: BORDER, backgroundColor: '#FFF4B3', opacity: highlightOpacity }]}
                />
            </Animated.View>
        </Reanimated.View>
    );
});

const areEqual = (prev, next) =>
    prev.isFocused === next.isFocused &&
    prev.isSomePostFocused === next.isSomePostFocused &&
    prev.data === next.data &&
    prev.shouldPlay === next.shouldPlay &&
    prev.highlightPid === next.highlightPid &&
    prev.highlightSignal === next.highlightSignal &&
    prev.programFocusPid === next.programFocusPid &&
    prev.programFocusSignal === next.programFocusSignal;

export default React.memo(Post, areEqual);

const styles = StyleSheet.create({
    wrapper: { width: "100%" },
    card: { width: "100%", borderColor: "rgba(255,255,255,0.06)", marginBottom: -33 },
    body: { width: W, height: W / AR },
    gallery: {
        width: W,
        height: W / AR,
        borderTopLeftRadius: BORDER,
        borderTopRightRadius: BORDER,
        backgroundColor: require('../../../theme/mfpDark').default.surface,
    },
    image: {
        width: W,
        height: W / AR,
        borderTopLeftRadius: BORDER,
        borderTopRightRadius: BORDER,
        overflow: "hidden",
    },
});
