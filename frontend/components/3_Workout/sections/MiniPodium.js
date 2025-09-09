// components/3_Workout/MiniPodium.js
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import FastImage from "react-native-fast-image";
import { ss } from "../../../utils/scale";
import theme from "../../../theme/mfpDark";

export default function MiniPodium({ data = [] }) {
    const H_ALL = ss(120);
    const H_L = Math.round(H_ALL * 0.68);
    const H_C = Math.round(H_ALL * 0.92);
    const H_R = Math.round(H_ALL * 0.55);

    return (
        <View style={styles.podiumRow}>
            <View style={styles.col}>
                {data[1]?.present ? (
                    <Avatar uri={data[1]?.pfp} ring="#C7CED9" />
                ) : null}
                <View style={[styles.plinth, { height: H_L, backgroundColor: "#a7a8ac65" }]}>
                    <View style={[styles.medalDot, { backgroundColor: "#C7CED9" }]} />
                </View>
            </View>

            <View style={[styles.col, { marginHorizontal: 10 }]}>
                {data[0]?.present ? (
                    <Avatar uri={data[0]?.pfp} ring="#FFE08B" />
                ) : null}
                <View style={[styles.plinth, { height: H_C, backgroundColor: "#a7a8ac65" }]}>
                    <View style={[styles.medalDot, { backgroundColor: "#FFE08B" }]} />
                </View>
            </View>

            <View style={styles.col}>
                {data[2]?.present ? (
                    <Avatar uri={data[2]?.pfp} ring="#FFBB69" />
                ) : null}
                <View style={[styles.plinth, { height: H_R, backgroundColor: "#a7a8ac65 " }]}>
                    <View style={[styles.medalDot, { backgroundColor: "#FFBA98" }]} />
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
        backgroundColor: theme.surface,
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
            ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
            android: { elevation: 1 },
        }),
    },
    medalDot: { width: 16, height: 16, borderRadius: 8 },
});
