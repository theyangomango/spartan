import { View, Text, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import FastImage from "react-native-fast-image";
import formatDate from "../../../helper/formatDate";
import scaleSize from "../../../helper/scaleSize";
import { usePfp } from "../../../helper/usePFPs";
import RNBounceable from "@freakycoder/react-native-bounceable";

export default function PostHeader({
    data,
    url,
    position,
    totalImages,
    toViewProfile,
    openViewWorkout,
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
                            <View style={[styles.pfp, { backgroundColor: "#D9E6F7" }]} />
                        )}
                    </Pressable>

                    <View style={styles.text_ctnr}>
                        <Pressable onPress={toViewProfile}>
                            <Text style={styles.handle_text}>{data.handle}</Text>
                        </Pressable>

                        {data.workout && (
                            <RNBounceable activeOpacity={0.5} onPress={openViewWorkout} style={styles.workout_text_ctnr}>
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
        borderRadius: scaleSize(43.5) / 2,
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
    workout_text_ctnr: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#2696ffff',
        borderRadius: 15
    },
    date_text: {
        fontSize: scaleSize(10.5),
        color: "#ffffff",
        fontFamily: "Poppins_700Bold",
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
        borderRadius: scaleSize(5) / 2,
        backgroundColor: "#fff",
        opacity: 0.5,
        marginHorizontal: scaleSize(3.5),
    },
    dash: {
        width: scaleSize(21),
        height: scaleSize(5),
        borderRadius: scaleSize(5) / 2,
        backgroundColor: "#fff",
        marginHorizontal: scaleSize(3.5),
    },
});
