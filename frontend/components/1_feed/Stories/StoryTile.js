/**
 * Displays a Story Tile with the creator's pfp and handle.
 * Uses darker blue border to indicate that the story hasn't been opened
 * Displays a yellow "+" button on the first tile (this user) to create story
 */

import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import scaleSize from '../../../helper/scaleSize'

export default function StoryTile ({
    data,
    handlePress,
    index,
    isViewed,
    handlePressCreateButton,
}) {
    return (
        <View style={styles.main_ctnr}>
            <TouchableOpacity
                disabled={data.stories.length === 0}
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
                    <Image source={{ uri: data.pfp }} style={styles.pfp} />
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
                    <FontAwesome6 name="plus" size={scaledStyles.createIconSize} color="#222" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const scaledStyles = {
    pfpSize: scaleSize(61),
    pfpBorderRadius: scaleSize(26),
    borderWidth: scaleSize(4),
    fontSize: scaleSize(14),
    createIconSize: scaleSize(13.5),

    // Position for the "plus" icon
    createIconPositionTop: scaleSize(40),
    createIconPositionRight: scaleSize(7),
};

const styles = StyleSheet.create({
    main_ctnr: {
        width: scaledStyles.pfpSize + scaleSize(17),
        height: scaledStyles.pfpSize + scaleSize(30),
        alignItems: "center",
    },
    handle_ctnr: { marginTop: 4 }, // optional container
    handle_text: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaledStyles.fontSize,
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
    pfp: {
        width: scaledStyles.pfpSize - scaleSize(10.5),
        aspectRatio: 1,
        borderRadius: scaledStyles.pfpBorderRadius - scaleSize(4),
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
