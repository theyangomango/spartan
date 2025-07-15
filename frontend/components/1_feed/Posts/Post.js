/**
 * Post (perf-tuned)
 * - Header, footer, image gallery
 * - Minimal re-renders while scrolling
 */
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
    Dimensions,
} from "react-native";
import Gallery from "react-native-awesome-gallery";
import FastImage from "react-native-fast-image";

import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";

const { width: W } = Dimensions.get("window");
const AR = 0.8;
const BORDER = 35;
const EDGE = 75;

/* animation consts */
const FADE_MS = 80;
const B_IN = 1.02;
const B_OUT = 1;
const B_FRICTION = 60;

/* ---- one-time render component for each image ---- */
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
}) {
    const { pfp, images } = data;

    console.log('Post ' + index + ' render');

    /* local state & refs */
    const [pos, setPos] = useState(0);
    const opacity = useRef(new Animated.Value(1)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const viewRef = useRef(null);
    const galleryRef = useRef(null);

    /* ------------ fade when other post is focused ------------ */
    useEffect(() => {
        Animated.timing(opacity, {
            toValue: !isSomePostFocused || isFocused ? 1 : 0,
            duration: FADE_MS,
            useNativeDriver: true,
        }).start();
    }, [isSomePostFocused, isFocused]);

    /* ------------ style memo (prevents new objects) ------------ */
    const [containerStyle, imageStyle] = useMemo(() => {
        const clipStyle =
            isFocused && isSomePostFocused
                ? {
                    borderBottomLeftRadius: BORDER,
                    borderBottomRightRadius: BORDER,
                }
                : undefined;

        return [
            [styles.gallery, clipStyle],
            [styles.image, clipStyle],
        ];
    }, [isFocused, isSomePostFocused]);

    /* ------------ animation helpers ------------ */
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

    /* ------------ center-tap handler ------------ */
    const focusMe = useCallback(() => {
        bounce();
        if (!isFocused) {
            viewRef.current.measure((_, __, ___, ____, _____, pageY) =>
                handleFocusPost(index, pageY)
            );
        }
    }, [bounce, isFocused, handleFocusPost, index]);

    /* ------------ onPress dispatcher ------------ */
    const onPress = useCallback(
        e => {
            const x = e.nativeEvent.locationX;
            if (images.length > 1) {
                if (x < EDGE && pos > 0) {
                    const p = pos - 1;
                    setPos(p);
                    galleryRef.current?.setIndex(p, true);
                } else if (x > W - EDGE && pos < images.length - 1) {
                    const p = pos + 1;
                    setPos(p);
                    galleryRef.current?.setIndex(p, true);
                } else {
                    focusMe();
                }
            } else {
                focusMe();
            }
        },
        [pos, images.length, focusMe]
    );

    /* ------------ render ------------ */
    return (
        <Animated.View
            ref={viewRef}
            style={[styles.wrapper, { opacity }]}
            pointerEvents={isSomePostFocused && !isFocused ? "none" : "auto"}
        >
            <Pressable onPress={onPress}>
                <Animated.View
                    style={[
                        styles.card,
                        isFocused && { zIndex: 1 },
                        { transform: [{ scale }] },
                    ]}
                >
                    <View style={styles.body}>
                        <Gallery
                            ref={galleryRef}
                            data={images}
                            onIndexChange={setPos}
                            containerDimensions={{ width: W, height: W / AR }}
                            style={containerStyle}
                            renderItem={({ item }) => (
                                <ImageSlide uri={item} style={imageStyle} />
                            )}
                            pinchEnabled={false}
                            swipeEnabled={false}
                            doubleTapEnabled={false}
                            emptySpaceWidth={0}
                        />
                    </View>

                    <PostHeader
                        data={data}
                        url={pfp}
                        position={pos}
                        totalImages={images.length}
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
            </Pressable>
        </Animated.View>
    );
}

/* ------------ custom comparison: only re-render when necessary ------------ */
const areEqual = (prev, next) =>
    prev.isFocused === next.isFocused &&
    prev.isSomePostFocused === next.isSomePostFocused &&
    prev.data === next.data; // feed keeps data objects immutable

export default React.memo(Post, areEqual);

/* ------------ styles ------------ */
const styles = StyleSheet.create({
    wrapper: { width: "100%" },
    card: { width: "100%", borderColor: "#ddd", marginBottom: -33 },
    body: { width: "100%", height: W / AR },
    gallery: {
        width: "100%",
        height: "100%",
        borderTopLeftRadius: BORDER,
        borderTopRightRadius: BORDER,
        backgroundColor: "#fff",
    },
    imageWrapper: { width: "100%", height: "100%" },
    image: {
        width: "100%",
        height: "100%",
        borderTopLeftRadius: BORDER,
        borderTopRightRadius: BORDER,
        overflow: "hidden",
    },
});
