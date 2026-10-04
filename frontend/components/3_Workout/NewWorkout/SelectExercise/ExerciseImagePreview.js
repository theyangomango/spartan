import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import FastImage from "react-native-fast-image";

import scaleSize from "../../../../helper/scaleSize";
import { getExerciseImageSource, toExerciseSlug } from "../../../common/exerciseImageMap";

const DEFAULT_SIZE = scaleSize(60);

const resolveSize = (size) => {
    if (typeof size === "number" && Number.isFinite(size)) {
        return size;
    }
    return DEFAULT_SIZE;
};

const ExerciseImagePreview = ({
    exercise,
    size = DEFAULT_SIZE,
    style,
    imageStyle,
}) => {
    const dimension = useMemo(() => resolveSize(size), [size]);
    const resolvedSlug = useMemo(() => {
        if (typeof exercise !== "string") return "";
        return toExerciseSlug(exercise);
    }, [exercise]);

    const source = useMemo(() => getExerciseImageSource(resolvedSlug), [resolvedSlug]);

    return (
        <View style={[styles.container, { width: dimension, height: dimension }, style]}>
            {source ? (
                <FastImage
                    source={source}
                    resizeMode={FastImage.resizeMode.contain}
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
