// components/3_Workout/MiniPodium.js
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import FastImage from "react-native-fast-image";
import { ss } from "../../../utils/scale";

export default function MiniPodium({ data = [] }) {
    const H_ALL = ss(120);
    const H_L = Math.round(H_ALL * 0.68);
    const H_C = Math.round(H_ALL * 0.92);
    const H_R = Math.round(H_ALL * 0.55);

    return (
        <View style={styles.podiumRow}>
            <View style={styles.col}>
                <Avatar uri={data[1]?.pfp} ring="#d4d4d4ff" />
                <View style={[styles.plinth, { height: H_L, backgroundColor: "#E8EEF9" }]}>
                    <View style={[styles.medalDot, { backgroundColor: "#c5c9d1ff" }]} />
                </View>
            </View>

            <View style={[styles.col, { marginHorizontal: 10 }]}>
                <Avatar uri={data[0]?.pfp} ring="#ffe08bff" />
                <View style={[styles.plinth, { height: H_C, backgroundColor: "#E8EEF9" }]}>
                    <View style={[styles.medalDot, { backgroundColor: "#ffdd61ff" }]} />
                </View>
            </View>

            <View style={styles.col}>
                <Avatar uri={data[2]?.pfp} ring="#ffbb69ff" />
                <View style={[styles.plinth, { height: H_R, backgroundColor: "#E8EEF9" }]}>
                    <View style={[styles.medalDot, { backgroundColor: "#ffba98ff" }]} />
                </View>
            </View>
        </View>
    );
}

function Avatar({ uri, ring = "#E5E7EB" }) {
    const S = ss(38);
    return (
        <View style={[styles.avatarWrap, { width: S, height: S, borderColor: ring }]}>
            {uri ? (
                <FastImage
                    source={{ uri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                    style={{ width: "100%", height: "100%", borderRadius: S / 2 }}
                    resizeMode={FastImage.resizeMode.cover}
                />
            ) : (
                <View style={{ flex: 1, borderRadius: S / 2, backgroundColor: "#E6EBF2" }} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    podiumRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 6 },
    col: { flex: 1, alignItems: "center" },
    avatarWrap: {
        borderWidth: 3.5,
        borderRadius: 999,
        backgroundColor: "#FFFFFF",
        marginBottom: 6,
    },
    plinth: {
        width: "72%",
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 6,
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
            android: { elevation: 1 },
        }),
    },
    medalDot: { width: 16, height: 16, borderRadius: 8 },
});
