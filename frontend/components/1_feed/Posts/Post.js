/**
 * Displays a Post.
 * Contains a PostHeader, PostFooter, and a Gallery for images
 * * Does NOT handle backend calls from user interactions
 */

import React, { memo, useEffect, useRef, useState } from "react";
import { StyleSheet, View, Animated, Pressable, Dimensions } from "react-native";
import Gallery from "react-native-awesome-gallery";
import FastImage from "react-native-fast-image";  // <-- Import FastImage here

import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Post Dimensions
const POST_ASPECT_RATIO = 0.8;
const BORDER_RADIUS = 35;
const SWIPE_EDGE_THRESHOLD = 75;

// Animation
const FADE_DURATION = 200;
const BOUNCE_SCALE_IN = 1.05;
const BOUNCE_SCALE_OUT = 1;
const BOUNCE_FRICTION = 100;

const Post = ({
    data,
    openCommentsModal,
    openShareModal,
    index,
    isFocused,
    handleFocusPost,
    isSomePostFocused,
    toViewProfile,
    openViewWorkoutModal
}) => {
    const { pfp, images } = data;
    const [position, setPosition] = useState(0);
    const opacity = useRef(new Animated.Value(1)).current;
    const scaleValue = useRef(new Animated.Value(1)).current;
    const viewRef = useRef(null);
    const galleryRef = useRef(null);

    // Fade out this post if another post is focused
    useEffect(() => {
        Animated.timing(opacity, {
            toValue: !isSomePostFocused ? 1 : isFocused ? 1 : 0,
            duration: FADE_DURATION,
            useNativeDriver: true,
        }).start();
    }, [isSomePostFocused]);

    const handlePressLeft = () => {
        if (position > 0) {
            const newPos = position - 1;
            setPosition(newPos);
            galleryRef.current?.setIndex(newPos, true);
        }
    };

    const handlePressRight = () => {
        if (position < images.length - 1) {
            const newPos = position + 1;
            setPosition(newPos);
            galleryRef.current?.setIndex(newPos, true);
        }
    };

    const handleMiddlePressInAnim = () =>
        Animated.spring(scaleValue, {
            toValue: BOUNCE_SCALE_IN,
            useNativeDriver: true
        }).start();

    const handleMiddlePressOutAnim = () =>
        Animated.spring(scaleValue, {
            toValue: BOUNCE_SCALE_OUT,
            friction: BOUNCE_FRICTION,
            useNativeDriver: true
        }).start();

    const pressPostMiddle = async () => {
        handleMiddlePressInAnim();
        setTimeout(handleMiddlePressOutAnim, 100);

        if (!isFocused) {
            viewRef.current.measure((_, __, ___, ____, _____, pageY) => handleFocusPost(index, pageY));
        }
    };

    // Manage left/right press (swipe) or middle press (focus post)
    const handlePress = (event) => {
        const { locationX } = event.nativeEvent;
        if (images.length > 1) {
            if (locationX <= SWIPE_EDGE_THRESHOLD) handlePressLeft();
            else if (locationX >= SCREEN_WIDTH - SWIPE_EDGE_THRESHOLD) handlePressRight();
            else pressPostMiddle();
        } else {
            pressPostMiddle();
        }
    };

    // Styles that depend on whether this post is focused
    const containerStyle = [
        styles.gallery,
        isFocused && isSomePostFocused && {
            borderBottomLeftRadius: BORDER_RADIUS,
            borderBottomRightRadius: BORDER_RADIUS,
        }
    ];
    const imageStyle = [
        styles.image,
        isFocused && isSomePostFocused && {
            borderBottomLeftRadius: BORDER_RADIUS,
            borderBottomRightRadius: BORDER_RADIUS,
        }
    ];

    return (
        <Animated.View
            ref={viewRef}
            style={[styles.wrapper, { opacity }]}
            pointerEvents={isSomePostFocused && !isFocused ? "none" : "auto"}
        >
            <Pressable onPress={handlePress}>
                <Animated.View
                    style={[
                        styles.main_ctnr,
                        isFocused && { zIndex: 1 },
                        { transform: [{ scale: scaleValue }] }
                    ]}
                >
                    <View style={styles.body_ctnr}>
                        <Gallery
                            ref={galleryRef}
                            data={images}
                            onIndexChange={setPosition}
                            style={containerStyle}
                            containerDimensions={{
                                width: SCREEN_WIDTH,
                                height: SCREEN_WIDTH / POST_ASPECT_RATIO,
                            }}
                            renderItem={({ item }) => (
                                <View style={styles.imageWrapper}>
                                    <FastImage
                                        source={{
                                            uri: item,
                                            priority: FastImage.priority.normal,
                                            cache: FastImage.cacheControl.immutable,
                                        }}
                                        style={imageStyle}
                                        resizeMode={FastImage.resizeMode.cover}
                                    />
                                </View>
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
                        position={position}
                        totalImages={images.length}
                        toViewProfile={() => toViewProfile(index)}
                        openViewWorkout={() => openViewWorkoutModal(index)}
                    />
                    <PostFooter
                        data={data}
                        onPressCommentButton={() => {
                            if (!isSomePostFocused) pressPostMiddle();
                            if (isFocused) openCommentsModal(index);
                        }}
                        onPressShareButton={() => {
                            if (!isSomePostFocused) pressPostMiddle();
                            if (isFocused) openShareModal(index);
                        }}
                        image={pfp}
                        isSomePostFocused={isSomePostFocused}
                    />
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
};

export default memo(Post);

const styles = StyleSheet.create({
    wrapper: {
        width: "100%"
    },
    main_ctnr: {
        width: "100%",
        borderColor: "#ddd",
        marginBottom: -33
    },
    body_ctnr: {
        width: "100%",
        height: SCREEN_WIDTH / POST_ASPECT_RATIO
    },
    gallery: {
        width: "100%",
        height: "100%",
        borderTopRightRadius: BORDER_RADIUS,
        borderTopLeftRadius: BORDER_RADIUS,
        backgroundColor: "#fff"
    },
    imageWrapper: {
        width: "100%",
        height: "100%"
    },
    image: {
        width: "100%",
        height: "100%",
        borderTopRightRadius: BORDER_RADIUS,
        borderTopLeftRadius: BORDER_RADIUS,
        overflow: "hidden"
    }
});
