import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Easing,
    Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import RNBounceable from "@freakycoder/react-native-bounceable";
import scaleSize, { ts } from "../../helper/scaleSize";
import theme from "../../theme/mfpDark";

/** Palette & vibe (matches app) */
const ACCENT = theme.primary;
const HAIRLINE = theme.hairline;
const TEXT = theme.textPrimary;
const GLASS_BG = "rgba(37,39,51,0.92)";

export default function ReactionSheet({
    visible,
    onClose,
    reactions = [],
    actions = [],
    onReaction,
    onAction,
}) {
    const insets = useSafeAreaInsets();

    const [mounted, setMounted] = useState(visible);
    const opacity = useRef(new Animated.Value(0)).current;
    const translate = useRef(new Animated.Value(10)).current;
    const scale = useRef(new Animated.Value(0.985)).current;

    const reactionItems = useMemo(() => reactions, [reactions]);
    const actionItems = useMemo(() => actions, [actions]);

    useEffect(() => {
        if (visible) setMounted(true);
        Animated.parallel([
            Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: visible ? 120 : 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(translate, { toValue: visible ? 0 : 8, duration: visible ? 140 : 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(scale, { toValue: visible ? 1 : 0.985, duration: visible ? 140 : 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished && !visible) setMounted(false);
        });
    }, [visible]);

    if (!mounted) return null;

    // Slim footprint to match your compact, rounded cards
    const sideGapL = Math.max(scaleSize(18), insets.left + scaleSize(12));
    const sideGapR = Math.max(scaleSize(18), insets.right + scaleSize(12));
    const bottomGap = Math.max(scaleSize(22), insets.bottom + scaleSize(12));

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Dim backdrop */}
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: "rgba(8,15,31,0.24)", opacity },
                ]}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Frosted, narrow card */}
            <Animated.View
                style={[
                    styles.sheetWrap,
                    {
                        left: sideGapL,
                        right: sideGapR,
                        bottom: bottomGap,
                        transform: [{ translateY: translate }, { scale }],
                        opacity,
                    },
                ]}
                pointerEvents="auto"
            >
                <BlurView intensity={22} tint="light" style={styles.blurCard}>
                    {/* hairline */}
                    <View style={styles.stroke} />

                    {/* grabber */}
                    <View style={styles.grabber} />

                    {/* reactions */}
                    {!!reactionItems.length && (
                        <View style={styles.reactionsRow}>
                            {reactionItems.map((r) => (
                                <RNBounceable
                                    key={r.key}
                                    style={styles.reactionPill}
                                    onPress={() => {
                                        onReaction?.(r.key);
                                        onClose?.();
                                    }}
                                >
                                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                                </RNBounceable>
                            ))}
                        </View>
                    )}

                    {!!actionItems.length && <View style={styles.hr} />}

                    {/* actions */}
                    <View style={styles.actionsWrap}>
                        {actionItems.map((a) => (
                            <Pressable
                                key={a.key}
                                onPress={() => {
                                    onAction?.(a.key);
                                    onClose?.();
                                }}
                                style={({ pressed }) => [
                                    styles.actionRow,
                                    pressed && styles.actionRowPressed,
                                ]}
                            >
                                <Text style={styles.actionText}>{a.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </BlurView>
            </Animated.View>
        </View>
    );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
    sheetWrap: {
        position: "absolute",
        alignSelf: "center",
        /** Narrower width → feels premium & consistent with your cards */
        maxWidth: scaleSize(260),
        borderRadius: scaleSize(16),
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: scaleSize(14),
                shadowOffset: { width: 0, height: scaleSize(8) },
            },
            android: { elevation: 7 },
        }),
    },
    blurCard: {
        overflow: "hidden",
        borderRadius: scaleSize(16),
        backgroundColor: GLASS_BG, // fallback behind blur
        paddingTop: scaleSize(6),
        paddingBottom: scaleSize(10),
        paddingHorizontal: scaleSize(10),
    },
    stroke: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: scaleSize(16),
        borderWidth: 1,
        borderColor: HAIRLINE,
    },

    grabber: {
        alignSelf: "center",
        width: scaleSize(22),
        height: scaleSize(3),
        borderRadius: scaleSize(2),
        backgroundColor: "rgba(15,23,42,0.15)",
        marginBottom: scaleSize(6),
    },

    // Compact emoji row (smaller gap to match app rhythm)
    reactionsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: scaleSize(6),
        paddingHorizontal: scaleSize(2),
        paddingVertical: scaleSize(4),
    },
    reactionPill: {
        width: scaleSize(30),
        height: scaleSize(30),
        borderRadius: scaleSize(15),
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: HAIRLINE,
        alignItems: "center",
        justifyContent: "center",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: scaleSize(5),
                shadowOffset: { width: 0, height: scaleSize(3) },
            },
            android: { elevation: 2 },
        }),
    },
    reactionEmoji: { fontSize: ts(16) },

    hr: {
        height: 1,
        backgroundColor: HAIRLINE,
        marginTop: scaleSize(6),
        marginBottom: scaleSize(4),
    },

    actionsWrap: { paddingHorizontal: scaleSize(4) },
    actionRow: {
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(8),
        borderRadius: scaleSize(10),
    },
    actionRowPressed: { backgroundColor: "rgba(255,255,255,0.06)" }, // subtle accent wash
    actionText: {
        fontSize: ts(13),
        color: TEXT,
        letterSpacing: 0.2,
        fontFamily: "Outfit_600SemiBold",
    },
});
