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
    Image,
} from "react-native";
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedStyle } from 'react-native-reanimated';
import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";
import FeedFocusContext from "../../../screens/feed/hooks/FeedFocusContext";
import PostMediaCarousel from "./PostMediaCarousel";
import * as ImageManipulator from 'expo-image-manipulator';
import ImageColors from 'react-native-image-colors';

const { width: W } = Dimensions.get("window");
const AR = 0.8;
const BORDER = 35;

const B_IN = 1.02;
const B_OUT = 1;
const B_FRICTION = 60;

// Fractional rectangle (normalized 0..1) covering the header handle text region.
const HEADER_RECT_LEFT = 0.19;
const HEADER_RECT_TOP = 0.045;
const HEADER_RECT_HEIGHT = 0.048;
const HEADER_RECT_MIN_WIDTH = 0.22;
const HEADER_RECT_MAX_WIDTH = 0.5;
const HEADER_RECT_CHAR_WIDTH = 0.018;
const HEADER_LIGHTNESS_THRESHOLD = 0.6;
const HEADER_PATCH_RESIZE_TARGET = 200;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const makeHeaderToneKey = (uri, rect) => {
    if (!uri || !rect) return null;
    const { left, top, width, height } = rect;
    return `${uri}|${left.toFixed(3)}|${top.toFixed(3)}|${width.toFixed(3)}|${height.toFixed(3)}`;
};

const computeHeaderRectNormalized = (handle) => {
    const length = Math.max(0, (handle || '').length);
    const width = clamp(
        HEADER_RECT_MIN_WIDTH + HEADER_RECT_CHAR_WIDTH * length,
        HEADER_RECT_MIN_WIDTH,
        HEADER_RECT_MAX_WIDTH,
    );
    return {
        left: HEADER_RECT_LEFT,
        top: HEADER_RECT_TOP,
        width,
        height: HEADER_RECT_HEIGHT,
    };
};

const getImageDimensions = (uri) => new Promise((resolve, reject) => {
    if (!uri) {
        reject(new Error('Missing URI'));
        return;
    }
    Image.getSize(uri,
        (width, height) => {
            if (width && height) resolve({ width, height });
            else reject(new Error('Invalid image dimensions'));
        },
        (err) => reject(err || new Error('Failed to get image size')),
    );
});

const computeHeaderCropRect = (imgWidth, imgHeight, rect) => {
    if (!rect) return null;

    if (!imgWidth || !imgHeight) return null;

    const containerWidth = W;
    const containerHeight = W / AR;

    const rectLeft = rect.left * containerWidth;
    const rectTop = rect.top * containerHeight;
    const rectWidth = rect.width * containerWidth;
    const rectHeight = rect.height * containerHeight;

    const scale = Math.max(containerWidth / imgWidth, containerHeight / imgHeight);
    if (!isFinite(scale) || scale <= 0) return null;

    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;

    const offsetX = (scaledWidth - containerWidth) / 2;
    const offsetY = (scaledHeight - containerHeight) / 2;

    const leftScaled = clamp(rectLeft + offsetX, 0, scaledWidth);
    const topScaled = clamp(rectTop + offsetY, 0, scaledHeight);
    const rightScaled = clamp(leftScaled + rectWidth, leftScaled, scaledWidth);
    const bottomScaled = clamp(topScaled + rectHeight, topScaled, scaledHeight);

    const cropWidthScaled = Math.max(1, rightScaled - leftScaled);
    const cropHeightScaled = Math.max(1, bottomScaled - topScaled);

    const originX = Math.floor(leftScaled / scale);
    const originY = Math.floor(topScaled / scale);
    const width = Math.max(1, Math.round(cropWidthScaled / scale));
    const height = Math.max(1, Math.round(cropHeightScaled / scale));

    if (originX >= imgWidth || originY >= imgHeight) return null;

    const safeOriginX = clamp(originX, 0, imgWidth - 1);
    const safeOriginY = clamp(originY, 0, imgHeight - 1);
    const maxWidth = Math.max(1, imgWidth - safeOriginX);
    const maxHeight = Math.max(1, imgHeight - safeOriginY);

    return {
        originX: safeOriginX,
        originY: safeOriginY,
        width: clamp(width, 1, maxWidth),
        height: clamp(height, 1, maxHeight),
    };
};

