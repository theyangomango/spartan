import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import FastImage from "react-native-fast-image";
import Video from "react-native-video";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

const W = Dimensions.get("window").width;
const BUBBLE_MAX_W = Math.min(360, W * 0.72);

export default function MessageItem({
    item,
    messages,
    index,
    currentUid,
    revealSelf,   // SharedValue<number> 0..revealMax (yours)
    revealOther,  // SharedValue<number> 0..revealMax (theirs)
    revealMax = 72,
}) {
    // sender detection (robust)
    const senderUid =
        item?.sender?.uid ??
        item?.senderUid ??
        item?.fromUid ??
        item?.uid ??
        item?.userId ??
        item?.authorId ??
        item?.from?.uid ??
        item?.author?.uid ??
        null;
    const isSelf = !!currentUid && senderUid === currentUid;

    // grouping (FlatList inverted)
    const next = messages?.[index + 1];
    const nextSender =
        next?.sender?.uid ??
        next?.senderUid ??
        next?.fromUid ??
        next?.uid ??
        next?.userId ??
        next?.authorId ??
        next?.from?.uid ??
        next?.author?.uid ??
        null;

    const toMillis = (t) => {
        if (!t) return 0;
        if (typeof t === "number") return t < 1e12 ? t * 1000 : t;
        if (typeof t === "string") return Date.parse(t) || 0;
        if (typeof t?.toMillis === "function") return t.toMillis();
        if (typeof t?.seconds === "number") return t.seconds * 1000;
        if (t instanceof Date) return t.getTime();
        return 0;
    };

    const thisMs = toMillis(item?.timestamp);
    const nextMs = toMillis(next?.timestamp);
    const grouped =
        next && nextSender === senderUid && Math.abs(thisMs - nextMs) <= 4 * 60 * 1000;

    const microTime = thisMs
        ? new Date(thisMs).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
        : "";

    // --- Animated styles (all inline: NO outside function calls) ---
    const bubbleShift = useAnimatedStyle(() => {
        "worklet";
        const raw = isSelf ? (revealSelf?.value ?? 0) : (revealOther?.value ?? 0);
        const dx = Math.max(0, Math.min(revealMax, raw));
        return { transform: [{ translateX: isSelf ? -dx : dx }] };
    });

    const timeRight = useAnimatedStyle(() => {
        "worklet";
        const raw = revealSelf?.value ?? 0;
        const dx = Math.max(0, Math.min(revealMax, raw));
        return { opacity: dx / revealMax, transform: [{ translateX: -dx }] };
    });

    const timeLeft = useAnimatedStyle(() => {
        "worklet";
        const raw = revealOther?.value ?? 0;
        const dx = Math.max(0, Math.min(revealMax, raw));
        return { opacity: dx / revealMax, transform: [{ translateX: dx }] };
    });

    const renderMedia = () => {
        if (!item?.media?.length) return null;
        return (
            <View style={styles.mediaWrap}>
                {item.media.map((m, idx) =>
                    m.type === "video" ? (
                        <View key={idx} style={styles.videoOuter}>
                            <Video
                                source={{ uri: m.url }}
                                style={styles.media}
                                controls
                                paused
                                resizeMode="cover"
                                poster={m.thumbnailUrl || undefined}
                                posterResizeMode="cover"
                                onError={(e) => console.warn("Video error", e)}
                            />
                        </View>
                    ) : (
                        <FastImage
                            key={idx}
                            source={{ uri: m.url }}
                            style={styles.media}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    )
                )}
            </View>
        );
    };

    return (
        <View style={[styles.row, isSelf ? styles.rowSelf : styles.rowOther]}>
            <View
                style={[
                    styles.wrap,
                    { alignSelf: isSelf ? "flex-end" : "flex-start", maxWidth: BUBBLE_MAX_W },
                ]}
            >
                <Animated.View
                    style={[
                        styles.bubble,
                        isSelf ? styles.bubbleSelf : styles.bubbleOther,
                        grouped && (isSelf ? styles.groupSelf : styles.groupOther),
                        bubbleShift,
                    ]}
                >
                    {!!item?.text && (
                        <Text style={[styles.text, isSelf ? styles.textSelf : styles.textOther]}>
                            {item.text}
                        </Text>
                    )}
                    {renderMedia()}
                </Animated.View>

                {isSelf && !!microTime && (
                    <Animated.Text style={[styles.timeRight, timeRight]} numberOfLines={1} pointerEvents="none">
                        {microTime}
                    </Animated.Text>
                )}
                {!isSelf && !!microTime && (
                    <Animated.Text style={[styles.timeLeft, timeLeft]} numberOfLines={1} pointerEvents="none">
                        {microTime}
                    </Animated.Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { width: "100%", paddingHorizontal: 2, marginBottom: 6 },
    rowSelf: { alignItems: "flex-end" },
    rowOther: { alignItems: "flex-start" },

    wrap: { position: "relative" },

    bubble: {
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    bubbleSelf: { backgroundColor: "#2D9EFF" },
    bubbleOther: { backgroundColor: "#E8F4FF" },

    groupSelf: { borderBottomRightRadius: 7 },
    groupOther: { borderBottomLeftRadius: 7 },

    text: { fontSize: 16, lineHeight: 22, fontFamily: "Mulish_600SemiBold" },
    textSelf: { color: "#FFFFFF" },
    textOther: { color: "#0F172A" },

    mediaWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 6,
    },
    media: {
        width: (BUBBLE_MAX_W - 6) / 2,
        height: 180,
        borderRadius: 12,
        backgroundColor: "#E5E7EB",
    },
    videoOuter: {
        overflow: "hidden",
        borderRadius: 12,
        backgroundColor: "#000",
    },

    // timestamps are absolute so layout never shifts
    timeRight: {
        position: "absolute",
        right: -70,
        bottom: 2,
        zIndex: 2,
        fontSize: 11,
        lineHeight: 13,
        fontFamily: "Outfit_500Medium",
        letterSpacing: 0.1,
        color: "#94A3B8",
    },
    timeLeft: {
        position: "absolute",
        left: -70,
        bottom: 2,
        zIndex: 2,
        fontSize: 11,
        lineHeight: 13,
        fontFamily: "Outfit_500Medium",
        letterSpacing: 0.1,
        color: "#94A3B8",
    },
});
