import { View, Text, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import FastImage from "react-native-fast-image";
import formatDate from "../../../helper/formatDate";
import scaleSize from "../../../helper/scaleSize";
import { usePfp } from "../../../helper/usePFPs";
import RNBounceable from "@freakycoder/react-native-bounceable";
import theme from "../../../theme/mfpDark";
import { Weight } from "iconsax-react-native";

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
                            <View style={[styles.pfp, { backgroundColor: theme.field }]} />
                        )}
                    </Pressable>

                    <View style={styles.text_ctnr}>
                        <Pressable onPress={toViewProfile}>
                            <Text style={styles.handle_text}>{data.handle}</Text>
                        </Pressable>

                        {data.workout && (
                            <RNBounceable
                                activeOpacity={0.5}
                                onPress={openViewWorkout}
                                style={styles.workout_text_ctnr}
                                accessibilityLabel="Open workout details"
                            >
                                <Weight size={scaleSize(12)} color={theme.textPrimary} variant="Bold" />
                                <View style={styles.workout_dot} />
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
        paddingHorizontal: 12,
        paddingVertical: 4,
        // Lighter translucent pill, consistent with Profile buttons
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        // Subtle, dark-mode friendly framing
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    workout_dot: { width: scaleSize(4), height: scaleSize(4), borderRadius: scaleSize(2), backgroundColor: theme.primary, marginHorizontal: scaleSize(6), opacity: 0.9 },
    date_text: {
        fontSize: scaleSize(11),
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        letterSpacing: 0.2,
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