const extractUsableColor = (colors) => {
    if (!colors) return null;
    const candidates = [
        colors.background,
        colors.dominant,
        colors.average,
        colors.detail,
        colors.primary,
        colors.secondary,
        colors.vibrant,
        colors.lightVibrant,
        colors.darkVibrant,
        colors.muted,
        colors.lightMuted,
        colors.darkMuted,
    ];
    for (const value of candidates) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    if (typeof colors.fallback === 'string' && colors.fallback.trim()) {
        return colors.fallback.trim();
    }
    return null;
};

const parseColorString = (input) => {
    if (!input || typeof input !== 'string') return null;
    const color = input.trim();
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        const expanded = (() => {
            if (hex.length === 3) return hex.split('').map((c) => `${c}${c}`).join('');
            if (hex.length === 4) return hex.slice(0, 3).split('').map((c) => `${c}${c}`).join('');
            if (hex.length === 6 || hex.length === 8) return hex.slice(0, 6);
            return null;
        })();
        if (!expanded || expanded.length !== 6) return null;
        const r = parseInt(expanded.slice(0, 2), 16);
        const g = parseInt(expanded.slice(2, 4), 16);
        const b = parseInt(expanded.slice(4, 6), 16);
        if ([r, g, b].some((v) => Number.isNaN(v))) return null;
        return { r, g, b };
    }

    const match = color.match(/rgba?\(([^)]+)\)/i);
    if (match && match[1]) {
        const parts = match[1].split(',').map((v) => Number(v.trim())).filter((v, idx) => idx < 3);
        if (parts.length === 3 && parts.every((v) => Number.isFinite(v))) {
            const [r, g, b] = parts.map((v) => clamp(Math.round(v), 0, 255));
            return { r, g, b };
        }
    }

    return null;
};

const srgbToLinear = (v) => {
    const c = v / 255;
    if (c <= 0.04045) return c / 12.92;
    return Math.pow((c + 0.055) / 1.055, 2.4);
};

const computeLuminance = ({ r, g, b }) => (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
);

