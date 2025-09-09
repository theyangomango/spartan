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

                {/* Group + plus */}
                <View style={[styles.iconCircle, styles.rightIcon]}>
                    <TouchableOpacity
                        activeOpacity={0.6}
                        onPress={openCreateGroupChatBottomSheet}
                        style={styles.centerIconHit}
                    >
                        <FontAwesome5 name="users" size={scaleSize(16)} color={ACCENT} />
                    </TouchableOpacity>
                    <View style={styles.plusBubble}>
                        <FontAwesome5 name="plus" size={scaleSize(9)} color={theme.textPrimary} />
                    </View>
                </View>

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
    root: { backgroundColor: theme.bg },
    row: {
        flexDirection: "row",
        justifyContent: "center",
        width: "100%",
        paddingTop: scaleSize(3),
        paddingBottom: scaleSize(6),
        paddingHorizontal: scaleSize(20),
    },

    /* circular icon containers */
    iconCircle: {
        position: "absolute",
        top: scaleSize(10),
        width: scaleSize(32),
        height: scaleSize(32),
        borderRadius: scaleSize(16),
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.hairline,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 2,
    },
    leftIcon: { left: scaleSize(20) },
    rightIcon: { right: scaleSize(23), justifyContent: "center" },
    centerIconHit: { padding: scaleSize(6) },

    plusBubble: {
        position: "absolute",
        right: scaleSize(-5),
        bottom: scaleSize(-5),
        width: scaleSize(18),
        height: scaleSize(18),
        borderRadius: scaleSize(9),
        backgroundColor: ACCENT,
        borderWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: ACCENT,
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(6),
        shadowOffset: { width: 0, height: scaleSize(2) },
        elevation: 3,
    },

    /* segmented control */
    segmentWrap: {
        borderRadius: 999,
    },
    segmentBg: {
        flexDirection: "row",
        backgroundColor: theme.surface,
        borderRadius: 999,
        padding: scaleSize(4),
        borderWidth: 1,
        borderColor: HAIRLINE,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 1,
    },
    chip: {
        borderRadius: 999,
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
