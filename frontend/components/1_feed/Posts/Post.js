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
} from "react-native";
import FastImage from "react-native-fast-image";
import Video from "react-native-video";
import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";

const { width: W } = Dimensions.get("window");
const AR = 0.8;
const BORDER = 35;

const FADE_MS = 80;
const B_IN = 1.02;
const B_OUT = 1;
const B_FRICTION = 60;

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
    handleFocusPost,
    openCommentsModal,
    openShareModal,
    toViewProfile,
    openViewWorkoutModal,
    shouldPlay, // when NO post is focused: true if this post is centered
}) {
    const { pfp } = data;
    // Normalize media for backward compatibility where posts stored `images: string[]`
    const mediaList = useMemo(() => {
        if (Array.isArray(data?.media)) return data.media;
        if (Array.isArray(data?.images)) return data.images.map((u) => ({ uri: u, type: 'image' }));
        return [];
    }, [data?.media, data?.images]);
    const opacity = useRef(new Animated.Value(1)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const viewRef = useRef(null);
    const flatListRef = useRef(null);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [pausedList, setPausedList] = useState(mediaList.map(() => false));

    // Fade when another post is focused
    useEffect(() => {
        Animated.timing(opacity, {
            toValue: !isSomePostFocused || isFocused ? 1 : 0,
            duration: FADE_MS,
            useNativeDriver: true,
        }).start();
    }, [isSomePostFocused, isFocused]);

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
    const focusMe = useCallback(() => {
        if (!isFocused && viewRef.current && viewRef.current.measure) {
            viewRef.current.measure((_, __, ___, ____, _____, pageY) =>
                handleFocusPost(index, pageY)
            );
        }
    }, [isFocused, handleFocusPost, index]);

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

    return (
        <Animated.View
            ref={viewRef}
            style={[styles.wrapper, { opacity }]}
            pointerEvents={isSomePostFocused && !isFocused ? "none" : "auto"}
        >
            <Animated.View
                style={[styles.card, isFocused && { zIndex: 1 }, { transform: [{ scale }] }]}
            >
                <View style={styles.body}>
                    <FlatList
                        ref={flatListRef}
                        data={mediaList}
                        horizontal
                        pagingEnabled
                        bounces={false}
                        overScrollMode="never"
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
            </Animated.View>
        </Animated.View>
    );
}

const areEqual = (prev, next) =>
    prev.isFocused === next.isFocused &&
    prev.isSomePostFocused === next.isSomePostFocused &&
    prev.data === next.data &&
    prev.shouldPlay === next.shouldPlay;

export default React.memo(Post, areEqual);

const styles = StyleSheet.create({
    wrapper: { width: "100%" },
    card: { width: "100%", borderColor: "#ddd", marginBottom: -33 },
    body: { width: W, height: W / AR },
    gallery: {
        width: W,
        height: W / AR,
        borderTopLeftRadius: BORDER,
        borderTopRightRadius: BORDER,
        backgroundColor: "#fff",
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
