// components/3_Workout/LiveStack.jsx
import React, { memo } from "react";
import { View, StyleSheet, Text } from "react-native";
import FastImage from "react-native-fast-image";
import { Ionicons } from "@expo/vector-icons";
import { SMALL_SIZE } from "./sections/workoutTheme";
import { usePfp } from "../../helper/usePFPs";
import theme from "../../theme/mfpDark";

/** Single avatar that sources from usePfp(uid), falling back to provided URI */
const AvatarSlot = memo(function AvatarSlot({ uid, size, left = 0, fallbackUri, version = 0 }) {
    const resolved = usePfp(uid, version);
    const uri = resolved || fallbackUri || null;

    return (
        <View
            style={[
                styles.pfp,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    left,
                    top: 0,
                },
            ]}
        >
            {uri ? (
                <FastImage
                    source={{
                        uri,
                        priority: FastImage.priority.normal,
                        cache: FastImage.cacheControl.immutable,
                    }}
                    style={{ width: "100%", height: "100%", borderRadius: size / 2 }}
                />
            ) : (
                <View style={{ flex: 1, borderRadius: size / 2, backgroundColor: "#E5E7EB" }} />
            )}
        </View>
    );
});

/**
 * Centered PFP stack with a centered "Live" chip underneath.
 * - 1 user  → 1 big avatar
 * - 2 users → 2 avatars
 * - 3+      → 1 avatar + "+N"
 * If any user isLive/currentWorkout => show "Live" chip (centered).
 */
function LiveStack({ users = [] }) {
    if (!users || users.length === 0) {
        return <Ionicons name="home" size={18} color={theme.textPrimary} />;
    }

    const hasLive = users.some((u) => u?.isLive || u?.currentWorkout);

    const hasOverflow = users.length > 2;
    const show = hasOverflow ? users.slice(0, 1) : users.slice(0, 2);
    const overflow = hasOverflow ? users.length - 1 : 0;
    const slots = overflow > 0 ? 2 : show.length;

    const SINGLE_S = Math.round(SMALL_SIZE * 0.86);
    const DOUBLE_S = Math.round(SMALL_SIZE * 0.74);
    const S = slots === 1 ? SINGLE_S : DOUBLE_S;
    const OFFSET = Math.round(S * 0.6);
    const usedWidth = slots === 1 ? S : S + OFFSET;

    // Compute a centered top for the Live chip: bottom of avatars + small gap.
    // Avatars are vertically centered inside SMALL_SIZE, so bottom = SMALL_SIZE/2 + S/2
    const chipTop = Math.round(SMALL_SIZE / 2 + S / 2 + 4);

    return (
        <View
            pointerEvents="none"
            style={{ width: SMALL_SIZE, height: SMALL_SIZE, overflow: "visible" }}
        >
            {/* Center the avatar stack inside SMALL_SIZE */}
            <View
                style={[
                    styles.centerWrap,
                    {
                        width: usedWidth,
                        height: S,
                        left: SMALL_SIZE / 2,
                        top: SMALL_SIZE / 2,
                        transform: [{ translateX: -usedWidth / 2 }, { translateY: -S / 2 }],
                    },
                ]}
            >
                {show.map((u, i) => (
                    <AvatarSlot
                        key={`${u?.uid || i}`}
                        uid={u?.uid}
                        version={u?.pfpVersion || 0}
                        fallbackUri={u?.pfp || u?.photoURL || u?.image || u?.avatar || ""}
                        size={S}
                        left={i * OFFSET}
                    />
                ))}

                {overflow > 0 && (
                    <View
                        style={[
                            styles.counter,
                            { width: S, height: S, borderRadius: S / 2, left: OFFSET, top: 0 },
                        ]}
                    >
                        <Text style={styles.counterText}>{overflow > 9 ? "9+" : `+${overflow}`}</Text>
                    </View>
                )}
            </View>

            {/* Live chip – centered horizontally under the avatars */}
            {hasLive && (
                <View style={[styles.liveWrap, { top: chipTop }]}>
                    <View style={styles.liveChip}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>Live</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

export default memo(LiveStack);

const styles = StyleSheet.create({
    centerWrap: { position: "absolute" },
    pfp: {
        position: "absolute",
        overflow: "hidden",
        borderWidth: 2.5, // white ring keeps overlaps crisp
        borderColor: "#fff",
        backgroundColor: "#fff",
    },
    counter: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15,23,42,0.92)",
        borderWidth: 2.5,
        borderColor: "#fff",
    },
    counterText: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 13,
        color: "#fff",
        includeFontPadding: false,
    },

    // Live chip centered wrap (stretches full SMALL_SIZE width)
    liveWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
    },
    liveChip: {
        minHeight: 22,
        paddingHorizontal: 8,
        borderRadius: 11,
        backgroundColor: theme.field, // soft grey for dark theme
        flexDirection: "row",
        alignItems: "center",
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#EF4444", // red accent
        marginRight: 5,
    },
    liveText: {
        fontFamily: "Outfit_700Bold",
        fontSize: 11,
        color: theme.textPrimary,
        includeFontPadding: false,
    },
});
