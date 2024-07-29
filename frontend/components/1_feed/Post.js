import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function Post({ data, onPressCommentButton, onPressShareButton, index, focusedPostIndex, handlePressPost }) {
    const pfp = data.pfp;
    const image = data.images[0];

    return (
        <RNBounceable bounceEffectIn={1.02} style={[styles.main_ctnr, focusedPostIndex == index && { zIndex: 1 }]} onPress={() => handlePressPost(index)}>
            <View style={styles.body_ctnr}>
                <View style={styles.image_ctnr}>
                    <Image
                        source={{ uri: image }}
                        cacheKey={data.pid} // Use a unique cache key for each image
                        style={[styles.image, focusedPostIndex == index && { borderRadius: 35 }]}
                    />
                </View>
            </View>
            <PostHeader data={data} url={pfp} />
            <PostFooter data={data} onPressCommentButton={() => onPressCommentButton(index)} onPressShareButton={() => onPressShareButton(index)} image={pfp} />
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        borderColor: '#ddd',
        // marginBottom: 10,
        marginBottom: -33,
        // backgroundColor: '#fff', // Added background color for better visibility

    },
    body_ctnr: {
        flex: 1,
    },
    image_ctnr: {
        aspectRatio: 0.75
    },
    image: {
        flex: 1,
        // borderRadius: 40,
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
