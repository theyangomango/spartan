import React, { memo, useState } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import FastImage from "react-native-fast-image";
import RNBounceable from "@freakycoder/react-native-bounceable";

const PostPreview = ({ item, large, onPress }) => {
    const [loading, setLoading] = useState(true);

    return (
        <RNBounceable
            style={[styles.imageContainer, large && styles.large]}
            onPress={onPress}
        >
            <FastImage
                style={styles.image}
                source={{
                    uri: item.images[0],
                    priority: FastImage.priority.high,
                    cache: FastImage.cacheControl.immutable,
                }}
                resizeMode={FastImage.resizeMode.cover}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
            >
                {loading && (
                    <View style={StyleSheet.absoluteFill}>
                        <ActivityIndicator size="small" color="#999" />
                    </View>
                )}
            </FastImage>
        </RNBounceable>
    );
}

export default memo(PostPreview);


const styles = StyleSheet.create({
    imageContainer: {
        flex: 1,
        aspectRatio: 1,
        margin: 1.5,
        overflow: "hidden",
    },
    large: {
        // If you want any special styling for "large" previews, add it here
    },
    image: {
        flex: 1,
        borderRadius: 10,
    },
});
