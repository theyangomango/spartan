import React from "react";
import { StyleSheet, View } from "react-native";
import FastImage from 'react-native-fast-image';
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function PostPreview({ item, toPostList, large }) {
    return (
        <RNBounceable
            // ! Disabled for Beta
            // onPress={toPostList} 
            style={[styles.image_ctnr, large && styles.large]}
        >
            <FastImage
                style={styles.image}
                source={{ uri: item.images[0] }}
                resizeMode={FastImage.resizeMode.cover}
            />
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    image_ctnr: {
        flex: 1,
        aspectRatio: 1,
        margin: 2, // Adjust spacing between images
        overflow: 'hidden',
        opacity: 0.5
    },
    large: {
        flex: 1,
        aspectRatio: 1,
    },
    image: {
        flex: 1,
        borderRadius: 10,
    },
});
