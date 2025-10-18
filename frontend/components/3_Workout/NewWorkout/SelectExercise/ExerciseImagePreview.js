import React, { useEffect, useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";

import scaleSize from "../../../../helper/scaleSize";
import { getExerciseImageSource, toExerciseSlug } from "../../../common/exerciseImageMap";

const DEFAULT_SIZE = scaleSize(60);

const resolveSize = (size) => {
    if (typeof size === "number" && Number.isFinite(size)) {
        return size;
    }
    if (typeof size === "string") {
        const numeric = Number(size);
        if (!Number.isNaN(numeric)) {
            return scaleSize(numeric);
        }
    }
    return DEFAULT_SIZE;
};

const ExerciseImagePreview = ({
    exercise,
    slug,
    size = DEFAULT_SIZE,
    style,
    imageStyle,
    onResolveImage,
}) => {
    const dimension = useMemo(() => resolveSize(size), [size]);
    const resolvedSlug = useMemo(() => {
        if (slug) return slug;
        if (typeof exercise !== "string") return "";
        return toExerciseSlug(exercise);
    }, [slug, exercise]);

    const source = useMemo(() => getExerciseImageSource(resolvedSlug), [resolvedSlug]);

    useEffect(() => {
        onResolveImage?.(Boolean(source));
    }, [source, onResolveImage]);

    return (
        <View style={[styles.container, { width: dimension, height: dimension }, style]}>
            {source ? (
                <Image
                    source={source}
                    resizeMode="contain"
                    style={[styles.image, imageStyle]}
                />
            ) : null}
        </View>
    );
};

export default ExerciseImagePreview;

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
    },
    image: {
        width: "100%",
        height: "100%",
    },
});
