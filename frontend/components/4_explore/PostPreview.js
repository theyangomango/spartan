import React from "react";
import { Image, StyleSheet, View } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function PostPreview({ item, toPostList, large }) {
    return (
        <RNBounceable onPress={toPostList} style={[styles.image_ctnr, large && styles.large]}>
            <Image source={{ uri: item.images[0] }} style={styles.image} />
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    image_ctnr: {
        flex: 1,
        aspectRatio: 1,
        margin: 2, // Adjust spacing between images
        overflow: 'hidden',
    },
    large: {
        flex: 1,
        aspectRatio: 1,
    },
    image: {
        flex: 1,
        borderRadius: 10,
        resizeMode: 'cover', // Ensures the image covers the specified area without distortion
    },
});
