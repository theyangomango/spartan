// components/3_Workout/MiniPodium.js
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import FastImage from "react-native-fast-image";
import { ss } from "../../../utils/scale";
import theme from "../../../theme/mfpDark";

import scaleSize from "../../../helper/scaleSize";

export default function MiniPodium({ data = [], onImagesReady }) {
    const H_ALL = ss(120);
    const H_L = Math.round(H_ALL * 0.68);
    const H_C = Math.round(H_ALL * 0.92);
    const H_R = Math.round(H_ALL * 0.55);

    // Track which avatars we expect to load so we can notify once finished
    const trackerRef = useRef({ signature: "", expected: 0, loaded: 0, notified: false, shouldNotify: false });
    const loadSignature = useMemo(
        () => data.map((entry, idx) => `${idx}:${entry?.present ? 1 : 0}:${entry?.pfp || ""}`).join("|"),
        [data]
    );
    const expectedCount = useMemo(() => data.filter((entry) => entry?.present && entry?.pfp).length, [data]);

    const tracker = trackerRef.current;
    if (tracker.signature !== loadSignature) {
        tracker.signature = loadSignature;
        tracker.expected = expectedCount;
        tracker.loaded = 0;
        tracker.notified = false;
        tracker.shouldNotify = expectedCount === 0;
    } else {
        tracker.expected = expectedCount;
        if (expectedCount === 0 && !tracker.notified) {
            tracker.shouldNotify = true;
        }
    }

    useEffect(() => {
        const current = trackerRef.current;
        if (current.shouldNotify && !current.notified) {
            current.shouldNotify = false;
            current.notified = true;
            onImagesReady?.();
        } else if (current.shouldNotify) {
            current.shouldNotify = false;
        }
    }, [loadSignature, expectedCount, onImagesReady]);

    const handleAvatarSettled = useCallback(() => {
        const tracker = trackerRef.current;
        if (tracker.notified || tracker.expected === 0) {
            if (!tracker.notified) {
                tracker.notified = true;
                tracker.shouldNotify = false;
                onImagesReady?.();
            }
            return;
        }
        tracker.loaded += 1;
        if (tracker.loaded >= tracker.expected && !tracker.notified) {
            tracker.notified = true;
            tracker.shouldNotify = false;
            onImagesReady?.();
        }
    }, [onImagesReady]);

    return (
        <View style={styles.podiumRow}>
            <View style={styles.col}>
                {data[1]?.present ? (
                    // Silver ring to match Competition podium
                    (<Avatar uri={data[1]?.pfp} ring="#D8DFEA" onSettled={handleAvatarSettled} />)
                ) : null}
                <View style={[styles.plinth, { height: H_L, backgroundColor: "#bbdbff35" }]}>
                    {/* Silver dot */}
                    <View style={[styles.medalDot, { backgroundColor: "#D8DFEA" }]} />
                </View>
            </View>
            <View style={[styles.col, { marginHorizontal: scaleSize(10) }]}>
                {data[0]?.present ? (
                    // Gold ring
                    (<Avatar uri={data[0]?.pfp} ring="#FFC83D" onSettled={handleAvatarSettled} />)
                ) : null}
                <View style={[styles.plinth, { height: H_C, backgroundColor: "#bbdbff35" }]}>
                    {/* Gold dot */}
                    <View style={[styles.medalDot, { backgroundColor: "#FFC83D" }]} />
                </View>
            </View>
            <View style={styles.col}>
                {data[2]?.present ? (
                    // Bronze ring
                    (<Avatar uri={data[2]?.pfp} ring="#FF9555" onSettled={handleAvatarSettled} />)
                ) : null}
                <View style={[styles.plinth, { height: H_R, backgroundColor: "#bbdbff35" }]}>
                    {/* Bronze dot */}
                    <View style={[styles.medalDot, { backgroundColor: "#FF9555" }]} />
                </View>
            </View>
        </View>
    );
}

function Avatar({ uri, ring = "#E5E7EB", onSettled }) {
    const S = ss(38);
    const settledRef = useRef(false);
    const markSettled = useCallback(() => {
        if (settledRef.current) return;
        settledRef.current = true;
        onSettled?.();
    }, [onSettled]);
    return (
        <View style={[styles.avatarWrap, { width: S, height: S, borderColor: ring }]}>
            {uri ? (
                <FastImage
                    source={{ uri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                    style={{ width: "100%", height: "100%", borderRadius: scaleSize(S / 2) }}
                    resizeMode={FastImage.resizeMode.cover}
                    onLoad={markSettled}
                    onError={markSettled}
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
        backgroundColor: "#bbdbff35",
        ...Platform.select({
            ios: {
                backgroundColor: "#bbdbff35",
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowRadius: scaleSize(6),
                shadowOffset: { width: 0, height: scaleSize(3) },
            },
            android: { elevation: 1 },
        }),
    },
    medalDot: { width: scaleSize(16), height: scaleSize(16), borderRadius: scaleSize(8) },
});
