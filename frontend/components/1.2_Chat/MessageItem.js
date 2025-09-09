import React, { useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Pressable,
    findNodeHandle,
} from "react-native";
import FastImage from "react-native-fast-image";
import theme from "../../theme/mfpDark";
import Video from "react-native-video";
import Animated, {
    useAnimatedStyle,
    Layout,
    ZoomIn,
    ZoomOut,
} from "react-native-reanimated";

const W = Dimensions.get("window").width;
const BUBBLE_MAX_W = Math.min(360, W * 0.72);

export default function MessageItem({
    item,
    messages,
    index,
    currentUid,
    isGroup = false,
    pfpByUid = {},
    revealSelf,
    revealOther,
    revealMax = 72,
    onOpenMedia,
    onOpenActions,
}) {
    // ------- robust sender detection -------
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

    // ------- grouping (FlatList is inverted; index+1 is the older neighbor) -------
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

    const thisMs = toMillis(item?.timestamp) || Number(item?.clientTs) || 0;
    const nextMs = toMillis(next?.timestamp) || Number(next?.clientTs) || 0;
    const grouped =
        !!next && nextSender === senderUid && Math.abs(thisMs - nextMs) <= 3 * 60 * 1000;

    const microTime = thisMs
        ? new Date(thisMs).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
        })
        : "";

    const hasText = !!(item?.text && String(item.text).trim().length);
    const hasMedia = Array.isArray(item?.media) && item?.media.length > 0;
    const mediaOnly = hasMedia && !hasText;

    const containerRef = useRef(null);

    // ---------------- animations ----------------
    const shift = useAnimatedStyle(() => {
        "worklet";
        const raw = isSelf ? (revealSelf?.value ?? 0) : 0; // others shift at row level
        const dx = Math.max(0, Math.min(revealMax, raw));
        const opacity = item?._pending ? 0.7 : 1;
        return { transform: [{ translateX: isSelf ? -dx : 0 }], opacity };
    });

    const timeRight = useAnimatedStyle(() => {
        "worklet";
        const raw = revealSelf?.value ?? 0;
        const dx = Math.max(0, Math.min(revealMax, raw));
        return { opacity: dx / revealMax, transform: [{ translateX: -dx }] };
    });

    // Row shift for other users: avatar + bubble move together
    const rowShift = useAnimatedStyle(() => {
        "worklet";
        if (isSelf) return { transform: [{ translateX: 0 }] };
        const raw = revealOther?.value ?? 0;
        const dx = Math.max(0, Math.min(revealMax, raw));
        return { transform: [{ translateX: dx }] };
    });
    const timeLeftOuter = useAnimatedStyle(() => {
        "worklet";
        const raw = revealOther?.value ?? 0;
        const dx = Math.max(0, Math.min(revealMax, raw));
        return { opacity: dx / revealMax, transform: [{ translateX: dx }] };
    });

    // ---------------- actions / lightbox anchors ----------------
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

        const handleLongPress = () => {
            tileRef.current?.measureInWindow?.((x, y, w, h) => {
                onOpenActions?.(item, { x, y, width: w, height: h });
            });
        };

        return (
            <Pressable onPress={handlePress} onLongPress={handleLongPress} delayLongPress={250}>
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

    // ---------------- reactions ----------------
    const reactions = item?.reactions || {};
    const entries = Object.entries(reactions).filter(
        ([, arr]) => Array.isArray(arr) && arr.length > 0
    );
    const hasReactions = entries.length > 0;

    const reply = item?.replyPreview || null;

    /** dynamic gap: much tighter when grouped within 3 minutes */
    const rowGap = grouped ? 1 : 12;

    /** NEW: add more headroom above any message that has reactions (bigger if not grouped) */
    // Ensure there's enough vertical space above the bubble for the pill
    // top offset is -18 with height 28 => needs ~18px clearance; add extra for shadows
    const reactionHeadroom = hasReactions ? (grouped ? 22 : 28) : 0;

    // Resolve sender avatar for group chats
    const senderPfp =
        item?.sender?.pfp ||
        pfpByUid?.[senderUid] ||
        item?.sender?.image ||
        item?.sender?.photoURL ||
        "";

    // Build the existing bubble block first
    const bubbleNode = (
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
                            { maxWidth: BUBBLE_MAX_W, alignSelf: isSelf ? "flex-end" : "flex-start" },
                        ]}
                    >
                        <View style={[styles.replyBar, { backgroundColor: isSelf ? theme.textPrimary : theme.primary }]} />
                        <View style={styles.replyTextCol}>
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

                <Pressable
                    onLongPress={openActionsSheet}
                    delayLongPress={250}
                    style={reactionHeadroom > 0 ? { paddingTop: reactionHeadroom, overflow: 'visible' } : { overflow: 'visible' }}
                >
                    {/* Place the reaction badge OUTSIDE the bubble to avoid clipping by rounded containers */}
                    {hasReactions && (
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.reactionInline,
                                isSelf ? styles.reactionLeft : styles.reactionRight,
                                { top: Math.max(0, reactionHeadroom - 18) },
                            ]}
                            layout={Layout.springify().damping(18).stiffness(260)}
                        >
                            {entries.map(([emoji, arr], i) => (
                                <Animated.Text
                                    key={`${emoji}-${arr.length}`}
                                    entering={ZoomIn.springify().damping(12).stiffness(320)}
                                    exiting={ZoomOut.duration(120)}
                                    style={[styles.reactionEmoji, i > 0 && { marginLeft: 4 }]}
                                >
                                    {emoji}
                                    {arr.length > 1 ? ` ${arr.length}` : ""}
                                </Animated.Text>
                            ))}
                        </Animated.View>
                    )}

                    {mediaOnly ? (
                        <Animated.View style={[styles.mediaOnly, shift]}>
                            <View style={[styles.mediaWrap, { marginTop: 0 }]}>
                                {item.media.map((m, idx) => (
                                    <MediaTile key={idx} m={m} />
                                ))}
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

                            {!!hasMedia && (
                                <View style={styles.mediaWrap}>
                                    {item.media.map((m, idx) => (
                                        <MediaTile key={idx} m={m} />
                                    ))}
                                </View>
                            )}
                        </Animated.View>
                    )}
                </Pressable>

                {isSelf && !!microTime && (
                    <Animated.Text style={[styles.timeRight, timeRight]} numberOfLines={1} pointerEvents="none">
                        {microTime}
                    </Animated.Text>
                )}
                {/* non-self time appears outside, left of avatar + bubble */}
        </View>
    );

    const showAvatar = isGroup && !isSelf;

    return (
        <View
            style={[
                styles.row,
                isSelf ? styles.rowSelf : styles.rowOther,
                { marginBottom: rowGap },
            ]}
        >
            <Animated.View style={[showAvatar ? styles.hRow : null, rowShift]}>
                {showAvatar && (
                    <View style={styles.avatarSlot}>
                        {senderPfp ? (
                            <FastImage source={{ uri: senderPfp }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarFallback]} />
                        )}
                    </View>
                )}
                {bubbleNode}
            </Animated.View>

            {/* For other's messages, show time to the left of avatar + bubble */}
            {!isSelf && !!microTime && (
                <Animated.Text style={[styles.timeLeftOuter, timeLeftOuter]} numberOfLines={1} pointerEvents="none">
                    {microTime}
                </Animated.Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { width: "100%", paddingHorizontal: 4, marginBottom: 6, position: 'relative', overflow: 'visible' },
    rowSelf: { alignItems: "flex-end" },
    rowOther: { alignItems: "flex-start" },
    hRow: { flexDirection: "row", alignItems: "center" },
    avatarSlot: { width: 30, marginRight: 8, alignItems: 'flex-start' },
    avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.field },
    avatarFallback: { backgroundColor: theme.field },
    wrap: { position: "relative", overflow: 'visible' },

    bubble: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, position: "relative" },
    bubbleSelf: {
        backgroundColor: theme.primary,
        shadowColor: theme.primary,
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    bubbleOther: {
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.hairline,
        position: "relative",
    },

    mediaOnly: { borderRadius: 12, overflow: "visible", position: "relative" },

    groupSelf: { borderBottomRightRadius: 7 },
    groupOther: { borderBottomLeftRadius: 7 },

    text: { fontSize: 14, lineHeight: 19, letterSpacing: 0.1, fontFamily: "Outfit_500Medium" },
    textSelf: { color: '#FFFFFF' },
    textOther: { color: theme.textPrimary },

    mediaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
    media: {
        width: (BUBBLE_MAX_W - 6) / 2,
        height: 180,
        borderRadius: 12,
        backgroundColor: theme.field,
    },
    videoOuter: { overflow: "hidden", borderRadius: 12, backgroundColor: theme.bg },

    // reply preview
    replyPreview: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
    },
    replySelf: { backgroundColor: "rgba(45,158,255,0.40)" },
    replyOther: { backgroundColor: theme.field },
    replyBar: { width: 3, height: 30, borderRadius: 2, marginRight: 8 },
    replyTextCol: { flexShrink: 1, minWidth: 0 },
    replySnippet: { fontSize: 12, fontFamily: "Outfit_500Medium", color: theme.textSecondary },

    // reactions badge
    reactionInline: {
        position: "absolute",
        top: -18,
        flexDirection: "row",
        alignItems: "center",
        minWidth: 28,
        height: 28,
        paddingHorizontal: 8,
        justifyContent: "center",
        backgroundColor: theme.surface,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.hairline,
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
        zIndex: 5,
    },
    reactionLeft: { left: -12 },
    reactionRight: { right: -12 },
    reactionEmoji: { fontSize: 12.5, color: theme.textPrimary },

    // timestamps outside bubble, slide in
    timeRight: {
        position: "absolute",
        right: -70,
        bottom: 2,
        zIndex: 2,
        fontSize: 11,
        lineHeight: 13,
        fontFamily: "Outfit_500Medium",
        letterSpacing: 0.1,
        color: theme.textSecondary,
    },
    timeLeftOuter: {
        position: "absolute",
        left: -78,
        bottom: 2,
        zIndex: 2,
        fontSize: 11,
        lineHeight: 13,
        fontFamily: "Outfit_500Medium",
        letterSpacing: 0.1,
        color: theme.textSecondary,
    },
});
