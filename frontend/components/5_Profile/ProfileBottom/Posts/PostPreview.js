// PostPreview.js
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import FastImage from 'react-native-fast-image';
import { Pressable } from 'react-native';

import scaleSize from "../../../../helper/scaleSize";

export default function PostPreview({ postData, onPress }) {
    const image = postData?.media?.[0]?.uri || null;
    const [loaded, setLoaded] = useState(false);
    const source = useMemo(() => (
        image
            ? { uri: image, priority: FastImage.priority.high, cache: FastImage.cacheControl.immutable }
            : null
    ), [image]);

    return (
        <Pressable
            style={({ pressed }) => [
                styles.main_ctnr,
                pressed ? styles.pressed : null,
            ]}
            // Avoid capturing/deferring the SyntheticEvent to prevent pooling warnings
            onPress={() => { try { onPress && onPress(); } catch {} }}
        >
            {/* Lightweight placeholder to avoid blank cell while image decodes */}
            {!loaded && <View style={styles.placeholder} />}
            {source && (
                <FastImage
                    source={source}
                    style={styles.image}
                    resizeMode={FastImage.resizeMode.cover}
                    onLoadEnd={() => setLoaded(true)}
                />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        margin: scaleSize(2),
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
    image: {
        flex: 1,
        borderRadius: scaleSize(10),
        aspectRatio: 1
    },
    placeholder: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: scaleSize(10),
        backgroundColor: require('../../../../theme/mfpDark').default.field,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }
});
