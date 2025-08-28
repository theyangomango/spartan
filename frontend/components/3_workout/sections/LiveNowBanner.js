// components/3_Workout/LiveNowBanner.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import FastImage from "react-native-fast-image";
import { BLUE } from './workoutTheme'
import { ss } from "../../../utils/scale";

export default function LiveNowBanner({ users = [], onView, onCheer }) {
    const isEmpty = !users || users.length === 0;

    if (isEmpty) {
        // Subtle empty state: disabled "Cheer", active "View"
        return (
            <View style={styles.banner}>
                <View style={styles.left}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="pulse-outline" size={16} color={BLUE.ACCENT} />
                    </View>
                    <Text numberOfLines={1} style={styles.title}>
                        No one live
                    </Text>
                </View>

                <View style={styles.ctaRow}>
                    <View style={[styles.cheerBtn, styles.btnDisabled]} pointerEvents="none">
                        <Ionicons name="sparkles" size={14} color="rgba(45,158,255,0.55)" />
                        <Text style={[styles.cheerText, { color: "rgba(45,158,255,0.55)" }]}>Cheer</Text>
                    </View>
                    <TouchableOpacity onPress={onView} activeOpacity={0.9} style={styles.viewBtn}>
                        <Ionicons name="eye" size={14} color="#fff" />
                        <Text style={styles.viewText}>View</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const show = users.slice(0, 2);
    const overflow = Math.max(0, users.length - show.length);

    return (
        <View style={styles.banner}>
            {/* LEFT: avatars + title */}
            <View style={styles.left}>
                <AvatarStack avatars={show.map((u) => u.pfp)} overflow={overflow} />
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
                    Training Now
                </Text>
            </View>

            {/* RIGHT: CTAs */}
            <View style={styles.ctaRow}>
                <TouchableOpacity onPress={onCheer} activeOpacity={0.9} style={styles.cheerBtn}>
                    <Ionicons name="sparkles" size={14} color={BLUE.ACCENT} />
                    <Text style={styles.cheerText}>Cheer</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onView} activeOpacity={0.9} style={styles.viewBtn}>
                    <Ionicons name="eye" size={14} color="#fff" />
                    <Text style={styles.viewText}>View</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function AvatarStack({ avatars = [], overflow = 0 }) {
    const SIZE = ss(28);
    const OFFSET = Math.max(14, Math.round(SIZE * 0.56));

    return (
        <View pointerEvents="none" style={{ flexDirection: "row", alignItems: "center", marginRight: 8 }}>
            {avatars.map((uri, i) => (
                <View
                    key={`${uri}-${i}`}
                    style={[
                        styles.pfpWrap,
                        { width: SIZE, height: SIZE, borderRadius: SIZE / 2, left: i * OFFSET, zIndex: avatars.length - i },
                    ]}
                >
                    <FastImage
                        source={{ uri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                        style={{ width: "100%", height: "100%", borderRadius: SIZE / 2 }}
                    />
                </View>
            ))}
            {overflow > 0 && (
                <View style={[styles.moreWrap, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, left: avatars.length * OFFSET }]}>
                    <Text style={styles.moreText}>+{overflow}</Text>
                </View>
            )}
            <View style={{ width: avatars.length * OFFSET + SIZE }} />
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(45,158,255,0.08)",
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(45,158,255,0.18)",
        marginBottom: 8,
        marginTop: 6,
    },
    left: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
    title: { flex: 1, fontFamily: "Outfit_700Bold", color: BLUE.TITLE, fontSize: 14, marginLeft: -2 },

    emptyIcon: {
        width: ss(28),
        height: ss(28),
        borderRadius: ss(14),
        backgroundColor: "rgba(45,158,255,0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },

    pfpWrap: { position: "absolute", backgroundColor: "#fff", borderWidth: 2, borderColor: "#fff", overflow: "hidden" },
    moreWrap: { position: "absolute", backgroundColor: "#fff", borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
    moreText: { fontFamily: "Outfit_700Bold", fontSize: 12, color: BLUE.TITLE },

    ctaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
    cheerBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#fff",
        paddingHorizontal: 13,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2,6,23,0.08)",
    },
    cheerText: { fontFamily: "Outfit_700Bold", fontSize: 12.5, color: BLUE.ACCENT },
    viewBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: BLUE.ACCENT, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
    viewText: { fontFamily: "Outfit_700Bold", fontSize: 12.5, color: "#fff" },

    btnDisabled: { opacity: 0.45 },
});
