import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable, Animated, Easing } from "react-native";
import theme from "../../theme/mfpDark";

import scaleSize from "../../helper/scaleSize";

const { width: SW, height: SH } = Dimensions.get("window");
const ACCENT = theme.primary;
const HAIRLINE = theme.hairline;

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

    const [barLayout, setBarLayout] = useState(null);
    const [menuLayout, setMenuLayout] = useState(null);

    const handleBarLayout = useCallback((event) => {
        const { width, height } = event.nativeEvent.layout;
        setBarLayout((prev) => {
            if (prev && Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
                return prev;
            }
            return { width, height };
        });
    }, []);

    const handleMenuLayout = useCallback((event) => {
        const { width, height } = event.nativeEvent.layout;
        setMenuLayout((prev) => {
            if (prev && Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
                return prev;
            }
            return { width, height };
        });
    }, []);

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
    const margin = scaleSize(12);
    const verticalGap = scaleSize(12);
    const firstItemInset = scaleSize(8);
    const reactionGap = scaleSize(8);
    const itemSize = scaleSize(40);

    const ax = (anchor?.x ?? SW / 2) + (anchor?.width ?? 0) / 2;
    const top = anchor?.y ?? (SH / 2 - 24);
    const bot = (anchor?.y ?? SH / 2) + (anchor?.height ?? 48);

    const estimatedBarHeight = reactions.length ? scaleSize(56) : 0;
    const barHeight = barLayout?.height ?? estimatedBarHeight;
    const estimatedMenuHeight = actions.length ? actions.length * scaleSize(48) + scaleSize(8) : 0;
    const menuHeight = menuLayout?.height ?? estimatedMenuHeight;

    const availableAbove = Math.max(0, top - margin);
    const availableBelow = Math.max(0, SH - bot - margin);

    let barTop = null;
    let barPlacement = null;
    if (reactions.length > 0) {
        const preferAbove = availableAbove >= availableBelow;
        const fitsAbove = barHeight + verticalGap <= availableAbove;
        const fitsBelow = barHeight + verticalGap <= availableBelow;

        if ((preferAbove && fitsAbove) || (!fitsBelow && fitsAbove)) {
            barPlacement = "above";
            const desiredTop = top - verticalGap - barHeight;
            barTop = Math.max(margin, desiredTop);
        } else if (fitsBelow) {
            barPlacement = "below";
            const desiredTop = bot + verticalGap;
            barTop = Math.min(SH - margin - barHeight, desiredTop);
        } else {
            barPlacement = "float";
            const midTop = top + (bot - top) / 2 - barHeight / 2;
            barTop = Math.max(margin, Math.min(midTop, SH - margin - barHeight));
        }
    }

    const barWidth = reactions.length
        ? reactions.length * itemSize + Math.max(reactions.length - 1, 0) * reactionGap + firstItemInset * 2
        : 0;
    const barLeft = Math.max(margin, Math.min(ax - barWidth / 2, SW - barWidth - margin));

    const anchorForMenuBelow = barPlacement === "below" ? (barTop ?? bot) + barHeight : bot;
    const anchorForMenuAbove = barPlacement === "above" ? (barTop ?? top) : top;

    const spaceBelowAnchor = Math.max(0, SH - anchorForMenuBelow - margin);
    const spaceAboveAnchor = Math.max(0, anchorForMenuAbove - margin);

    const fitsMenuBelow = menuHeight + verticalGap <= spaceBelowAnchor;
    const fitsMenuAbove = menuHeight + verticalGap <= spaceAboveAnchor;

    let menuTop;
    if (fitsMenuBelow && (!fitsMenuAbove || spaceBelowAnchor >= spaceAboveAnchor)) {
        const desiredTop = anchorForMenuBelow + verticalGap;
        menuTop = Math.min(SH - margin - menuHeight, desiredTop);
    } else if (fitsMenuAbove) {
        const desiredTop = anchorForMenuAbove - verticalGap - menuHeight;
        menuTop = Math.max(margin, desiredTop);
    } else if (spaceBelowAnchor >= spaceAboveAnchor) {
        const desiredTop = anchorForMenuBelow + verticalGap;
        menuTop = Math.min(SH - margin - menuHeight, Math.max(margin, desiredTop));
    } else {
        const desiredTop = anchorForMenuAbove - verticalGap - menuHeight;
        menuTop = Math.max(margin, Math.min(desiredTop, SH - margin - menuHeight));
    }

    const menuWidth = Math.min(300, SW - margin * 2);
    const menuLeft = Math.max(margin, Math.min(ax - menuWidth / 2, SW - menuWidth - margin));
    const clampedMenuTop = Math.max(margin, Math.min(menuTop, SH - margin - menuHeight));

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* overlay */}
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.28)", opacity: overlayOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* reaction bar */}
            {reactions.length > 0 && barTop !== null && (
                <Animated.View
                    style={[
                        styles.reactionBar,
                        { left: barLeft, top: barTop, width: barWidth, opacity: barOpacity, transform: [{ scale: barScale }] },
                    ]}
                    onLayout={handleBarLayout}
                >
                    {reactions.map((r, i) => (
                        <Pressable
                            key={r.key}
                            style={[styles.reactionItem, { marginLeft: i === 0 ? firstItemInset : reactionGap }]}
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
                        { left: menuLeft, top: clampedMenuTop, width: menuWidth, opacity: menuOpacity, transform: [{ translateY: menuTranslate }] },
                    ]}
                    onLayout={handleMenuLayout}
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
        paddingVertical: scaleSize(8),
        borderRadius: scaleSize(28),
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(16),
        shadowOffset: { width: 0, height: scaleSize(10) },
        elevation: 8,
    },
    reactionItem: {
        width: scaleSize(40), height: scaleSize(40), borderRadius: scaleSize(20),
        backgroundColor: theme.field,
        alignItems: "center", justifyContent: "center",
    },
    reactionEmoji: { fontSize: scaleSize(20) },

    menuCard: {
        position: "absolute",
        borderRadius: scaleSize(16),
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        shadowColor: "#000",
        shadowOpacity: 0.22,
        shadowRadius: scaleSize(18),
        shadowOffset: { width: 0, height: scaleSize(10) },
        elevation: 8,
        overflow: "hidden",
    },
    menuRow: { paddingVertical: scaleSize(14), paddingHorizontal: scaleSize(14) },
    menuRowPressed: { backgroundColor: "rgba(255,255,255,0.06)" },
    menuDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: HAIRLINE },
    menuLabel: {
        fontSize: scaleSize(15), color: theme.textPrimary, fontFamily: "Outfit_600SemiBold", letterSpacing: 0.1,
    },
});
