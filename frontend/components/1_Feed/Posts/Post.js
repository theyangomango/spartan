import React, {
    useRef,
    useState,
    useEffect,
    useMemo,
    useCallback,
} from "react";
import {
    StyleSheet,
    View,
    Animated,
    Pressable,
    FlatList,
    Dimensions,
    PanResponder,
    Easing,
} from "react-native";
import * as Haptics from 'expo-haptics';
import FastImage from "react-native-fast-image";
import Video from "react-native-video";
import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";

const { width: W } = Dimensions.get("window");
const AR = 0.8;
const BORDER = 35;

const FADE_MS = 140;
const B_IN = 1.02;
const B_OUT = 1;
const B_FRICTION = 60;
// Debug logger (always logs)
const dlog = (...args) => { try { console.log('[Post]', ...args); } catch { } };

const ImageSlide = React.memo(({ uri, style }) => (
    <View style={styles.imageWrapper}>
        <FastImage
            source={{
                uri,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable,
            }}
            style={style}
            resizeMode={FastImage.resizeMode.cover}
        />
    </View>
));

/** 🔊 Audio fix: ignoreSilentSwitch + explicit volume */
const VideoSlide = React.memo(({ uri, style, paused, isActive }) => (
    <View style={styles.imageWrapper}>
        <Video
            source={typeof uri === "string" && uri.startsWith("http") ? { uri } : uri}
            style={style}
            resizeMode="cover"
            paused={!isActive || paused}
            repeat
            muted={false}
            volume={1.0}
            /** iOS: play sound even if hardware mute is on */
            ignoreSilentSwitch="ignore"
            /** Keep background/inactive behavior as before */
            playInBackground={false}
            playWhenInactive={false}
            controls={false}
        />
    </View>
));