// Crop the media to the handle rectangle, downscale it, and estimate whether it's light enough
// to require dark text for readability.
const analyzeHeaderPatchLightness = async (uri, rect) => {
    const { width, height } = await getImageDimensions(uri);
    const crop = computeHeaderCropRect(width, height, rect);
    if (!crop) return false;

    const operations = [{ crop }];
    if (crop.width > HEADER_PATCH_RESIZE_TARGET) {
        operations.push({ resize: { width: HEADER_PATCH_RESIZE_TARGET } });
    }

    const result = await ImageManipulator.manipulateAsync(
        uri,
        operations,
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    const colors = await ImageColors.getColors(result?.uri || uri, {
        fallback: '#000000',
        cache: true,
        key: `post-header-${makeHeaderToneKey(result?.uri || uri, rect)}`,
    });

    const colorString = extractUsableColor(colors);
    const rgb = parseColorString(colorString);
    if (!rgb) {
        return false;
    }
    const luminance = computeLuminance(rgb);
    return luminance >= HEADER_LIGHTNESS_THRESHOLD;
};

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
    const overlaySwipeActiveRef = useRef(false);
    const footerRef = useRef(null);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLightHeader, setIsLightHeader] = useState(false);

    const headerToneCacheRef = useRef(new Map());
    const headerTonePendingRef = useRef(new Map());

    const currentMedia = mediaList[currentIndex] || null;
    const currentMediaUri = typeof currentMedia?.uri === 'string'
        ? currentMedia.uri
        : (typeof currentMedia?.url === 'string' ? currentMedia.url : null);
    const currentMediaType = typeof currentMedia?.type === 'string'
        ? currentMedia.type.toLowerCase()
        : 'image';

    const headerRect = useMemo(() => computeHeaderRectNormalized(data?.handle), [data?.handle]);
    const resolveHeaderTone = useCallback(async (uri, rect) => {
        const key = makeHeaderToneKey(uri, rect);
        if (!key) return false;
        const cache = headerToneCacheRef.current;
        if (cache.has(key)) {
            return cache.get(key);
        }

        const pending = headerTonePendingRef.current;
        if (pending.has(key)) {
            return pending.get(key);
        }

        const promise = analyzeHeaderPatchLightness(uri, rect)
            .then((value) => {
                cache.set(key, value);
                pending.delete(key);
                return value;
            })
            .catch(() => {
                pending.delete(key);
                cache.set(key, false);
                return false;
            });

        pending.set(key, promise);
        return promise;
    }, []);

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

    const handleOverlaySwipeBegin = useCallback(() => {
        if (!resolvedIsFocused) {
            overlaySwipeActiveRef.current = false;
            return;
        }
        const handled = carouselRef.current?.hSwipeBegin?.() ?? false;
        overlaySwipeActiveRef.current = handled;
    }, [resolvedIsFocused]);

    const handleOverlaySwipeUpdate = useCallback((dx) => {
        if (!overlaySwipeActiveRef.current) return;
        carouselRef.current?.hSwipeUpdate?.(dx);
    }, []);

    const handleOverlaySwipeEnd = useCallback((dx, vx) => {
        if (!overlaySwipeActiveRef.current) return;
        overlaySwipeActiveRef.current = false;
        carouselRef.current?.hSwipeEnd?.(dx, vx);
    }, []);

    const handleOverlaySwipeFinalize = useCallback(() => {
        if (!overlaySwipeActiveRef.current) return;
        overlaySwipeActiveRef.current = false;
        carouselRef.current?.hSwipeEnd?.(0, 0);
    }, []);

    const focusedSwipeGesture = useMemo(() => (
        Gesture.Pan()
            .enabled(!!resolvedIsFocused)
            .minPointers(1)
            .maxPointers(1)
            .activeOffsetX([-6, 6])
            .failOffsetY([-8, 8])
            .simultaneousWithExternalGesture(Gesture.Native())
            .onBegin(() => { runOnJS(handleOverlaySwipeBegin)(); })
            .onUpdate((event) => { runOnJS(handleOverlaySwipeUpdate)(event.translationX); })
            .onEnd((event) => { runOnJS(handleOverlaySwipeEnd)(event.translationX, event.velocityX); })
            .onFinalize(() => { runOnJS(handleOverlaySwipeFinalize)(); })
    ), [
        handleOverlaySwipeBegin,
        handleOverlaySwipeEnd,
        handleOverlaySwipeFinalize,
        handleOverlaySwipeUpdate,
        resolvedIsFocused,
    ]);

    // Recompute header tone whenever the visible media changes.
    useEffect(() => {
        if (!currentMediaUri || (currentMediaType && currentMediaType !== 'image') || !headerRect) {
            setIsLightHeader(false);
            return;
        }

        const cacheKey = makeHeaderToneKey(currentMediaUri, headerRect);
        if (!cacheKey) {
            setIsLightHeader(false);
            return;
        }

        const cachedValue = headerToneCacheRef.current.get(cacheKey);
        if (typeof cachedValue === 'boolean') {
            setIsLightHeader(cachedValue);
            return;
        }

        let cancelled = false;
        setIsLightHeader(false);
        resolveHeaderTone(currentMediaUri, headerRect)
            .then((value) => {
                if (!cancelled) setIsLightHeader(!!value);
            })
            .catch(() => {
                if (!cancelled) setIsLightHeader(false);
            });

        return () => {
            cancelled = true;
        };
    }, [currentMediaUri, currentMediaType, resolveHeaderTone, headerRect]);

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
            <GestureDetector gesture={focusedSwipeGesture}>
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
                        isLightHeader={isLightHeader}
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
            </GestureDetector>
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
