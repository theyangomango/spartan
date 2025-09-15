// components/3_Workout/MiniPodium.js
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import FastImage from "react-native-fast-image";
import { ss } from "../../../utils/scale";
import theme from "../../../theme/mfpDark";

import scaleSize from "../../../helper/scaleSize";

export default function MiniPodium({ data = [] }) {
    const H_ALL = ss(120);
    const H_L = Math.round(H_ALL * 0.68);
    const H_C = Math.round(H_ALL * 0.92);
    const H_R = Math.round(H_ALL * 0.55);

    return (
        <View style={styles.podiumRow}>
            <View style={styles.col}>
                {data[1]?.present ? (
                    // Silver ring to match Competition podium
                    (<Avatar uri={data[1]?.pfp} ring="#D8DFEA" />)
                ) : null}
                <View style={[styles.plinth, { height: H_L, backgroundColor: "#bbdbff35" }]}>
                    {/* Silver dot */}
                    <View style={[styles.medalDot, { backgroundColor: "#D8DFEA" }]} />
                </View>
            </View>
            <View style={[styles.col, { marginHorizontal: scaleSize(10) }]}>
                {data[0]?.present ? (
                    // Gold ring
                    (<Avatar uri={data[0]?.pfp} ring="#FFC83D" />)
                ) : null}
                <View style={[styles.plinth, { height: H_C, backgroundColor: "#bbdbff35" }]}>
                    {/* Gold dot */}
                    <View style={[styles.medalDot, { backgroundColor: "#FFC83D" }]} />
                </View>
            </View>
            <View style={styles.col}>
                {data[2]?.present ? (
                    // Bronze ring
                    (<Avatar uri={data[2]?.pfp} ring="#FF9555" />)
                ) : null}
                <View style={[styles.plinth, { height: H_R, backgroundColor: "#bbdbff35" }]}>
                    {/* Bronze dot */}
                    <View style={[styles.medalDot, { backgroundColor: "#FF9555" }]} />
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
                    style={{ width: "100%", height: "100%", borderRadius: scaleSize(S / 2) }}
                    resizeMode={FastImage.resizeMode.cover}
                />
            ) : (
                <View style={{ flex: 1, borderRadius: scaleSize(S / 2), backgroundColor: "#E6EBF2" }} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    podiumRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: scaleSize(6) },
    col: { flex: 1, alignItems: "center" },
    avatarWrap: {
        borderWidth: scaleSize(3.5),
        borderRadius: scaleSize(999),
        backgroundColor: theme.surface,
        marginBottom: scaleSize(6),
    },
    plinth: {
        width: "72%",
        borderTopLeftRadius: scaleSize(10),
        borderTopRightRadius: scaleSize(10),
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: scaleSize(6),
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: scaleSize(6), shadowOffset: { width: 0, height: scaleSize(3) } },
            android: { elevation: 1 },
        }),
    },
    medalDot: { width: scaleSize(16), height: scaleSize(16), borderRadius: scaleSize(8) },
});
