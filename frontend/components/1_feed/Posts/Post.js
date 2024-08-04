import React, { memo, useEffect, useRef } from "react";
import { StyleSheet, View, Animated } from "react-native";
import FastImage from 'react-native-fast-image';
import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";
import RNBounceable from "@freakycoder/react-native-bounceable";

const Post = (({ data, onPressCommentButton, onPressShareButton, index, focusedPostIndex, handlePressPost, isPostsVisible }) => {
    console.log('render');

    const pfp = data.pfp;
    const image = data.images[0];
    const opacity = useRef(new Animated.Value(1)).current;
    const viewRef = useRef(null);

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

    const handlePress = () => {
        if (focusedPostIndex.current === index) {
            // Handle post press when it's already focused
        } else if (focusedPostIndex.current === -1) {
            viewRef.current.measure((x, y, width, height, pageX, pageY) => {
                handlePressPost(index, pageY);
            });
        }
    };

    return (
        <Animated.View ref={viewRef} style={[styles.wrapper, { opacity }]}>
            <RNBounceable
                bounceEffectIn={1.02}
                style={[
                    styles.main_ctnr,
                    focusedPostIndex.current === index && { zIndex: 1 }
                ]}
                onPress={handlePress}
            >
                <View style={styles.body_ctnr}>
                    <View style={styles.image_ctnr}>
                        <FastImage
                            source={{ uri: image }}
                            style={[styles.image, !isPostsVisible && focusedPostIndex.current === index && { borderRadius: 35 }]}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    </View>
                </View>
                <PostHeader data={data} url={pfp} />
                <PostFooter
                    data={data}
                    onPressCommentButton={() => onPressCommentButton(index)}
                    onPressShareButton={() => onPressShareButton(index)}
                    image={pfp}
                    isPostsVisible={isPostsVisible}
                />
            </RNBounceable>
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
        flex: 1,
    },
    image_ctnr: {
        aspectRatio: 0.8,
    },
    image: {
        flex: 1,
        borderTopRightRadius: 35,
        borderTopLeftRadius: 35,
    },
    caption: {
        marginBottom: 7,
        paddingHorizontal: 2,
    },
    caption_text: {
        lineHeight: 20,
    },
    caption_handle: {
        fontFamily: 'Lato_700Bold',
        fontSize: 12,
    },
    caption_content: {
        fontFamily: 'Lato_400Regular',
        fontSize: 11.5,
        color: '#777',
    },
    top_blurview: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: 100,
        right: 0,
    },
});
