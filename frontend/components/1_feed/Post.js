import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import CachedImage from 'expo-cached-image';
import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";

export default function Post({ data, onPressCommentButton, onPressShareButton, index }) {
    const pfp = data.pfp;
    const image = data.images[0];

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.body_ctnr}>
                <View style={styles.image_ctnr}>
                    <CachedImage
                        source={{ uri: image }}
                        cacheKey={data.pid} // Use a unique cache key for each image
                        style={styles.image}
                    />
                </View>
            </View>
            <PostHeader data={data} url={pfp} />
            <PostFooter data={data} onPressCommentButton={() => onPressCommentButton(index)} onPressShareButton={() => onPressShareButton(index)} image={pfp} />
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        borderColor: '#DDD',
        marginBottom: 25,
        backgroundColor: '#fff', // Added background color for better visibility
        borderRadius: 30,
    },
    body_ctnr: {
        flex: 1,
    },
    image_ctnr: {
        aspectRatio: 0.8
    },
    image: {
        flex: 1,
        borderRadius: 40,
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
