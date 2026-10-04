import React, { useRef, useMemo } from "react";
import {
    View,
    Text,
    Pressable,
} from "react-native";
import FastImage from "react-native-fast-image";
import Animated, {
    useAnimatedStyle,
    Layout,
    ZoomIn,
    ZoomOut,
} from "react-native-reanimated";

import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import { getMessageSenderUid, getMessageTimeMs } from "./chatMessageUtils";
import { normalizeMediaEntry } from "./chatMediaUtils";
import MediaTile from "./MediaTile";
import styles, { BUBBLE_MAX_W } from "./MessageItem.styles";

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
    const senderUid = getMessageSenderUid(item);
    const isSelf = !!currentUid && senderUid === currentUid;

    // ------- grouping (FlatList is inverted; index+1 is the older neighbor) -------
    const next = messages?.[index + 1];
    const nextSender = getMessageSenderUid(next);

    const thisMs = getMessageTimeMs(item);
    const nextMs = getMessageTimeMs(next);
    const grouped =
        !!next && nextSender === senderUid && Math.abs(thisMs - nextMs) <= 3 * 60 * 1000;

    const microTime = thisMs
        ? new Date(thisMs).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
        })
        : "";

    const normalizedMedia = useMemo(() => {
        if (!Array.isArray(item?.media)) return [];
        return item.media.map(normalizeMediaEntry).filter(Boolean);
    }, [item?.media]);

    const hasText = !!(item?.text && String(item.text).trim().length);
    const hasMedia = normalizedMedia.length > 0;
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
        containerRef.current?.measureInWindow?.((x, y, w, h) => {
            onOpenActions?.(item, { x, y, width: w, height: h });
        });
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

    /** add more headroom above any message that has reactions (bigger if not grouped) */
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
                                {normalizedMedia.map((m, idx) => (
                                    <MediaTile
                                        key={m.storagePath || m.url || m.uri || `media-${idx}`}
                                        m={m}
                                        item={item}
                                        onOpenMedia={onOpenMedia}
                                        onOpenActions={onOpenActions}
                                    />
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
                                    {normalizedMedia.map((m, idx) => (
                                        <MediaTile
                                            key={m.storagePath || m.url || m.uri || `media-${idx}`}
                                            m={m}
                                            item={item}
                                            onOpenMedia={onOpenMedia}
                                            onOpenActions={onOpenActions}
                                        />
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
            collapsable={false}
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
