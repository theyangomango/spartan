import React, { useRef } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable, findNodeHandle } from "react-native";
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
    revealSelf,
    revealOther,
    revealMax = 72,
    onOpenMedia,
    onOpenActions,
}) {
    const senderUid =
        item?.sender?.uid ?? item?.senderUid ?? item?.fromUid ?? item?.uid ?? item?.userId ?? item?.authorId ?? item?.from?.uid ?? item?.author?.uid ?? null;
    const isSelf = !!currentUid && senderUid === currentUid;

    const next = messages?.[index + 1];
    const nextSender =
        next?.sender?.uid ?? next?.senderUid ?? next?.fromUid ?? next?.uid ?? next?.userId ?? next?.authorId ?? next?.from?.uid ?? next?.author?.uid ?? null;

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
    const grouped = next && nextSender === senderUid && Math.abs(thisMs - nextMs) <= 4 * 60 * 1000;

    const microTime = thisMs
        ? new Date(thisMs).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
        : "";

    const hasText = !!(item?.text && String(item.text).trim().length);
    const hasMedia = Array.isArray(item?.media) && item?.media.length > 0;
    const mediaOnly = hasMedia && !hasText;

    const containerRef = useRef(null);

    const shift = useAnimatedStyle(() => {
        "worklet";
        const raw = isSelf ? (revealSelf?.value ?? 0) : (revealOther?.value ?? 0);
        const dx = Math.max(0, Math.min(revealMax, raw));
        const opacity = item?._pending ? 0.7 : 1;
        return { transform: [{ translateX: isSelf ? -dx : dx }], opacity };
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

    const openActionsSheet = () => {
        const node = findNodeHandle(containerRef.current);
        containerRef.current?.measureInWindow?.((x, y, w, h) => {
            onOpenActions?.(item, { x, y, width: w, height: h });
        });
    };

    const MediaTile = ({ m }) => {
        const tileRef = useRef(null);
        const handlePress = () => {
            tileRef.current?.measureInWindow?.((x, y, w, h) => {
                onOpenMedia?.({ uri: m.url, type: m.type || "image" }, { x, y, width: w, height: h });
            });
        };
        return (
            <Pressable onPress={handlePress}>
                <View ref={tileRef} collapsable={false}>
                    {m.type === "video" ? (
                        <View style={styles.videoOuter}>
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
                        <FastImage source={{ uri: m.url }} style={styles.media} resizeMode={FastImage.resizeMode.cover} />
                    )}
                </View>
            </Pressable>
        );
    };

    const reactions = item?.reactions || {};
    const entries = Object.entries(reactions).filter(([, arr]) => Array.isArray(arr) && arr.length > 0);
    const hasReactions = entries.length > 0;

    const reply = item?.replyPreview || null;

    return (
        <View style={[styles.row, isSelf ? styles.rowSelf : styles.rowOther]}>
            <View
                ref={containerRef}
                collapsable={false}
                style={[
                    styles.wrap,
                    { alignSelf: isSelf ? "flex-end" : "flex-start", maxWidth: BUBBLE_MAX_W },
                ]}
            >
                {!!reply && (
                    <View
                        style={[
                            styles.replyPreview,
                            isSelf ? styles.replySelf : styles.replyOther,
                            {
                                maxWidth: BUBBLE_MAX_W,
                                alignSelf: isSelf ? "flex-end" : "flex-start",
                            },
                        ]}
                    >
                        <View style={[styles.replyBar, { backgroundColor: isSelf ? "#fff" : "#2D9EFF" }]} />
                        <View style={styles.replyTextCol}>
                            {/* <Text
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={[styles.replyTitle, isSelf ? { color: "#EAF4FF" } : { color: "#0F172A" }]}
                            >
                                {reply.senderHandle || "Reply"}
                            </Text> */}
                            <Text
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={[styles.replySnippet, isSelf ? { color: "#EAF4FF" } : null]}
                            >
                                {reply.text || (reply.hasMedia ? "Media" : "")}
                            </Text>
                        </View>
                    </View>
                )}

                <Pressable onLongPress={openActionsSheet} delayLongPress={250}>
                    {mediaOnly ? (
                        <Animated.View style={[styles.mediaOnly, shift]}>
                            <View style={[styles.mediaWrap, { marginTop: 0 }]}>
                                {item.media.map((m, idx) => <MediaTile key={idx} m={m} />)}
                            </View>
                        </Animated.View>
                    ) : (
                        <Animated.View
                            style={[
                                styles.bubble,
                                isSelf ? styles.bubbleSelf : styles.bubbleOther,
                                grouped && (isSelf ? styles.groupSelf : styles.groupOther),
                                shift,
                            ]}
                        >
                            {!!hasText && (
                                <Text style={[styles.text, isSelf ? styles.textSelf : styles.textOther]}>
                                    {item.text}
                                </Text>
                            )}
                            {hasMedia && (
                                <View style={styles.mediaWrap}>
                                    {item.media.map((m, idx) => <MediaTile key={idx} m={m} />)}
                                </View>
                            )}
                        </Animated.View>
                    )}
                </Pressable>

                {hasReactions && (
                    <View style={[styles.reactionBar, isSelf ? { right: 6 } : { left: 6 }]}>
                        {entries.map(([emoji, arr]) => {
                            const you = (arr || []).includes(currentUid);
                            return (
                                <View key={emoji} style={[styles.reactionPill, you && styles.reactionYou]}>
                                    <Text style={styles.reactionText}>{emoji} {arr.length > 1 ? arr.length : ""}</Text>
                                </View>
                            );
                        })}
                    </View>
                )}

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
    row: { width: "100%", paddingHorizontal: 4, marginBottom: 6 },
    rowSelf: { alignItems: "flex-end" },
    rowOther: { alignItems: "flex-start" },
    wrap: { position: "relative" },

    bubble: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
    bubbleSelf: {
        backgroundColor: "#2D9EFF",
        shadowColor: "#2D9EFF",
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    bubbleOther: {
        backgroundColor: "#F2F6FF",
        borderWidth: 1,
        borderColor: "rgba(45,158,255,0.18)",
    },

    mediaOnly: { borderRadius: 12, overflow: "visible" },

    groupSelf: { borderBottomRightRadius: 7 },
    groupOther: { borderBottomLeftRadius: 7 },

    text: { fontSize: 14, lineHeight: 19, letterSpacing: 0.1, fontFamily: "Mulish_600SemiBold" },
    textSelf: { color: "#FFFFFF" },
    textOther: { color: "#0F172A" },

    mediaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
    media: { width: (BUBBLE_MAX_W - 6) / 2, height: 180, borderRadius: 12, backgroundColor: "#E5E7EB" },
    videoOuter: { overflow: "hidden", borderRadius: 12, backgroundColor: "#000" },

    // reply preview (more opaque)
    replyPreview: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
    },
    replySelf: { backgroundColor: "rgba(45,158,255,0.40)" }, // ↑ opacity
    replyOther: { backgroundColor: "rgba(45,158,255,0.18)" }, // ↑ opacity
    replyBar: { width: 3, height: 30, borderRadius: 2, marginRight: 8 },

    replyTextCol: { flexShrink: 1, minWidth: 0 },
    replyTitle: { fontSize: 12, fontFamily: "Poppins_600SemiBold" },
    replySnippet: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#64748B" },

    // reactions
    reactionBar: {
        position: "absolute",
        bottom: -14,
        flexDirection: "row",
        gap: 6,
    },
    reactionPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "rgba(2,6,23,0.08)",
    },
    reactionYou: { borderColor: "rgba(45,158,255,0.45)" },
    reactionText: { fontSize: 11, fontFamily: "Poppins_600SemiBold", color: "#0F172A" },

    // timestamps
    timeRight: {
        position: "absolute", right: -70, bottom: 2, zIndex: 2,
        fontSize: 11, lineHeight: 13, fontFamily: "Outfit_500Medium", letterSpacing: 0.1, color: "#94A3B8",
    },
    timeLeft: {
        position: "absolute", left: -70, bottom: 2, zIndex: 2,
        fontSize: 11, lineHeight: 13, fontFamily: "Outfit_500Medium", letterSpacing: 0.1, color: "#94A3B8",
    },
});
