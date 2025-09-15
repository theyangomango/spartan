/**
 * StoryTile
 * - Uses versioned PFP URLs with immutable caching via FastImage
 * - Resolves URL via usePfp (de-duped + persisted cache)
 */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import FastImage from "react-native-fast-image";
import scaleSize from "../../../helper/scaleSize";
import { usePfp } from "../../../helper/usePFPs";

export default function StoryTile({
    data,
    handlePress,
    index,
    isViewed,
    handlePressCreateButton,
    disabled,
}) {
    // Use a stable version (e.g., user.updatedAt or an incrementing int) to bust cache only when PFP changes
    const pfpUri = usePfp(data.uid, data.pfpVersion ?? 0);

    return (
        <View style={styles.main_ctnr}>
            <TouchableOpacity
                disabled={data.stories.length === 0 || disabled}
                onPress={handlePress}
                activeOpacity={0.5}
            >
                <View
                    style={
                        data.stories.length === 0
                            ? styles.pfp_no_border
                            : [styles.pfp_ctnr, isViewed && styles.pfp_ctnr_viewed]
                    }
                >
                    {pfpUri ? (
                        <FastImage
                            source={{
                                uri: pfpUri,
                                priority: FastImage.priority.normal,
                                cache: FastImage.cacheControl.immutable,
                            }}
                            style={styles.pfp}
                            resizeMode={FastImage.resizeMode.cover}
                            onError={() => {
                                // If token rotated after overwrite, this will render placeholder;
                                // once data.pfpVersion bumps, usePfp will resolve a fresh URL.
                            }}
                        />
                    ) : (
                        <View style={[styles.pfp, styles.pfp_placeholder]} />
                    )}
                </View>
            </TouchableOpacity>

            <View style={styles.handle_ctnr}>
                <Text style={styles.handle_text}>{data.handle}</Text>
            </View>

            {index === 0 && (
                <TouchableOpacity
                    onPress={handlePressCreateButton}
                    activeOpacity={0.7}
                    style={styles.create_icon}
                >
                    <FontAwesome6
                        name="plus"
                        size={scaledStyles.createIconSize}
                        color="#222"
                    />
                </TouchableOpacity>
            )}
        </View>
    );
}

/* ---------- scaled constants ---------- */
const scaledStyles = {
    pfpSize: scaleSize(61),
    pfpBorderRadius: scaleSize(26),
    borderWidth: scaleSize(4),
    fontSize: scaleSize(14),
    createIconSize: scaleSize(13.5),
    createIconPositionTop: scaleSize(40),
    createIconPositionRight: scaleSize(7),
};

/* ---------- styles ---------- */
const styles = StyleSheet.create({
    main_ctnr: {
        width: scaledStyles.pfpSize + scaleSize(17),
        height: scaledStyles.pfpSize + scaleSize(30),
        alignItems: "center",
    },
    handle_ctnr: { marginTop: 4 },
    handle_text: {
        fontFamily: "Outfit_500Medium",
    fontSize: require('../../../helper/scaleSize').ts(scaledStyles.fontSize),
        marginLeft: 3,
        color: "#666",
    },
    pfp_ctnr: {
        width: scaledStyles.pfpSize,
        aspectRatio: 1,
        borderRadius: scaledStyles.pfpBorderRadius,
        borderWidth: scaledStyles.borderWidth,
        borderColor: "#2D9EFF",
        justifyContent: "center",
        alignItems: "center",
    },
    pfp_no_border: {
        width: scaledStyles.pfpSize,
        aspectRatio: 1,
        borderRadius: scaledStyles.pfpBorderRadius,
        borderWidth: scaledStyles.borderWidth,
        borderColor: "#eee",
        justifyContent: "center",
        alignItems: "center",
    },
    pfp_ctnr_viewed: {
        borderColor: "#BEE1FF",
    },
    /* avatar with FastImage */
    pfp: {
        width: scaledStyles.pfpSize - scaleSize(10.5),
        aspectRatio: 1,
        borderRadius: scaledStyles.pfpBorderRadius - scaleSize(4),
    },
    pfp_placeholder: {
        backgroundColor: "#EEE",
    },
    create_icon: {
        position: "absolute",
        top: scaledStyles.createIconPositionTop,
        right: scaledStyles.createIconPositionRight,
        backgroundColor: "#FCF375",
        borderRadius: 100,
        justifyContent: "center",
        alignItems: "center",
        padding: scaleSize(5),
    },
});
