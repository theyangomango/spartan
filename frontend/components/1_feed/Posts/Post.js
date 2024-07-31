import React, { useEffect, useRef } from "react";
import { Image, StyleSheet, View, Animated } from "react-native";
import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function Post({ data, onPressCommentButton, onPressShareButton, index, focusedPostIndex, handlePressPost, isPostsVisible }) {
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
        } else if (!isPostsVisible && index != focusedPostIndex.current) {
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [isPostsVisible]);

    const handlePress = () => {
        if (focusedPostIndex.current === index) {

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
                    focusedPostIndex.current == index && { zIndex: 1 }
                ]}
                onPress={handlePress}
            >
                <View style={styles.body_ctnr}>
                    <View style={styles.image_ctnr}>
                        <Image
                            source={{ uri: image }}
                            cacheKey={data.pid} // Use a unique cache key for each image
                            style={[styles.image, !isPostsVisible && focusedPostIndex.current == index && { borderRadius: 35 }]}
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
}

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
        aspectRatio: 0.8
    },
    image: {
        flex: 1,
        borderTopRightRadius: 35,
        borderTopLeftRadius: 35
    },
    caption: {
        marginBottom: 7,
        paddingHorizontal: 2,
    },
    caption_text: {
        lineHeight: 20
    },
    caption_handle: {
        fontFamily: 'Lato_700Bold',
        fontSize: 12,
    },
    caption_content: {
        fontFamily: 'Lato_400Regular',
        fontSize: 11.5,
        color: '#777'
    },
    top_blurview: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: 100,
        right: 0
    }
});
