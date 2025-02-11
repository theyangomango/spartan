// PostPreview.js
import React from "react";
import { StyleSheet } from "react-native";
import FastImage from 'react-native-fast-image';
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function PostPreview({ postData, onPress }) {
    const image = postData.images[0];

    return (
        <RNBounceable style={styles.main_ctnr} onPress={onPress}>
            <FastImage
                source={{ uri: image }}
                style={styles.image}
                resizeMode={FastImage.resizeMode.cover}
            />
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        margin: 2,
    },
    image: {
        flex: 1,
        borderRadius: 10,
        aspectRatio: 1
    }
});
