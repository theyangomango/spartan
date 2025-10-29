import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import getDisplayTime from "../../helper/getDisplayTime";
import { usePfp } from "../../helper/usePFPs";
import theme from "../../theme/mfpDark";

import scaleSize, { ts } from "../../helper/scaleSize";
import { strong as haptic } from "../../utils/haptics";
import { TouchableOpacity } from "react-native";
import VerifiedHandle from "../common/VerifiedHandle";
import useUserVerified from "../../hooks/useUserVerified";

const CARD_MIN_HEIGHT = scaleSize(72);
const PROFILE_SIZE = scaleSize(36);
const SMALL_PROFILE_SIZE = scaleSize(30);
const HANDLE_FONT = ts(13);
const CONTENT_FONT = ts(12.5);
const DATE_FONT = ts(12);

const SMALL_PFP_STYLE = {
    width: SMALL_PROFILE_SIZE,
    height: SMALL_PROFILE_SIZE,
    borderRadius: 100,
};

const SINGLE_PFP_STYLE = {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: 100,
};

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
const Pfp = ({ uid, version = 0, fallbackUri, style }) => {
    const uri = usePfp(uid, version, fallbackUri);
    return uri ? (
        <FastImage
            source={{ uri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
            style={style}
            resizeMode={FastImage.resizeMode.cover}
        />
    ) : (
        <View style={[style, { backgroundColor: theme.field }]} />
    );
};

export default function MessageCard({ usersExcludingSelf, content, timestamp, toChat, index, isFirst, isLast }) {
    const sanitizedHandles = useMemo(() => (
        usersExcludingSelf.map((user) => {
            const base = typeof user?.handle === "string" ? user.handle : "";
            const trimmed = base.replace(/^@+/, "").trim();
            if (trimmed) return trimmed;
            const fallback = typeof user?.name === "string" ? user.name.trim() : "";
            if (fallback) return fallback;
            return "Friend";
        })
    ), [usersExcludingSelf]);
    const user0 = usersExcludingSelf[0];
    const user1 = usersExcludingSelf[1];
    const handlesLabel = useMemo(() => sanitizedHandles.join(", "), [sanitizedHandles]);
    const timeStr = safeDisplayTime(timestamp);
    const isSingleConversation = usersExcludingSelf.length === 1;
    const fallbackVerified = Boolean(user0?.isVerified ?? user0?.verified);
    const user0Uid = user0?.uid ? String(user0.uid) : "";
    const isFirstVerified = useUserVerified(user0Uid, fallbackVerified);

    const preview =
        (content ?? "")
            .toString()
            .trim() || ""; // keep minimal and sleek; no noisy placeholders

    const cardStyles = [styles.card];
    if (isFirst) cardStyles.push(styles.firstCard);
    if (isLast) cardStyles.push(styles.lastCard);

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
                try { haptic(); } catch {}
                toChat?.(index, usersExcludingSelf);
            }}
            style={cardStyles}
        >
            {/* left: avatars */}
            <View style={styles.pfpsWrap}>
                {usersExcludingSelf.length > 1 ? (
                    <>
                        <Pfp
                            uid={user0?.uid}
                            version={user0?.pfpVersion ?? 0}
                            fallbackUri={
                                user0?.pfp ||
                                user0?.pfpUrl ||
                                user0?.image ||
                                user0?.photoURL ||
                                user0?.avatar ||
                                ""
                            }
                            style={[
                                styles.pfp,
                                styles.topLeft,
                                SMALL_PFP_STYLE,
                            ]}
                        />
                        <Pfp
                            uid={user1?.uid}
                            version={user1?.pfpVersion ?? 0}
                            fallbackUri={
                                user1?.pfp ||
                                user1?.pfpUrl ||
                                user1?.image ||
                                user1?.photoURL ||
                                user1?.avatar ||
                                ""
                            }
                            style={[
                                styles.pfp,
                                styles.bottomRight,
                                SMALL_PFP_STYLE,
                            ]}
                        />
                    </>
                ) : (
                    <Pfp
                        uid={user0?.uid}
                        version={user0?.pfpVersion ?? 0}
                        fallbackUri={
                            user0?.pfp ||
                            user0?.pfpUrl ||
                            user0?.image ||
                            user0?.photoURL ||
                            user0?.avatar ||
                            ""
                        }
                        style={[styles.single, SINGLE_PFP_STYLE]}
                    />
                )}
            </View>
            {/* middle: text */}
            <View style={styles.textCol}>
                {isSingleConversation ? (
                    <VerifiedHandle
                        handle={sanitizedHandles[0] || "Friend"}
                        isVerified={isFirstVerified}
                        textStyle={styles.handle}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        preserveTextAlignment
                        containerStyle={styles.handleRow}
                    />
                ) : (
                    <Text style={styles.handle} numberOfLines={1} ellipsizeMode="tail">
                        {handlesLabel}
                    </Text>
                )}
                {!!preview && (
                    <Text style={styles.content} numberOfLines={1} ellipsizeMode="tail">
                        {preview}
                    </Text>
                )}
            </View>
            {/* right: time */}
            <View style={styles.timeCol}>
                {!!timeStr && <Text style={styles.time}>{timeStr}</Text>}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        width: "100%",
        alignSelf: "stretch",
        minHeight: CARD_MIN_HEIGHT,
        paddingHorizontal: scaleSize(26),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: theme.surface,
        borderBottomWidth: 0.75,
        borderColor: theme.field,
    },
    firstCard: {
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    lastCard: {
        borderBottomWidth: StyleSheet.hairlineWidth,
    },

    pfpsWrap: {
        position: "relative",
        marginRight: scaleSize(12),
        width: PROFILE_SIZE,
        height: PROFILE_SIZE,
    },
    pfp: {
        position: "absolute",
        borderWidth: scaleSize(1),
        borderColor: theme.bg,
        backgroundColor: theme.field,
    },
    topLeft: { top: 0, left: 0 },
    bottomRight: { bottom: 0, right: 0 },
    single: { backgroundColor: theme.field, borderColor: "rgba(255,255,255,0.1)" },

    textCol: { flex: 1, minWidth: 0 },
    handle: {
        fontFamily: "Outfit_600SemiBold",
        color: theme.textPrimary,
        letterSpacing: 0.2,
        fontSize: HANDLE_FONT,
    },
    handleRow: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
    },
    content: {
        fontFamily: "Outfit_400Regular",
        color: theme.textSecondary,
        opacity: 0.92,
        fontSize: CONTENT_FONT,
        paddingTop: scaleSize(1)
    },

    timeCol: { paddingLeft: scaleSize(8), alignItems: "flex-end", justifyContent: "center" },
    time: {
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
        letterSpacing: 0.2,
        opacity: 0.9,
        fontSize: DATE_FONT,
    },
});
