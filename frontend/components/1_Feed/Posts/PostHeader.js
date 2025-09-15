import React from "react";
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import FastImage from "react-native-fast-image";
import formatDate from "../../../helper/formatDate";
import scaleSize, { ts } from "../../../helper/scaleSize";
import { usePfp } from "../../../helper/usePFPs";
import RNBounceable from "@freakycoder/react-native-bounceable";
import theme from "../../../theme/mfpDark";
import { Weight } from "iconsax-react-native";

function PostHeader({
    data,
    url,
    position,
    totalImages,
    toViewProfile,
    openViewWorkout,
    isLightHeader, // if true, render dark text for readability on light media
}) {
    // Use a stable version (e.g., user.updatedAt or incrementing int) to bust cache only when PFP changes
    const pfpUri = usePfp(data.uid, data.pfpVersion ?? 0);

    return (
        <View style={styles.outer}>
            <View style={styles.main_ctnr}>
                {/* ---------- left: avatar & handle ---------- */}
                <View style={styles.left}>
                    <Pressable onPress={toViewProfile} style={styles.pfp_ctnr}>
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
                                    // Show placeholder if token rotated; once data.pfpVersion bumps, usePfp will re-resolve.
                                }}
                            />
                        ) : (
                            <View style={[styles.pfp, { backgroundColor: theme.field }]} />
                        )}
                    </Pressable>

                    <View style={styles.text_ctnr}>
                        <Pressable onPress={toViewProfile}>
                            <Text style={[styles.handle_text, isLightHeader && styles.handle_text_dark]}>{data.handle}</Text>
                        </Pressable>

                        {data.workout && (
                            <RNBounceable
                                activeOpacity={0.5}
                                onPress={openViewWorkout}
                                style={styles.workout_text_ctnr}
                                accessibilityLabel="Open workout details"
                            >
                                <Weight size={scaleSize(13)} color={theme.textPrimary} variant="Bold" />
                                <Text style={styles.date_text}>
                                    {formatDate(new Date(data.workout.created))} Workout
                                </Text>
                            </RNBounceable>
                        )}
                    </View>
                </View>

                {/* ---------- right: image dots ---------- */}
                <View style={styles.right}>
                    {totalImages > 1 && (
                        <View style={styles.dotsContainer}>
                            {Array.from({ length: totalImages }).map((_, i) => (
                                <View key={i} style={i === position ? styles.dash : styles.dot} />
                            ))}
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

// Re-render only when header-relevant props change
const areEqual = (prev, next) => {
    try {
        return (
            prev.position === next.position &&
            prev.totalImages === next.totalImages &&
            prev.data?.uid === next.data?.uid &&
            prev.data?.handle === next.data?.handle &&
            (prev.data?.pfpVersion ?? 0) === (next.data?.pfpVersion ?? 0) &&
            (!!prev.data?.workout === !!next.data?.workout) &&
            (prev.data?.workout?.created || null) === (next.data?.workout?.created || null) &&
            prev.isLightHeader === next.isLightHeader
        );
    } catch {
        return false;
    }
};

export default React.memo(PostHeader, areEqual);

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
    outer: {
        position: "absolute",
        zIndex: 1,
        top: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: scaleSize(40),
        borderTopRightRadius: scaleSize(40),
        overflow: "hidden",
    },
    main_ctnr: {
        paddingTop: scaleSize(14),
        paddingBottom: scaleSize(9),
        paddingLeft: scaleSize(22),
        paddingRight: scaleSize(13),
        flexDirection: "row",
        justifyContent: "space-between",
    },
    left: {
        flexDirection: "row",
        alignItems: "center",
    },
    pfp_ctnr: {
        width: scaleSize(42.5),
        aspectRatio: 1,
        marginRight: scaleSize(5),
    },
    /* avatar rendered with FastImage */
    pfp: {
        flex: 1,
        borderRadius: scaleSize(scaleSize(43.5) / 2),
    },
    text_ctnr: {
        padding: scaleSize(4),
        justifyContent: "center",
    },
    handle_text: {
        fontSize: scaleSize(12.5),
        paddingBottom: scaleSize(2),
        fontFamily: "Poppins_600SemiBold",
        color: "#fff",
    },
    handle_text_dark: {
        color: '#333',
        textShadowColor: 'transparent',
    },
    workout_text_ctnr: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(6),
        // Blue, low‑opacity background for stronger affordance
        backgroundColor: 'rgba(18, 49, 76, 0.57)',
        borderRadius: scaleSize(20),
        flexDirection: 'row',
        alignItems: 'center',
        // Subtle border to define edges on busy photos
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.18)',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(4),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 2,
    },
    date_text: {
        fontSize: scaleSize(12),
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        letterSpacing: 0.2,
        marginLeft: scaleSize(8),
    },
    right: {
        flexDirection: "row",
        alignItems: "center",
    },
    dotsContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: scaleSize(10),
    },
    dot: {
        width: scaleSize(9),
        height: scaleSize(5),
        borderRadius: scaleSize(scaleSize(5) / 2),
        backgroundColor: "#fff",
        opacity: 0.5,
        marginHorizontal: scaleSize(3.5),
    },
    dash: {
        width: scaleSize(21),
        height: scaleSize(5),
        borderRadius: scaleSize(scaleSize(5) / 2),
        backgroundColor: "#fff",
        marginHorizontal: scaleSize(3.5),
    },
});
