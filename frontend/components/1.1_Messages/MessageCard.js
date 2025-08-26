import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import FastImage from "react-native-fast-image";
import getDisplayTime from "../../helper/getDisplayTime";
import { usePfp } from "../../helper/usePFPs";

const { width, height } = Dimensions.get("window");

// Dynamic sizing
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) {
        return { handle: 16, content: 14, date: 13, profile: 50, small: 36, cardH: 78 };
    } else if (width >= 390 && height >= 844) {
        return { handle: 15, content: 13, date: 12, profile: 48, small: 35, cardH: 76 };
    } else if (width >= 375 && height >= 812) {
        return { handle: 14.5, content: 12.5, date: 11.5, profile: 46, small: 34, cardH: 74 };
    } else {
        return { handle: 14, content: 12, date: 11, profile: 44, small: 33, cardH: 72 };
    }
};
const dyn = getDynamicStyles();

/* ---------- Helpers: robust timestamp + compact fallback ---------- */
const toMillis = (t) => {
    if (!t) return null;
    if (typeof t === "number") return t < 1e12 ? t * 1000 : t; // sec -> ms
    if (typeof t === "string") {
        const ms = Date.parse(t);
        return Number.isNaN(ms) ? null : ms;
    }
    if (t instanceof Date) return t.getTime();
    if (typeof t?.toMillis === "function") return t.toMillis();
    if (typeof t?.seconds === "number") return t.seconds * 1000;
    return null;
};

const formatCompact = (ms) => {
    if (!ms) return "";
    const diff = Math.max(0, Date.now() - ms);
    const s = Math.round(diff / 1000);
    if (s < 60) return "now";
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h`;
    const d = new Date(ms);
    const month = d.toLocaleString(undefined, { month: "short" });
    const day = d.getDate();
    return `${month} ${day}`;
};

const safeDisplayTime = (timestamp) => {
    const ms = toMillis(timestamp);
    if (!ms) return "";
    // Try app's formatter first; fall back to compact if it yields NaN
    try {
        const s = getDisplayTime(ms);
        if (!s || /NaN/.test(String(s))) return formatCompact(ms);
        return s;
    } catch {
        return formatCompact(ms);
    }
};

/* Versioned PFP with immutable caching */
const Pfp = ({ uid, version = 0, style }) => {
    const uri = usePfp(uid, version);
    return uri ? (
        <FastImage
            source={{ uri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
            style={style}
            resizeMode={FastImage.resizeMode.cover}
        />
    ) : (
        <View style={[style, { backgroundColor: "#EEE" }]} />
    );
};

export default function MessageCard({ usersExcludingSelf, content, timestamp, toChat, index }) {
    const handles = usersExcludingSelf.map((user) => user.handle).join(", ");
    const user0 = usersExcludingSelf[0];
    const user1 = usersExcludingSelf[1];
    const timeStr = safeDisplayTime(timestamp);

    const preview =
        (content ?? "")
            .toString()
            .trim() || ""; // keep minimal and sleek; no noisy placeholders

    return (
        <RNBounceable onPress={() => toChat(index, usersExcludingSelf)} style={[styles.card, { height: dyn.cardH }]}>
            {/* left: avatars */}
            <View style={[styles.pfpsWrap, { width: dyn.profile, height: dyn.profile }]}>
                {usersExcludingSelf.length > 1 ? (
                    <>
                        <Pfp
                            uid={user0?.uid}
                            version={user0?.pfpVersion ?? 0}
                            style={[
                                styles.pfp,
                                styles.topLeft,
                                { width: dyn.small, height: dyn.small, borderRadius: dyn.small / 2 },
                            ]}
                        />
                        <Pfp
                            uid={user1?.uid}
                            version={user1?.pfpVersion ?? 0}
                            style={[
                                styles.pfp,
                                styles.bottomRight,
                                { width: dyn.small, height: dyn.small, borderRadius: dyn.small / 2 },
                            ]}
                        />
                    </>
                ) : (
                    <Pfp
                        uid={user0?.uid}
                        version={user0?.pfpVersion ?? 0}
                        style={[styles.single, { width: dyn.profile, height: dyn.profile, borderRadius: dyn.profile / 2 }]}
                    />
                )}
            </View>

            {/* middle: text */}
            <View style={styles.textCol}>
                <Text style={[styles.handle, { fontSize: dyn.handle }]} numberOfLines={1} ellipsizeMode="tail">
                    {handles}
                </Text>
                {!!preview && (
                    <Text style={[styles.content, { fontSize: dyn.content }]} numberOfLines={1} ellipsizeMode="tail">
                        {preview}
                    </Text>
                )}
            </View>

            {/* right: time */}
            <View style={styles.timeCol}>
                {!!timeStr && <Text style={[styles.time, { fontSize: dyn.date }]}>{timeStr}</Text>}
            </View>
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 15,
        paddingHorizontal: 14,
        borderRadius: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.06)",
        shadowColor: "#0f172a69",
        shadowOpacity: 0.05,
        shadowRadius: 1,
        shadowOffset: { width: 0, height: 1 },
    },

    pfpsWrap: { position: "relative", marginRight: 12 },
    pfp: {
        position: "absolute",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.85)",
        backgroundColor: "#EEE",
    },
    topLeft: { top: 0, left: 0 },
    bottomRight: { bottom: 0, right: 0 },
    single: {
        backgroundColor: "#EEE",
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.08)",
    },

    textCol: { flex: 1, minWidth: 0 },
    handle: {
        paddingBottom: 3,
        fontFamily: "Outfit_600SemiBold",
        color: "#0F172A",
        letterSpacing: 0.2,
    },
    content: {
        fontFamily: "Outfit_400Regular",
        color: "#6B7280",
    },

    timeCol: { paddingLeft: 8, alignItems: "flex-end", justifyContent: "center" },
    time: {
        color: "#94A3B8",
        fontFamily: "Outfit_500Medium",
        letterSpacing: 0.1,
    },
});
