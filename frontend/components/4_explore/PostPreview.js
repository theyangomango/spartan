import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function PostPreview({ item, toPostList }) {
    const [aspectRatio, setAspectRatio] = useState(1);

    useEffect(() => {
        Image.getSize(item.images[0], (width, height) => {
            // setAspectRatio(width / height);
            // setAspectRatio(1);
            Math.random() < 0.7 ? setAspectRatio(1) : setAspectRatio(0.5);
        });
    }, [item.images]);

    return (
        <RNBounceable onPress={toPostList} style={[styles.image_ctnr, { aspectRatio }]}>
            <Image source={{ uri: item.images[0] }} style={styles.image} />
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    image_ctnr: {
        flex: 1,
        flexDirection: 'column',
        margin: 2, // Adjust spacing between images
        // backgroundColor: 'red', // This is just to visualize the container, remove if not needed
        overflow: 'hidden',
    },
    image: {
        flex: 1,
        borderRadius: 15,
        resizeMode: 'cover', // Ensures the image covers the specified area without distortion
    },
});
