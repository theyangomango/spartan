// components/3_Workout/ui/SectionDivider.jsx
import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { ROW_WIDTH } from "../sections/workoutTheme";

/**
 * Symmetric divider: dot in center, 7 dashes per side (configurable),
 * computed widths so it's perfectly centered and visually even.
 */
const SectionDivider = ({
    widthPx = ROW_WIDTH,
    sideCount = 7,
    gap = 12,
    thickness = 3,
    dashColor = "rgba(15,23,42,0.22)",
    dotSize = 6,
    dotColor = "#0000003d",
    containerBg = "#F7FAFF",
}) => {
    const totalSlots = sideCount * 2 + 1;
    const totalGaps = totalSlots - 1;
    const available = widthPx - totalGaps * gap;
    const dashWidth = Math.max(10, Math.floor((available - dotSize) / (sideCount * 2)));
    const rowWidth = dotSize + sideCount * 2 * dashWidth + totalGaps * gap;

    const Dash = ({ mr }) => (
        <View
            style={{
                width: dashWidth,
                height: thickness,
                borderRadius: thickness,
                backgroundColor: dashColor,
                marginRight: mr,
            }}
        />
    );

    const Dot = ({ mr }) => (
        <View
            style={{
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: dotColor,
                marginRight: mr,
            }}
        />
    );

    const items = [];
    for (let i = 0; i < sideCount; i++) items.push(<Dash key={`l-${i}`} mr={gap} />);
    items.push(<Dot key="dot" mr={gap} />);
    for (let i = 0; i < sideCount; i++) items.push(<Dash key={`r-${i}`} mr={i === sideCount - 1 ? 0 : gap} />);

    return (
        <View style={styles.sectionDividerOuter}>
            <View style={[styles.sectionDividerInner, { width: widthPx }]}>
                <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: containerBg }} />
                <View style={{ width: rowWidth, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    {items}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    sectionDividerOuter: {
        alignItems: "center",
        marginTop: 12,
        marginBottom: 14,
    },
    sectionDividerInner: {
        height: 22,
        justifyContent: "center",
        alignItems: "center",
        ...Platform.select({
            ios: { overflow: "visible" },
            android: { overflow: "hidden" },
        }),
    },
});

export default SectionDivider;
