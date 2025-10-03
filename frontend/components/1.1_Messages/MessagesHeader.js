// components/1.1_Messages/MessagesHeader.jsx
import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { FontAwesome6, FontAwesome5 } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import scaleSize from "../../helper/scaleSize";
import theme from "../../theme/mfpDark";

const ACCENT = theme.primary;
const HAIRLINE = theme.hairline;

export default function MessagesHeader({
    toFeedScreen,
    openCreateGroupChatBottomSheet,
    setScope,
}) {
    const [selectedButton, setSelectedButton] = useState("All");

    const onPressTab = (tab) => {
        setSelectedButton(tab);
        setScope(tab);
    };

    const Chip = ({ label, active, onPress }) => (
        <RNBounceable
            onPress={onPress}
            style={[
                styles.chip,
                active && styles.chipActive,
                { width: scaleSize(110), height: scaleSize(38) },
            ]}
        >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {label}
            </Text>
        </RNBounceable>
    );

    return (
        <View style={styles.root}>
            <View style={styles.row}>
                {/* Back */}
                <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={toFeedScreen}
                    style={[styles.iconCircle, styles.leftIcon]}
                >
                    <FontAwesome6 name="chevron-left" size={scaleSize(16)} color={ACCENT} />
                </TouchableOpacity>

                {/* Create group — simplified to a single icon for cleaner look */}
                <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={openCreateGroupChatBottomSheet}
                    style={[styles.iconCircle, styles.rightIcon]}
                >
                    <FontAwesome5 name="users" size={scaleSize(16)} color={ACCENT} />
                    {/* subtle in-pill + badge */}
                    <View style={styles.plusBadge}>
                        <FontAwesome5 name="plus" size={scaleSize(7.5)} color={theme.textPrimary} />
                    </View>
                </TouchableOpacity>

                {/* Segmented control */}
                <View style={styles.segmentWrap}>
                    <View style={styles.segmentBg}>
                        <Chip
                            label="All"
                            active={selectedButton === "All"}
                            onPress={() => onPressTab("All")}
                        />
                        <Chip
                            label="Group"
                            active={selectedButton === "Group"}
                            onPress={() => onPressTab("Group")}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { backgroundColor: theme.bg, paddingTop: 20 },
    row: {
        flexDirection: "row",
        justifyContent: "center",
        width: "100%",
        paddingBottom: scaleSize(6),
        paddingHorizontal: scaleSize(20),
    },

    /* circular icon containers */
    iconCircle: {
        position: "absolute",
        top: scaleSize(10),
        width: scaleSize(28),
        height: scaleSize(28),
        borderRadius: scaleSize(14),
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(7),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 2,
    },
    leftIcon: { left: scaleSize(20) },
    rightIcon: { right: scaleSize(23), justifyContent: "center" },
    // no extra bubble; keep the pill clean
    plusBadge: {
        position: "absolute",
        right: scaleSize(-3),
        bottom: scaleSize(-3),
        width: scaleSize(16),
        height: scaleSize(16),
        borderRadius: scaleSize(8),
        backgroundColor: ACCENT,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: scaleSize(1),
        borderColor: theme.bg,
    },

    /* segmented control */
    segmentWrap: {
        borderRadius: scaleSize(999),
    },
    segmentBg: {
        flexDirection: "row",
        backgroundColor: theme.surface,
        borderRadius: scaleSize(999),
        padding: scaleSize(4),
        borderWidth: scaleSize(1),
        borderColor: HAIRLINE,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 1,
    },
    chip: {
        borderRadius: scaleSize(999),
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: scaleSize(2),
        backgroundColor: theme.surface,
        paddingHorizontal: scaleSize(14),
    },
    chipActive: {
        backgroundColor: ACCENT,
        shadowColor: ACCENT,
        shadowOpacity: 0.15,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 2,
    },
    chipText: {
        fontSize: scaleSize(12.5),
        fontFamily: "Outfit_600SemiBold",
        color: theme.textSecondary,
    },
    chipTextActive: {
        color: theme.textPrimary,
    },
});
