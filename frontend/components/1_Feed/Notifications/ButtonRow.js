import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import scaleSize, { ts } from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";

function Chip({ label, selected, onPress, badgeCount }) {
    return (
        <RNBounceable
            key={label}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={onPress}
        >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {label}
            </Text>

            {badgeCount > 0 && (
                <View style={styles.badgeWrap}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badgeCount}</Text>
                    </View>
                </View>
            )}
        </RNBounceable>
    );
}

const MemoChip = memo(
    Chip,
    (prev, next) => (
        prev.label === next.label &&
        prev.selected === next.selected &&
        prev.badgeCount === next.badgeCount
    )
);

function ButtonRow({
    buttons,
    selectedButton,
    setSelectedButton,
    newLikes,
    newComments,
}) {
    // normalize badges per label with stable mapping
    const badgesByLabel = useMemo(() => ({
        Likes: newLikes || 0,
        Comments: newComments || 0,
    }), [newLikes, newComments]);

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
            >
                {buttons.map((label) => (
                    <MemoChip
                        key={label}
                        label={label}
                        selected={selectedButton === label}
                        badgeCount={badgesByLabel[label] || 0}
                        onPress={() => setSelectedButton(label)}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

export default memo(
    ButtonRow,
    (prev, next) => (
        prev.selectedButton === next.selectedButton &&
        prev.newLikes === next.newLikes &&
        prev.newComments === next.newComments &&
        // keep buttons equal if same labels and order (should be stable)
        prev.buttons.length === next.buttons.length &&
        prev.buttons.every((b, i) => b === next.buttons[i])
    )
);

const styles = StyleSheet.create({
    container: {},
    row: {
        paddingTop: scaleSize(24),
        paddingBottom: scaleSize(10),
        alignItems: "center",
        paddingHorizontal: scaleSize(14),
    },

    chip: {
        backgroundColor: theme.surface,
        paddingVertical: scaleSize(12),
        paddingHorizontal: scaleSize(18),
        borderRadius: scaleSize(18),
        marginRight: scaleSize(8),
        position: "relative",
        borderWidth: 1,
        borderColor: theme.hairline,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 1,
    },
    chipSelected: {
        // Higher-contrast but still on-brand
        backgroundColor: theme.restPillBg,
        borderColor: theme.primaryHairline,
        shadowOpacity: 0.12,
        elevation: 2,
    },
    chipText: {
        color: theme.textPrimary,
        fontSize: ts(13),
        fontFamily: "Outfit_600SemiBold",
    },
    chipTextSelected: {
        color: theme.textPrimary,
    },

    badgeWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        top: scaleSize(-12),
        alignItems: "center",
    },
    badge: {
        backgroundColor: theme.primary,
        borderRadius: scaleSize(9),
        paddingHorizontal: scaleSize(7),
        paddingVertical: scaleSize(4),
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
        elevation: 3,
    },
    badgeText: {
        color: theme.textPrimary,
        fontSize: ts(10),
        fontFamily: "Outfit_600SemiBold",
    },
});
