// PostPreview.js
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import FastImage from 'react-native-fast-image';
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function PostPreview({ postData, onPress }) {
    const image = postData?.media?.[0]?.uri || null;
    const [loaded, setLoaded] = useState(false);
    const source = useMemo(() => (
        image
            ? { uri: image, priority: FastImage.priority.high, cache: FastImage.cacheControl.immutable }
            : null
    ), [image]);

    return (
        <RNBounceable style={styles.main_ctnr} onPress={onPress}>
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
    },
    placeholder: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 10,
        backgroundColor: '#f1f1f1',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    }
});