function Post({
    data,
    index,
    isFocused,
    isSomePostFocused,
    isAdjacentToFocused,
    isUnfocusing,
    handleFocusPost,
    onSwipeUnfocus,
    focusSeq,
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
}) {
    const { pfp } = data;
    // Normalize media for backward compatibility where posts stored `images: string[]`
    const mediaList = useMemo(() => {
        if (Array.isArray(data?.media)) return data.media;
        if (Array.isArray(data?.images)) return data.images.map((u) => ({ uri: u, type: 'image' }));
        return [];
    }, [data?.media, data?.images]);
    const opacity = useRef(new Animated.Value(1)).current;
    const highlightOpacity = useRef(new Animated.Value(0)).current;
    const swipeFlashOpacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const viewRef = useRef(null);
    const flatListRef = useRef(null);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [pausedList, setPausedList] = useState(mediaList.map(() => false));

    // Fade behavior: when focusing, keep focused=1, neighbors faded, others hidden
    useEffect(() => {
        let target = 1;
        if (isSomePostFocused && !isUnfocusing) {
            if (isFocused) target = 1;
            else if (isAdjacentToFocused) target = 0.28;
            else target = 0;
        } else {
            target = 1;
        }
        Animated.timing(opacity, {
            toValue: target,
            duration: FADE_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [isSomePostFocused, isFocused, isAdjacentToFocused, isUnfocusing]);

    // Memo styles
    const [containerStyle, imageStyle] = useMemo(() => {
        const clipStyle =
            isFocused && isSomePostFocused
                ? {
                    borderBottomLeftRadius: BORDER,
                    borderBottomRightRadius: BORDER,
                }
                : undefined;

        return [[styles.gallery, clipStyle], [styles.image, clipStyle]];
    }, [isFocused, isSomePostFocused]);

    // Flash highlight when this post matches target pid and signal updates
    useEffect(() => {
        const match = highlightPid && String(data?.pid || '') === String(highlightPid);
        if (!match || !highlightSignal) return;
        try { highlightOpacity.stopAnimation(); } catch { }
        highlightOpacity.setValue(0);
        Animated.sequence([
            Animated.timing(highlightOpacity, { toValue: 0.22, duration: 180, useNativeDriver: true }),
            Animated.timing(highlightOpacity, { toValue: 0, duration: 420, useNativeDriver: true }),
        ]).start();
    }, [highlightSignal, highlightPid, data?.pid]);

    // Programmatic focus (simulate user tap) when matching pid
    useEffect(() => {
        const should = programFocusPid && String(programFocusPid) === String(data?.pid || '');
        if (!should || isSomePostFocused) return;
        const id = setTimeout(() => {
            try { focusMe(true); } catch { }
        }, 20);
        return () => clearTimeout(id);
    }, [programFocusSignal, programFocusPid, isSomePostFocused, data?.pid]);

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
        if (!isFocused && viewRef.current && viewRef.current.measure) {
            viewRef.current.measure((_, __, ___, ____, _____, pageY) =>
                handleFocusPost(index, pageY, preferWaitForHeader, data?.pid)
            );
        }
    }, [isFocused, handleFocusPost, index, data?.pid]);

    // Manual pause toggle (tap)
    const togglePauseAtIndex = useCallback((idx) => {
        setPausedList((prev) => prev.map((v, i) => (i === idx ? !v : v)));
    }, []);

    // Horizontal swipe inside the post
    const onScroll = useCallback(
        (e) => {
            const offsetX = e.nativeEvent.contentOffset.x;
            const i = Math.round(offsetX / W);
            if (i !== currentIndex) setCurrentIndex(i);
        },
        [currentIndex]
    );

    // Keep pausedList length in sync with media length
    useEffect(() => {
        setPausedList((prev) => mediaList.map((_, i) => prev[i] ?? false));
    }, [mediaList.length]);

    const keyExtractor = (item, idx) => (item.uri || "") + idx;

    const getItemLayout = (_, index) => ({
        length: W,
        offset: W * index,
        index,
    });

    const flashSwipeFeedback = useCallback(() => {
        try { Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Heavy).catch(() => { }); } catch { }
        try { swipeFlashOpacity.stopAnimation(); } catch { }
        swipeFlashOpacity.setValue(0);
        Animated.sequence([
            Animated.timing(swipeFlashOpacity, { toValue: 0.16, duration: 90, useNativeDriver: true }),
            Animated.timing(swipeFlashOpacity, { toValue: 0, duration: 130, useNativeDriver: true }),
        ]).start();
    }, [swipeFlashOpacity]);

    // No external slide controller: keep horizontal paging native to FlatList

    // Diagonal swipe-to-dismiss (bottom-left -> top-right). Let FlatList own horizontal.
    const panResponder = useMemo(() => {
        const TAN35 = 0.700; // tan(35deg) — stricter diagonal to avoid stealing horizontal
        const MIN_MOVE = 4;
        const ANGLE_MARGIN = 6; // extra px above the 30° boundary to avoid false captures
        const FOOTER_GUARD = 120; // do not capture starts near footer controls
        return PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: (evt, g) => {
                if (!(isFocused && isSomePostFocused)) return false;
                if (g.numberActiveTouches > 1) return false;
                const { dx, dy } = g;
                const adx = Math.abs(dx), ady = Math.abs(dy);
                // Guard the footer region from capture to keep buttons pressable
                const y = evt?.nativeEvent?.locationY ?? 0;
                if (y > (W / AR - FOOTER_GUARD)) return false;
                // Guard against early jitter: need small but non-trivial movement
                if (adx < MIN_MOVE && ady < MIN_MOVE) return false;
                // Treat within ~35°(+margin) as horizontal: let FlatList handle L→R
                if (ady <= TAN35 * adx + ANGLE_MARGIN) return false;
                // Otherwise, it is diagonal enough for our unfocus gesture
                return dx > 0 && dy < 0;
            },
            // Capture only when the gesture is clearly diagonal (not horizontal)
            onMoveShouldSetPanResponderCapture: (evt, g) => {
                if (!(isFocused && isSomePostFocused)) return false;
                if (g.numberActiveTouches > 1) return false;
                const { dx, dy, vx, vy } = g;
                const adx = Math.abs(dx), ady = Math.abs(dy);
                const y = evt?.nativeEvent?.locationY ?? 0;
                if (y > (W / AR - FOOTER_GUARD)) return false;
                if (adx < MIN_MOVE && ady < MIN_MOVE) return false;
                // Very fast diagonal flicks should capture even near the boundary
                if (dx > 0 && dy < 0 && vx >= 0.5 && vy <= -0.5) return true;
                return dx > 0 && dy < 0 && (ady > TAN35 * adx + ANGLE_MARGIN);
            },
            onPanResponderRelease: (_, g) => {
                const { dx, dy, vx, vy } = g;
                const adx = Math.abs(dx), ady = Math.abs(dy);
                const isDiagonal = (dx > 0 && dy < 0) && (ady > TAN35 * adx + ANGLE_MARGIN);
                const distanceOK = dx > 12 && dy < -12; // slightly lower distance
                const velocityOK = vx >= 0.10 && vy <= -0.10; // allow quicker short flicks
                if (isFocused && isSomePostFocused && isDiagonal && (distanceOK || velocityOK)) {
                    flashSwipeFeedback();
                    dlog('release.unfocus', { index, pid: data?.pid, dx: Math.round(dx), dy: Math.round(dy), vx: vx.toFixed(2), vy: vy.toFixed(2) });
                    try { onSwipeUnfocus && onSwipeUnfocus(); } catch { }
                    return;
                }
                dlog('release.noop', { index, pid: data?.pid, dx: Math.round(dx), dy: Math.round(dy), vx: vx?.toFixed?.(2), vy: vy?.toFixed?.(2) });
            },
            onPanResponderTerminationRequest: () => true,
            onShouldBlockNativeResponder: () => false,
        });
    }, [isFocused, isSomePostFocused, onSwipeUnfocus, flashSwipeFeedback]);

    const mediaListKey = useMemo(() => `${String(data?.pid || index)}-${isFocused ? 'focused' : 'normal'}-${isSomePostFocused ? 1 : 0}-${focusSeq || 0}`, [data?.pid, index, isFocused, isSomePostFocused, focusSeq]);

    return (
        <Animated.View
            key={`postwrap-${mediaListKey}`}
            ref={viewRef}
            style={[styles.wrapper, { opacity }]}
            pointerEvents={isSomePostFocused && !isFocused && !isUnfocusing ? "none" : "auto"}
        >
            <Animated.View
                key={`card-${mediaListKey}`}
                style={[styles.card, isFocused && { zIndex: 1 }, { transform: [{ scale }] }]}
                {...(isFocused ? panResponder.panHandlers : {})}
            >
                <View style={styles.body}>
                    <FlatList
                        key={mediaListKey}
                        ref={flatListRef}
                        data={mediaList}
                        horizontal
                        pagingEnabled
                        bounces={false}
                        overScrollMode="never"
                        directionalLockEnabled
                        removeClippedSubviews={false}
                        snapToInterval={W}
                        decelerationRate="fast"
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={keyExtractor}
                        getItemLayout={getItemLayout}
                        style={containerStyle}
                        renderItem={({ item, index: i }) => {
                            const handlePress = (e) => {
                                const x = e.nativeEvent.locationX;
                                if (x > W * 0.1 && x < W * 0.9) {
                                    // Only handle pause toggle if focused, current, and video
                                    if (isFocused && item.type === "video" && i === currentIndex) {
                                        togglePauseAtIndex(i);
                                    } else if (!isFocused) {
                                        focusMe();
                                    }
                                }
                            };

                            // EXACT RULES:
                            // 1) If a post is focused:
                            //    - play ONLY if this post is focused AND this slide is the current slide AND it's a video.
                            //    - otherwise pause.
                            // 2) If no post is focused:
                            //    - play ONLY if this post is centered (shouldPlay) AND this slide is the current slide AND it's a video.
                            //    - otherwise pause.
                            const isCurrentSlide = i === currentIndex;
                            const allowAutoplay = isSomePostFocused ? isFocused : !!shouldPlay;
                            const meetsRule = allowAutoplay && isCurrentSlide && item.type === "video";
                            const isManuallyPaused = pausedList[i];
                            const actuallyPaused = !meetsRule || isManuallyPaused;

                            if (item.type === "video") {
                                return (
                                    <Pressable onPress={handlePress}>
                                        <VideoSlide
                                            uri={item.uri}
                                            style={imageStyle}
                                            paused={actuallyPaused}
                                            isActive={!actuallyPaused}
                                        />
                                    </Pressable>
                                );
                            }

                            return (
                                <Pressable onPress={handlePress}>
                                    <ImageSlide uri={item.uri} style={imageStyle} />
                                </Pressable>
                            );
                        }}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        initialScrollIndex={currentIndex}
                    />
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
                    data={data}
                    image={pfp}
                    isSomePostFocused={isSomePostFocused}
                    onPressCommentButton={() => {
                        if (!isSomePostFocused) focusMe();
                        if (isFocused) openCommentsModal(index);
                    }}
                    onPressShareButton={() => {
                        if (!isSomePostFocused) focusMe();
                        if (isFocused) openShareModal(index);
                    }}
                />

                {/* Top-level invisible gesture catcher to avoid any dead zones.
                    Sits above media/footer but only activates on diagonal move. */}
                {/* No full-surface overlay; avoid interfering with horizontal swipes */}

                {/* highlight overlay above content */}
                <Animated.View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { borderRadius: BORDER, backgroundColor: '#FFF4B3', opacity: highlightOpacity }]}
                />
                {/* swipe feedback overlay */}
                <Animated.View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, { borderRadius: BORDER, backgroundColor: 'rgba(45,158,255,0.18)', opacity: swipeFlashOpacity }]}
                />
            </Animated.View>
        </Animated.View>
    );
}

