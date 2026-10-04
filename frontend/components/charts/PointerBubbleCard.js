// Accent-framed tooltip card (glow, optional header label) for the active point of a line chart.
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { chartPointerStyles } from "./chartStyles";
import { scaleSize, ts } from "../2_Competition/layoutConstants";
import { accentToRgba } from "./chartMath";

const DEFAULT_ACCENT = { r: 100, g: 160, b: 255 };

const PointerBubbleCard = ({
    children,
    accent = DEFAULT_ACCENT,
    label,
    isRightAligned,
    accessibilityLabel,
}) => {
    const accentSolid = accentToRgba(accent, 1);
    const borderColor = accentToRgba(accent, 0.45);
    const glowColor = accentToRgba(accent, 0.18);

    return (
        <View
            pointerEvents="box-none"
            style={[
                chartPointerStyles.root,
                isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
            ]}
            accessible={Boolean(accessibilityLabel)}
            accessibilityRole={accessibilityLabel ? "summary" : undefined}
            accessibilityLabel={accessibilityLabel}
        >
            <View
                style={[
                    chartPointerStyles.bubbleWrapper,
                    isRightAligned ? chartPointerStyles.alignRight : chartPointerStyles.alignLeft,
                ]}
            >
                <View
                    pointerEvents="none"
                    style={[
                        styles.pointerBubbleGlow,
                        {
                            backgroundColor: glowColor,
                        },
                    ]}
                />
                <View
                    style={[
                        chartPointerStyles.bubble,
                        {
                            borderColor,
                        },
                    ]}
                >
                    {label ? (
                        <>
                            <View style={styles.pointerBubbleHeaderRow}>
                                <View
                                    style={[
                                        styles.pointerBubbleAccentDot,
                                        { backgroundColor: accentSolid },
                                    ]}
                                />
                                <Text style={styles.pointerBubbleHeaderLabel}>{label}</Text>
                            </View>
                            <View style={styles.pointerBubbleHeaderDivider} />
                        </>
                    ) : null}
                    <View style={styles.pointerBubbleBody}>{children}</View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    pointerBubbleGlow: {
        position: "absolute",
        top: scaleSize(-6),
        bottom: scaleSize(-16),
        left: scaleSize(40),
        right: scaleSize(40),
        borderRadius: scaleSize(48),
        opacity: 0.4,
    },
    pointerBubbleHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    pointerBubbleAccentDot: {
        width: scaleSize(9),
        height: scaleSize(9),
        borderRadius: scaleSize(9) / 2,
        marginRight: scaleSize(6),
    },
    pointerBubbleHeaderLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(11),
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: "rgba(226, 231, 255, 0.85)",
    },
    pointerBubbleHeaderDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(255,255,255,0.08)",
        marginTop: scaleSize(8),
    },
    pointerBubbleBody: {
        marginTop: scaleSize(10),
    },
});

export default PointerBubbleCard;
