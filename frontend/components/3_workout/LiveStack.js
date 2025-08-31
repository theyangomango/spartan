// components/3_Workout/LiveStack.jsx
import React, { memo, useEffect, useRef } from "react";
import { View, StyleSheet, Text, Animated } from "react-native";
import FastImage from "react-native-fast-image";
import { Ionicons } from "@expo/vector-icons";
import { SMALL_SIZE } from "./sections/workoutTheme";
import { usePfp } from "../../helper/usePFPs";

/** Single avatar that sources from usePfp(uid), falling back to provided URI */
const AvatarSlot = memo(function AvatarSlot({
    uid,
    size,
    left = 0,
    fallbackUri,
    version = 0,
}) {
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
 * Centered PFP stack (bigger, pressable-friendly).
 * - 1 user  → 1 big avatar
 * - 2 users → 2 avatars
 * - 3+      → 1 avatar + "+N"
 * Shows a minimal grey "LIVE" pill with a pulsing red dot beneath if ANY of the users are live.
 */
function LiveStack({ users = [] }) {
    if (!users || users.length === 0) {
        return <Ionicons name="home" size={18} color="#0F172A" />;
    }

    const anyLive = users.some((u) => !!u?.live);

    const hasOverflow = users.length > 2;
    const show = hasOverflow ? users.slice(0, 1) : users.slice(0, 2);
    const overflow = hasOverflow ? users.length - 1 : 0;
    const slots = overflow > 0 ? 2 : show.length;

    const SINGLE_S = Math.round(SMALL_SIZE * 0.86);
    const DOUBLE_S = Math.round(SMALL_SIZE * 0.74);
    const S = slots === 1 ? SINGLE_S : DOUBLE_S;
    const OFFSET = Math.round(S * 0.6);
    const usedWidth = slots === 1 ? S : S + OFFSET;

    // pulsing dot animation for LIVE pill
    const dotScale = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (!anyLive) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(dotScale, { toValue: 1.14, duration: 520, useNativeDriver: true }),
                Animated.timing(dotScale, { toValue: 1, duration: 520, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [anyLive, dotScale]);

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

            {/* LIVE badge under the stack if anyone is live */}
            {anyLive && (
                <View
                    style={[
                        styles.liveWrap,
                        {
                            left: SMALL_SIZE / 2,
                            top: SMALL_SIZE - Math.round(S * 0.10),
                            transform: [{ translateX: -stylesVars.LIVE_WIDTH / 2 }],
                        },
                    ]}
                >
                    <Animated.View style={[styles.liveDot, { transform: [{ scale: dotScale }] }]} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
            )}
        </View>
    );
}

export default memo(LiveStack);

const stylesVars = {
    LIVE_WIDTH: 50,
    LIVE_HEIGHT: 18,
};

const styles = StyleSheet.create({
    centerWrap: { position: "absolute" },
    pfp: {
        position: "absolute",
        overflow: "hidden",
        borderWidth: 2.5,            // white ring to keep overlaps crisp
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

    // LIVE pill — sleek grey w/ red accent dot
    liveWrap: {
        position: "absolute",
        width: stylesVars.LIVE_WIDTH,
        height: stylesVars.LIVE_HEIGHT,
        borderRadius: stylesVars.LIVE_HEIGHT / 2,
        backgroundColor: "#F1F5F9",       // cool grey background
        borderWidth: 1,
        borderColor: "#E2E8F0",           // precise hairline
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
        gap: 6,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#EF4444",       // red accent dot
    },
    liveText: {
        fontFamily: "Outfit_700Bold",     // crisper weight than 800 for a more refined look
        fontSize: 11,
        color: "#0F172A",                  // deep slate text
        letterSpacing: 0.45,
        includeFontPadding: false,
    },
});
