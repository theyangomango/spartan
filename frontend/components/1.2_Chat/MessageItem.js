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

import scaleSize from "../../helper/scaleSize";

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

    // Build the existing bubble block first.
    // Wrap reply preview + bubble content in a shared animated container so they shift together
    // when revealing timestamps. Previously only the bubble moved; the reply preview stayed put.
    const bubbleNode = (
        <View
            ref={containerRef}
            collapsable={false}
            style={[
                styles.wrap,
                { alignSelf: isSelf ? "flex-end" : "flex-start", maxWidth: BUBBLE_MAX_W },
            ]}
        >
            <Animated.View style={shift}>
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
                                { top: scaleSize(Math.max(0, reactionHeadroom - 18)) },
                            ]}
                            layout={Layout.springify().damping(18).stiffness(260)}
                        >
                            {entries.map(([emoji, arr], i) => (
                                <Animated.Text
                                    key={`${emoji}-${arr.length}`}
                                    entering={ZoomIn.springify().damping(12).stiffness(320)}
                                    exiting={ZoomOut.duration(120)}
                                    style={[styles.reactionEmoji, i > 0 && { marginLeft: scaleSize(4) }]}
                                >
                                    {emoji}
                                    {arr.length > 1 ? ` ${arr.length}` : ""}
                                </Animated.Text>
                            ))}
                        </Animated.View>
                    )}

                    {mediaOnly ? (
                        <View style={[styles.mediaOnly]}>
                            <View style={[styles.mediaWrap, { marginTop: 0 }]}>
                                {item.media.map((m, idx) => (
                                    <MediaTile key={idx} m={m} />
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View
                            style={[
                                styles.bubble,
                                isSelf ? styles.bubbleSelf : styles.bubbleOther,
                                grouped && (isSelf ? styles.groupSelf : styles.groupOther),
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
                        </View>
                    )}
                </Pressable>
            </Animated.View>

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
                    <View
                        style={[
                            styles.avatarSlot,
                            // Align avatar with the top of the message text area (ignore reaction headroom)
                            hasReactions ? { marginTop: reactionHeadroom } : null,
                        ]}
                    >
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
    row: { width: "100%", paddingHorizontal: scaleSize(4), marginBottom: scaleSize(6), position: 'relative', overflow: 'visible' },
    rowSelf: { alignItems: "flex-end" },
    rowOther: { alignItems: "flex-start" },
    hRow: { flexDirection: "row", alignItems: "center" },
    avatarSlot: { width: scaleSize(30), marginRight: scaleSize(8), alignItems: 'flex-start' },
    avatar: { width: scaleSize(26), height: scaleSize(26), borderRadius: scaleSize(13), backgroundColor: theme.field },
    avatarFallback: { backgroundColor: theme.field },
    wrap: { position: "relative", overflow: 'visible' },

    bubble: { borderRadius: scaleSize(18), paddingHorizontal: scaleSize(12), paddingVertical: scaleSize(8), position: "relative" },
    bubbleSelf: {
        backgroundColor: theme.primary,
        shadowColor: theme.primary,
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(10),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 2,
    },
    bubbleOther: {
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        position: "relative",
    },

    mediaOnly: { borderRadius: scaleSize(12), overflow: "visible", position: "relative" },

    groupSelf: { borderBottomRightRadius: scaleSize(7) },
    groupOther: { borderBottomLeftRadius: scaleSize(7) },

    text: { fontSize: scaleSize(14), lineHeight: scaleSize(require('../../helper/scaleSize').ts(18)), letterSpacing: 0.1, fontFamily: "Outfit_500Medium" },
    textSelf: { color: theme.textPrimary },
    textOther: { color: theme.textPrimary },

    mediaWrap: { flexDirection: "row", flexWrap: "wrap", gap: scaleSize(6), marginTop: scaleSize(6) },
    media: {
        width: scaleSize((BUBBLE_MAX_W - 6) / 2),
        height: scaleSize(180),
        borderRadius: scaleSize(12),
        backgroundColor: theme.field,
    },
    videoOuter: { overflow: "hidden", borderRadius: scaleSize(12), backgroundColor: theme.bg },

    // reply preview
    replyPreview: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: scaleSize(1),
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(8),
        borderRadius: scaleSize(12),
    },
    replySelf: { backgroundColor: "rgba(45,158,255,0.40)" },
    replyOther: { backgroundColor: theme.field },
    replyBar: { width: scaleSize(3), height: scaleSize(30), borderRadius: scaleSize(2), marginRight: scaleSize(8) },
    replyTextCol: { flexShrink: 1, minWidth: 0 },
    replySnippet: { fontSize: scaleSize(12), fontFamily: "Outfit_500Medium", color: theme.textSecondary },

    // reactions badge
    reactionInline: {
        position: "absolute",
        top: scaleSize(-18),
        flexDirection: "row",
        alignItems: "center",
        minWidth: scaleSize(28),
        height: scaleSize(28),
        paddingHorizontal: scaleSize(8),
        justifyContent: "center",
        backgroundColor: theme.surface,
        borderRadius: scaleSize(999),
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: scaleSize(6),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 1,
        zIndex: 5,
    },
    reactionLeft: { left: scaleSize(-12) },
    reactionRight: { right: scaleSize(-12) },
    reactionEmoji: { fontSize: scaleSize(12.5), color: theme.textPrimary },

    // timestamps outside bubble, slide in
    timeRight: {
        position: "absolute",
        right: scaleSize(-70),
        bottom: scaleSize(2),
        zIndex: 2,
        fontSize: scaleSize(11),
        lineHeight: scaleSize(13),
        fontFamily: "Outfit_500Medium",
        letterSpacing: 0.1,
        color: theme.textSecondary,
    },
    timeLeftOuter: {
        position: "absolute",
        left: scaleSize(-78),
        bottom: scaleSize(2),
        zIndex: 2,
        fontSize: scaleSize(11),
        lineHeight: scaleSize(13),
        fontFamily: "Outfit_500Medium",
        letterSpacing: 0.1,
        color: theme.textSecondary,
    },
});