const areEqual = (prev, next) =>
    prev.isFocused === next.isFocused &&
    prev.isSomePostFocused === next.isSomePostFocused &&
    prev.isAdjacentToFocused === next.isAdjacentToFocused &&
    prev.data === next.data &&
    prev.shouldPlay === next.shouldPlay &&
    prev.highlightPid === next.highlightPid &&
    prev.highlightSignal === next.highlightSignal &&
    prev.programFocusPid === next.programFocusPid &&
    prev.programFocusSignal === next.programFocusSignal;

export default React.memo(Post, areEqual);

const styles = StyleSheet.create({
    wrapper: { width: "100%" },
    // Keep negative margin for visuals; list cell expands hit-area separately
    card: { width: "100%", borderColor: "rgba(255,255,255,0.06)", marginBottom: -66 },
    body: { width: W, height: W / AR },
    gallery: {
        width: W,
        height: W / AR,
        borderTopLeftRadius: BORDER,
        borderTopRightRadius: BORDER,
        backgroundColor: require('../../../theme/mfpDark').default.surface,
    },
    imageWrapper: { width: W, height: W / AR, overflow: "hidden" },
    image: {
        width: W,
        height: W / AR,
        borderTopLeftRadius: BORDER,
        borderTopRightRadius: BORDER,
        overflow: "hidden",
    },
});
