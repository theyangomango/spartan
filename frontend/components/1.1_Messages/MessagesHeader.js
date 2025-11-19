// components/1.1_Messages/MessagesHeader.jsx
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import scaleSize from "../../helper/scaleSize";
import theme from "../../theme/mfpDark";

const ACCENT = theme.primary;
const HAIRLINE = theme.hairline;
const BACK_ICON_COLOR = theme.textSecondary;

const BASE_TOP_PADDING = scaleSize(6);
const PILL_ACTIVE_BG = "#59a9ff";
const PILL_INACTIVE_BG = "rgba(8,8,21,0.92)";
const PILL_INACTIVE_BORDER = "rgba(255,255,255,0.18)";
const PILL_ACTIVE_TEXT = "#05060f";
const PILL_INACTIVE_TEXT = "rgba(255,255,255,0.7)";
const CHIP_WIDTH = scaleSize(105);
const CHIP_HEIGHT = scaleSize(34);
const CHIP_MARGIN_HORIZONTAL = scaleSize(3);
const SEGMENT_PADDING = scaleSize(4);
const CHIP_SLIDE_DISTANCE = CHIP_WIDTH + CHIP_MARGIN_HORIZONTAL * 2;
const SLIDER_BASE_LEFT = SEGMENT_PADDING + CHIP_MARGIN_HORIZONTAL;

export default function MessagesHeader({
    toFeedScreen,
    openCreateGroupChatBottomSheet,
    setScope,
    topInset,
}) {
    const insets = useSafeAreaInsets();
    const [selectedButton, setSelectedButton] = useState("All");
    const sliderProgress = useRef(new Animated.Value(0)).current;

    const safeTop = Math.max(
        typeof topInset === "number" ? topInset : insets?.top || 0,
        0,
    );
    const headerPaddingTop = BASE_TOP_PADDING + safeTop;

    const onPressTab = (tab) => {
        setSelectedButton(tab);
        setScope(tab);
    };

    useEffect(() => {
        Animated.spring(sliderProgress, {
            toValue: selectedButton === "Group" ? 1 : 0,
            stiffness: 320,
            damping: 26,
            mass: 0.7,
            useNativeDriver: true,
        }).start();
    }, [selectedButton, sliderProgress]);

    const sliderTranslateX = sliderProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, CHIP_SLIDE_DISTANCE],
    });

    const Chip = ({ label, active, onPress }) => (
        <RNBounceable
            onPress={onPress}
            style={styles.chip}
        >
            <Text
                style={[
                    styles.chipText,
                    active ? styles.chipTextActive : styles.chipTextInactive,
                ]}
            >
                {label}
            </Text>
        </RNBounceable>
    );

    return (
        <View style={[styles.root, { paddingTop: headerPaddingTop }]}>
            <View style={styles.row}>
                {/* Back */}
                <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={toFeedScreen}
                    style={styles.leftIcon}
                    hitSlop={{
                        top: scaleSize(8),
                        bottom: scaleSize(8),
                        left: scaleSize(8),
                        right: scaleSize(8),
                    }}
                >
                    <Ionicons name="chevron-back" size={scaleSize(20)} color={BACK_ICON_COLOR} />
                </TouchableOpacity>

                {/* Create group — simplified to a single icon for cleaner look */}
                <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={openCreateGroupChatBottomSheet}
                    style={[styles.iconCircle, styles.rightIcon]}
                >
                    <FontAwesome5 name="users" size={scaleSize(15)} color={ACCENT} />
                    {/* subtle in-pill + badge */}
                    <View style={styles.plusBadge}>
                        <FontAwesome5 name="plus" size={scaleSize(8)} color={theme.textPrimary} />
                    </View>
                </TouchableOpacity>

                {/* Segmented control */}
                <View style={styles.segmentWrap}>
                    <View style={styles.segmentBg}>
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.segmentSlider,
                                { transform: [{ translateX: sliderTranslateX }] },
                            ]}
                        />
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
        alignItems: "center",
        width: "100%",
        paddingBottom: scaleSize(6),
        paddingHorizontal: scaleSize(20),
    },

    /* circular icon containers */
    iconCircle: {
        position: "absolute",
        top: "50%",
        transform: [{ translateY: -scaleSize(16) }],
        width: scaleSize(30),
        aspectRatio: 1,
        borderRadius: scaleSize(100),
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: HAIRLINE,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(7),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 2,
    },
    leftIcon: {
        position: "absolute",
        left: scaleSize(20),
        top: "50%",
        transform: [{ translateY: -scaleSize(18) }],
        height: scaleSize(36),
        width: scaleSize(36),
        borderRadius: scaleSize(18),
        alignItems: "center",
        justifyContent: "center",
    },
    rightIcon: { right: scaleSize(23), justifyContent: "center" },
    // no extra bubble; keep the pill clean
    plusBadge: {
        position: "absolute",
        right: scaleSize(-6),
        bottom: scaleSize(-4.5),
        width: scaleSize(17),
        aspectRatio: 1,
        borderRadius: scaleSize(10),
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
        position: "relative",
        flexDirection: "row",
        backgroundColor: PILL_INACTIVE_BG,
        borderRadius: scaleSize(999),
        padding: SEGMENT_PADDING,
        borderWidth: scaleSize(1),
        borderColor: PILL_INACTIVE_BORDER,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 1,
    },
    segmentSlider: {
        position: "absolute",
        left: SLIDER_BASE_LEFT,
        top: SEGMENT_PADDING,
        width: CHIP_WIDTH,
        height: CHIP_HEIGHT,
        borderRadius: scaleSize(20),
        backgroundColor: PILL_ACTIVE_BG,
        borderWidth: scaleSize(2),
        borderColor: PILL_ACTIVE_BG,
        shadowColor: PILL_ACTIVE_BG,
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(12),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 2,
    },
    chip: {
        width: CHIP_WIDTH,
        height: CHIP_HEIGHT,
        borderRadius: scaleSize(20),
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: CHIP_MARGIN_HORIZONTAL,
        zIndex: 1,
    },
    chipText: {
        fontSize: scaleSize(14),
        fontFamily: "Outfit_600SemiBold",
        letterSpacing: 0.3,
    },
    chipTextActive: {
        color: PILL_ACTIVE_TEXT,
    },
    chipTextInactive: {
        color: PILL_INACTIVE_TEXT,
    },
});
