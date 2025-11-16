import React, { forwardRef, useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Video from "react-native-video";

function computeTransforms(cropRect, layout, naturalSize) {
    if (
        !cropRect ||
        !layout?.width ||
        !layout?.height ||
        !naturalSize?.width ||
        !naturalSize?.height
    ) {
        return null;
    }

    const videoWidth = naturalSize.width;
    const videoHeight = naturalSize.height;
    if (!videoWidth || !videoHeight) return null;

    const cropWidthPx = cropRect.width * videoWidth;
    const cropHeightPx = cropRect.height * videoHeight;
    if (!cropWidthPx || !cropHeightPx) return null;

    const scale = layout.width / cropWidthPx;
    const scaledWidth = videoWidth * scale;
    const scaledHeight = videoHeight * scale;
    const translateX = -cropRect.x * videoWidth * scale;
    const translateY = -cropRect.y * videoHeight * scale;

    return { width: scaledWidth, height: scaledHeight, translateX, translateY };
}

const CroppedVideo = forwardRef(function CroppedVideo(
    {
        style,
        cropRect,
        videoStyle,
        onLoad,
        onLayout: onLayoutProp,
        ...props
    },
    ref
) {
    const [layout, setLayout] = useState({ width: 0, height: 0 });
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

    const handleLayout = useCallback(
        (event) => {
            const { width = 0, height = 0 } = event?.nativeEvent?.layout || {};
            setLayout({ width, height });
            onLayoutProp?.(event);
        },
        [onLayoutProp]
    );

    const handleLoad = useCallback(
        (event) => {
            if (event?.naturalSize) {
                const { width = 0, height = 0 } = event.naturalSize;
                setNaturalSize({ width, height });
            }
            onLoad?.(event);
        },
        [onLoad]
    );

    const computedVideoStyle = useMemo(() => {
        const transforms = computeTransforms(cropRect, layout, naturalSize);
        if (!transforms) {
            return [styles.video, videoStyle];
        }
        const { width, height, translateX, translateY } = transforms;
        return [
            styles.video,
            videoStyle,
            {
                width,
                height,
                transform: [{ translateX }, { translateY }],
            },
        ];
    }, [cropRect, layout, naturalSize, videoStyle]);

    return (
        <View style={[styles.container, style]} onLayout={handleLayout}>
            <Video
                ref={ref}
                {...props}
                style={computedVideoStyle}
                onLoad={handleLoad}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        overflow: "hidden",
    },
    video: {
        width: "100%",
        height: "100%",
    },
});

export default CroppedVideo;
