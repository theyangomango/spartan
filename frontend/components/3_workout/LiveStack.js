// components/3_Workout/LiveStack.jsx
import React from "react";
import { View, StyleSheet, Text } from "react-native";
import FastImage from "react-native-fast-image";
import { Ionicons } from "@expo/vector-icons";
import { SMALL_SIZE } from "./sections/workoutTheme";

/**
 * Centered PFP stack (bigger, pressable-friendly).
 * - 1 user  → 1 big avatar
 * - 2 users → 2 avatars
 * - 3+      → 1 avatar + "+N"
 * No accent dot.
 */
export default function LiveStack({ users = [] }) {
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
                    <View
                        key={`${u?.pfp || "x"}-${i}`}
                        style={[styles.pfp, { width: S, height: S, borderRadius: S / 2, left: i * OFFSET, top: 0 }]}
                    >
                        <FastImage
                            source={{
                                uri: u?.pfp,
                                priority: FastImage.priority.normal,
                                cache: FastImage.cacheControl.immutable,
                            }}
                            style={{ width: "100%", height: "100%", borderRadius: S / 2 }}
                        />
                    </View>
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
});
