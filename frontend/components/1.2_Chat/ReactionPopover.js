import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable, Animated, Easing } from "react-native";
import theme from "../../theme/mfpDark";

const { width: SW, height: SH } = Dimensions.get("window");
const ACCENT = "#2D9EFF";
const HAIRLINE = "rgba(255,255,255,0.08)";

export default function ReactionPopover({
    visible,
    onClose,
    anchor,                 // { x, y, width, height }
    reactions = [],         // [{ key, emoji }]
    actions = [],           // [{ key, label }]
    onReaction,
    onAction,
}) {
    // ---- Hooks (fixed order, always run) ----
    const [mounted, setMounted] = useState(visible);

    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const barOpacity = useRef(new Animated.Value(0)).current;
    const barScale = useRef(new Animated.Value(0.96)).current;
    const menuOpacity = useRef(new Animated.Value(0)).current;
    const menuTranslate = useRef(new Animated.Value(8)).current;

    useEffect(() => {
        if (visible) setMounted(true);

        Animated.parallel([
            Animated.timing(overlayOpacity, { toValue: visible ? 1 : 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(barOpacity, { toValue: visible ? 1 : 0, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(barScale, { toValue: visible ? 1 : 0.96, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(menuOpacity, { toValue: visible ? 1 : 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(menuTranslate, { toValue: visible ? 0 : 8, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished && !visible) setMounted(false);
        });
    }, [visible, overlayOpacity, barOpacity, barScale, menuOpacity, menuTranslate]);

    if (!mounted) return null;

    // ---- Geometry (plain calculations, NOT hooks) ----
    const margin = 10;
    const ax = (anchor?.x ?? SW / 2) + (anchor?.width ?? 0) / 2;
    const top = anchor?.y ?? (SH / 2 - 24);
    const bot = (anchor?.y ?? SH / 2) + (anchor?.height ?? 48);

    const itemSize = 40;
    const gap = 8;
    const barWidth = reactions.length ? reactions.length * itemSize + (reactions.length - 1) * gap + 16 : 0;
    const barLeft = Math.max(margin, Math.min(ax - barWidth / 2, SW - barWidth - margin));
    const barTop = Math.max(margin, top - 58);

    const menuWidth = Math.min(300, SW - margin * 2);
    const menuLeft = Math.max(margin, Math.min(ax - menuWidth / 2, SW - menuWidth - margin));
    const menuTop = Math.min(SH - margin - 120, bot + 10);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* overlay */}
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.28)", opacity: overlayOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* reaction bar */}
            {reactions.length > 0 && (
                <Animated.View
                    style={[
                        styles.reactionBar,
                        { left: barLeft, top: barTop, width: barWidth, opacity: barOpacity, transform: [{ scale: barScale }] },
                    ]}
                >
                    {reactions.map((r, i) => (
                        <Pressable
                            key={r.key}
                            style={[styles.reactionItem, { marginLeft: i === 0 ? 8 : gap }]}
                            onPress={() => { onReaction?.(r.key); onClose?.(); }}
                        >
                            <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                        </Pressable>
                    ))}
                </Animated.View>
            )}

            {/* action menu */}
            {actions.length > 0 && (
                <Animated.View
                    style={[
                        styles.menuCard,
                        { left: menuLeft, top: menuTop, width: menuWidth, opacity: menuOpacity, transform: [{ translateY: menuTranslate }] },
                    ]}
                    pointerEvents="auto"
                >
                    {actions.map((a, idx) => (
                        <Pressable
                            key={a.key}
                            onPress={() => { onAction?.(a.key); onClose?.(); }}
                            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed, idx !== 0 && styles.menuDivider]}
                        >
                            <Text style={styles.menuLabel}>{a.label}</Text>
                        </Pressable>
                    ))}
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    reactionBar: {
        position: "absolute",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        borderRadius: 28,
        backgroundColor: "#101828",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
    },
    reactionItem: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.10)",
        alignItems: "center", justifyContent: "center",
    },
    reactionEmoji: { fontSize: 20 },

    menuCard: {
        position: "absolute",
        borderRadius: 16,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.hairline,
        shadowColor: "#000",
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
        overflow: "hidden",
    },
    menuRow: { paddingVertical: 14, paddingHorizontal: 14 },
    menuRowPressed: { backgroundColor: "rgba(255,255,255,0.06)" },
    menuDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: HAIRLINE },
    menuLabel: {
        fontSize: 15, color: "#E5E7EB", fontFamily: "Outfit_600SemiBold", letterSpacing: 0.1,
    },
});
