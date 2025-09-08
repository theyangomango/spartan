// components/3_Workout/ui/SectionDivider.jsx
import React, { memo, useMemo } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { ROW_WIDTH } from "../sections/workoutTheme";

/**
 * Symmetric divider: dot in center, 7 dashes per side (configurable),
 * computed widths so it's perfectly centered and visually even.
 */
const SectionDividerCmp = ({
    widthPx = ROW_WIDTH,
    sideCount = 7,
    gap = 12,
    thickness = 3,
    dashColor = "rgba(15,23,42,0.22)",
    dotSize = 6,
    dotColor = "#0000003d",
    containerBg = "#f0f4f9ff",
}) => {
    const { rowWidth, items } = useMemo(() => {
        const totalSlots = sideCount * 2 + 1;
        const totalGaps = totalSlots - 1;
        const available = widthPx - totalGaps * gap;
        const dashWidth = Math.max(10, Math.floor((available - dotSize) / (sideCount * 2)));
        const computedRowWidth = dotSize + sideCount * 2 * dashWidth + totalGaps * gap;

        const dashStyle = { width: dashWidth, height: thickness, borderRadius: thickness, backgroundColor: dashColor };
        const dotStyle = { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: dotColor };

        const arr = [];
        for (let i = 0; i < sideCount; i++) arr.push(<View key={`l-${i}`} style={[dashStyle, { marginRight: gap }]} />);
        arr.push(<View key="dot" style={[dotStyle, { marginRight: gap }]} />);
        for (let i = 0; i < sideCount; i++) arr.push(<View key={`r-${i}`} style={[dashStyle, { marginRight: i === sideCount - 1 ? 0 : gap }]} />);

        return { rowWidth: computedRowWidth, items: arr };
    }, [widthPx, sideCount, gap, thickness, dashColor, dotSize, dotColor]);

    return (
        <View style={styles.sectionDividerOuter}>
            <View style={[styles.sectionDividerInner, { width: widthPx }]}>
                <View style={[styles.bgFill, { backgroundColor: containerBg }]} />
                <View style={[styles.row, { width: rowWidth }]}>
                    {items}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    sectionDividerOuter: {
        alignItems: "center",
        marginTop: 8,
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
    bgFill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
const propsEqual = (a, b) => (
    a.widthPx === b.widthPx &&
    a.sideCount === b.sideCount &&
    a.gap === b.gap &&
    a.thickness === b.thickness &&
    a.dashColor === b.dashColor &&
    a.dotSize === b.dotSize &&
    a.dotColor === b.dotColor &&
    a.containerBg === b.containerBg
);

export default memo(SectionDividerCmp, propsEqual);
