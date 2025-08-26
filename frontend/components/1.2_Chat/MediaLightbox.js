// components/1.2_Chat/MediaLightbox.jsx
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Pressable } from "react-native";
import Animated, {
    useSharedValue,
    withTiming,
    useAnimatedStyle,
    Easing,
    runOnJS,          // ← import this
} from "react-native-reanimated";
import FastImage from "react-native-fast-image";
import Video from "react-native-video";

const { width: W, height: H } = Dimensions.get("window");
const DURATION = 220;

export default function MediaLightbox({ visible, media, origin, onRequestClose }) {
    const left = useSharedValue(0);
    const top = useSharedValue(0);
    const width = useSharedValue(0);
    const height = useSharedValue(0);
    const radius = useSharedValue(12);
    const backdrop = useSharedValue(0);

    useEffect(() => {
        if (!visible || !origin || !media) return;

        // Start from the tapped tile’s rect
        left.value = origin.x;
        top.value = origin.y;
        width.value = origin.width;
        height.value = origin.height;
        radius.value = 12;
        backdrop.value = 0;

        // Animate to fullscreen
        const cfg = { duration: DURATION, easing: Easing.out(Easing.cubic) };
        left.value = withTiming(0, cfg);
        top.value = withTiming(0, cfg);
        width.value = withTiming(W, cfg);
        height.value = withTiming(H, cfg);
        radius.value = withTiming(0, cfg);
        backdrop.value = withTiming(1, { duration: DURATION });
    }, [visible]);

    const frameStyle = useAnimatedStyle(() => ({
        position: "absolute",
        left: left.value,
        top: top.value,
        width: width.value,
        height: height.value,
        borderRadius: radius.value,
        overflow: "hidden",
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdrop.value,
    }));

    const handleClose = () => {
        if (!origin) {
            onRequestClose?.();
            return;
        }
        // Animate back to the tile’s rect
        const cfg = { duration: DURATION, easing: Easing.out(Easing.cubic) };
        left.value = withTiming(origin.x, cfg);
        top.value = withTiming(origin.y, cfg);
        width.value = withTiming(origin.width, cfg);
        height.value = withTiming(origin.height, cfg);
        backdrop.value = withTiming(0, { duration: DURATION });

        // IMPORTANT: call back into JS via runOnJS
        radius.value = withTiming(12, cfg, () => {
            if (onRequestClose) runOnJS(onRequestClose)();
        });
    };

    if (!visible || !media || !origin) return null;

    return (
        <>
            {/* dim backdrop */}
            <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
            />
            {/* expanding media frame */}
            <Pressable onPress={handleClose} style={StyleSheet.absoluteFill}>
                <Animated.View style={frameStyle}>
                    {media.type === "video" ? (
                        <Video
                            source={{ uri: media.uri }}
                            style={StyleSheet.absoluteFill}
                            controls
                            resizeMode="contain"
                            posterResizeMode="cover"
                        />
                    ) : (
                        <FastImage
                            source={{ uri: media.uri }}
                            style={StyleSheet.absoluteFillObject}
                            resizeMode={FastImage.resizeMode.contain}
                        />
                    )}
                </Animated.View>
            </Pressable>
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: { backgroundColor: "black" },
});
