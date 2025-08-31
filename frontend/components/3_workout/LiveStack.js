// components/3_Workout/LiveStack.jsx
import React, { memo } from "react";
import { View, StyleSheet, Text } from "react-native";
import FastImage from "react-native-fast-image";
import { Ionicons } from "@expo/vector-icons";
import { SMALL_SIZE } from "./sections/workoutTheme";
import { usePfp } from "../../helper/usePFPs";

/** Single avatar; uses usePfp(uid). Adds a red ring if `live` */
const AvatarSlot = memo(function AvatarSlot({ uid, live = false, size, left = 0, fallbackUri, version = 0 }) {
    const resolved = usePfp(uid, version);
    const uri = resolved || fallbackUri || null;
    const RING = 3; // red ring size

    return (
        <View
            style={[
                styles.liveWrap,
                {
                    width: size + (live ? RING * 2 : 0),
                    height: size + (live ? RING * 2 : 0),
                    borderRadius: (size + (live ? RING * 2 : 0)) / 2,
                    left: left - (live ? RING : 0),
                    top: live ? -RING : 0,
                    borderWidth: live ? RING : 0,
                    borderColor: live ? "rgba(248, 68, 68, 1)" : "transparent",
                },
            ]}
        >
            <View
                style={[
                    styles.pfp,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
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
        </View>
    );
});

/**
 * Centered PFP stack (bigger, pressable-friendly).
 * - 0 users → friends icon (handled by parent)
 * - 1 user  → 1 big avatar
 * - 2 users → 2 avatars
 * - 3+      → 1 avatar + "+N"
 */
function LiveStack({ users = [] }) {
    if (!users || users.length === 0) {
        return <Ionicons name="home" size={18} color="#0F172A" />;
    }

    const hasOverflow = users.length > 2;
    const show = hasOverflow ? users.slice(0, 1) : users.slice(0, 2);
    const overflow = hasOverflow ? users.length - 1 : 0;
    const slots = overflow > 0 ? 2 : show.length;

    const SINGLE_S = Math.round(SMALL_SIZE * 0.86);
    const DOUBLE_S = Math.round(SMALL_SIZE * 0.74);
    const S = slots === 1 ? SINGLE_S : DOUBLE_S;
    const OFFSET = Math.round(S * 0.6);
    const usedWidth = slots === 1 ? S : S + OFFSET;

    return (
        <View pointerEvents="none" style={{ width: SMALL_SIZE, height: SMALL_SIZE, overflow: "visible" }}>
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
                        live={!!u?.live}
                        version={u?.pfpVersion || 0}
                        fallbackUri={u?.pfp || u?.photoURL || u?.image || u?.avatar || ""}
                        size={S}
                        left={i * OFFSET}
                    />
                ))}

                {overflow > 0 && (
                    <View style={[styles.counter, { width: S, height: S, borderRadius: S / 2, left: OFFSET, top: 0 }]}>
                        <Text style={styles.counterText}>{overflow > 9 ? "9+" : `+${overflow}`}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

export default memo(LiveStack);

const styles = StyleSheet.create({
    centerWrap: { position: "absolute" },
    liveWrap: { position: "absolute", justifyContent: "center", alignItems: "center" },
    pfp: {
        overflow: "hidden",
        borderWidth: 2.5, // inner white ring keeps overlaps crisp
        borderColor: "#fff",
        backgroundColor: "#fff",
        borderRadius: 999,
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
});
