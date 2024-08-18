import React, { memo, useEffect, useRef, useState } from "react";
import { StyleSheet, View, Animated, Pressable, Dimensions, Image } from "react-native";
import Gallery, { GalleryRef } from 'react-native-awesome-gallery';
import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";

const screenWidth = Dimensions.get('window').width;
const aspectRatio = 0.8; // Original aspect ratio for the image container

const Post = (({ data, onPressCommentButton, onPressShareButton, index, focusedPostIndex, handlePressPost, isPostsVisible, toViewProfile }) => {
    const pfp = data.pfp;
    const images = data.images;
    const [position, setPosition] = useState(0);
    const opacity = useRef(new Animated.Value(1)).current;
    const scaleValue = useRef(new Animated.Value(1)).current;
    const viewRef = useRef(null);
    const galleryRef = useRef(null); // Create a reference to the Gallery component

    useEffect(() => {
        if (isPostsVisible) {
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else if (!isPostsVisible && index !== focusedPostIndex.current) {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isPostsVisible]);

    const handlePressLeft = () => {
        if (position > 0) {
            const newPosition = position - 1;
            setPosition(newPosition);
            galleryRef.current?.setIndex(newPosition, true); // Update the Gallery index
        }
    };

    const handlePressRight = () => {
        if (position < data.images.length - 1) {
            const newPosition = position + 1;
            setPosition(newPosition);
            galleryRef.current?.setIndex(newPosition, true); // Update the Gallery index
        }
    };

    const handleMiddlePressIn = () => {
        Animated.spring(scaleValue, {
            toValue: 1.05,
            useNativeDriver: true,
        }).start();
    };

    const handleMiddlePressOut = () => {
        Animated.spring(scaleValue, {
            toValue: 1,
            friction: 100,
            useNativeDriver: true,
        }).start();
    };

    const handlePress = (event) => {
        const { locationX } = event.nativeEvent;

        if (images.length == 1) {
            handleMiddlePressIn(); // Start the press-in animation
            if (focusedPostIndex.current === index) {
                // Handle post press when it's already focused
            } else if (focusedPostIndex.current === -1) {
                viewRef.current.measure((x, y, width, height, pageX, pageY) => {
                    handlePressPost(index, pageY);
                });
            }

            setTimeout(handleMiddlePressOut, 100); // Start the press-out animation after a short delay
            return;
        }

        if (locationX <= 75) {
            handlePressLeft();
        } else if (locationX >= screenWidth - 75) {
            handlePressRight();
        } else {
            handleMiddlePressIn(); // Start the press-in animation
            if (focusedPostIndex.current === index) {
                // Handle post press when it's already focused
            } else if (focusedPostIndex.current === -1) {
                viewRef.current.measure((x, y, width, height, pageX, pageY) => {
                    handlePressPost(index, pageY);
                });
            }

            setTimeout(handleMiddlePressOut, 100); // Start the press-out animation after a short delay
        }
    };

    // Conditional styles for bottom border radius
    const containerStyle = [
        styles.gallery,
        focusedPostIndex.current === index && !isPostsVisible && {
            borderBottomLeftRadius: 35,
            borderBottomRightRadius: 35,
        },
    ];

    const imageStyle = [
        styles.image,
        focusedPostIndex.current === index && !isPostsVisible && {
            borderBottomLeftRadius: 35,
            borderBottomRightRadius: 35,
        },
    ];

    return (
        <Animated.View ref={viewRef} style={[styles.wrapper, { opacity }]} pointerEvents={!isPostsVisible && (index !== focusedPostIndex) && false}>
            <Pressable onPress={handlePress}>
                <Animated.View
                    style={[
                        styles.main_ctnr,
                        focusedPostIndex.current === index && { zIndex: 1 },
                        { transform: [{ scale: scaleValue }] } // Apply bounce effect
                    ]}
                >
                    <View style={styles.body_ctnr}>
                        <Gallery
                            ref={galleryRef} // Attach the reference
                            data={images}
                            onIndexChange={setPosition}
                            style={containerStyle}
                            containerDimensions={{ width: screenWidth, height: screenWidth / aspectRatio }} // Set container dimensions
                            renderItem={({ item }) => (
                                <View style={styles.imageWrapper}>
                                    <Image
                                        source={{ uri: item }}
                                        style={imageStyle}
                                        resizeMode="cover"
                                    />
                                </View>
                            )}
                            pinchEnabled={false}
                            swipeEnabled={false}
                            doubleTapEnabled={false}
                            emptySpaceWidth={0}
                        />
                    </View>
                    <PostHeader data={data} url={pfp} position={position} totalImages={images.length} toViewProfile={() => toViewProfile(index)}/>
                    <PostFooter
                        data={data}
                        onPressCommentButton={() => onPressCommentButton(index)}
                        onPressShareButton={() => onPressShareButton(index)}
                        image={pfp}
                        isPostsVisible={isPostsVisible}
                    />
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
});

export default memo(Post);

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
    },
    main_ctnr: {
        width: '100%',
        borderColor: '#ddd',
        marginBottom: -33,
    },
    body_ctnr: {
        width: '100%',
        height: screenWidth / aspectRatio, // Calculate height based on the aspect ratio
    },
    gallery: {
        width: '100%',
        height: '100%', // Ensure it covers the entire container's height
        borderTopRightRadius: 35,
        borderTopLeftRadius: 35,
        backgroundColor: '#fff'
    },
    imageWrapper: {
        width: '100%',
        height: '100%',
    },
    image: {
        width: '100%',
        height: '100%',
        borderTopRightRadius: 35,
        borderTopLeftRadius: 35,
        overflow: 'hidden', // Ensure rounded corners are applied to the gallery
    },
});
