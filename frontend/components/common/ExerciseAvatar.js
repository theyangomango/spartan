import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import scaleSize from "../../helper/scaleSize";
import theme from "../../theme/mfpDark";
import { getExerciseImageSource, toExerciseSlug } from "./exerciseImageMap";

export { getExerciseImageSource, toExerciseSlug, resolveExerciseImageByName } from "./exerciseImageMap";

const DEFAULT_SIZE = scaleSize(38);

const getInitials = (rawName) => {
    if (!rawName || typeof rawName !== "string") return "?";
    const parts = rawName.trim().split(/\s+/).slice(0, 2);
    if (!parts.length) return "?";
    const initials = parts
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    return initials || "?";
};

export default function ExerciseAvatar({
    name,
    slug,
    size = DEFAULT_SIZE,
    style,
    imageStyle,
    showFallbackInitials = true,
}) {
    const resolvedSize = useMemo(() => {
        if (typeof size === "number") return size;
        return scaleSize(Number(size) || DEFAULT_SIZE);
    }, [size]);

    const circleStyle = useMemo(
        () => ({
            width: resolvedSize,
            height: resolvedSize,
            borderRadius: resolvedSize / 2,
        }),
        [resolvedSize]
    );

    const resolvedSlug = useMemo(() => {
        if (slug) return slug;
        if (name) return toExerciseSlug(name);
        return "";
    }, [slug, name]);

    const imageSource = useMemo(() => getExerciseImageSource(resolvedSlug), [resolvedSlug]);

    const showInitials = showFallbackInitials && !imageSource;
    const initials = useMemo(() => getInitials(name), [name]);

    return (
        <View style={[styles.wrapper, circleStyle, style]}>
            {imageSource ? (
                <Image
                    source={imageSource}
                    resizeMode="contain"
                    style={[styles.image, circleStyle, imageStyle]}
                />
            ) : null}
            {showInitials && (
                <View style={[styles.fallback, circleStyle]}>
                    <Text style={styles.fallbackText}>{initials}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        overflow: "hidden",
        backgroundColor: theme.field,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(255,255,255,0.24)",
        alignItems: "center",
        justifyContent: "center",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    fallback: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    fallbackText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(12),
        color: "rgba(255,255,255,0.72)",
    },
});
