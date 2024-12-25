import React, { useState } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import FastImage from 'react-native-fast-image';
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function PostPreview({ item, large }) {
    const [loading, setLoading] = useState(true);

    return (
        <RNBounceable style={[styles.image_ctnr, large && styles.large]}>
            <FastImage
                style={styles.image}
                source={{
                    uri: item.images[0],
                    priority: FastImage.priority.high,       // High priority
                    cache: FastImage.cacheControl.immutable, // Cache strategy
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

const styles = StyleSheet.create({
    image_ctnr: {
        flex: 1,
        aspectRatio: 1,
        margin: 2,
        overflow: 'hidden',
        // Consider removing or modifying opacity if you want clarity
        opacity: 0.5,
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
