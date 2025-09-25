import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import theme from "../../../../theme/mfpDark";
import { MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';

import scaleSize from "../../../../helper/scaleSize";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const PANEL_WIDTH = 260;

const ExerciseOptionsPanel = ({ visible, onClose, position, replaceExercise, deleteExercise }) => {
    const scale = useRef(new Animated.Value(0.95)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
                Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
            ]).start();
        } else {
            opacity.setValue(0);
            scale.setValue(0.95);
        }
    }, [visible]);

    const anchorX = typeof position?.anchorX === "number" ? position.anchorX : null;
    const desiredLeft = anchorX != null ? anchorX - PANEL_WIDTH + scaleSize(42) : position?.left;
    // Keep panel within screen bounds
    const safeLeft = Math.min(
        Math.max(12, typeof desiredLeft === "number" ? desiredLeft : 12),
        screenWidth - PANEL_WIDTH - 12
    );
    const safeTop = Math.min(
        Math.max(80, position?.top ?? 80),
        screenHeight - 140
    );
    const caretWidth = scaleSize(12);
    const caretHalf = caretWidth / 2;
    let caretLeft = scaleSize(18);
    if (anchorX != null) {
        const relativeAnchor = anchorX - safeLeft;
        caretLeft = Math.min(
            PANEL_WIDTH - scaleSize(24),
            Math.max(scaleSize(12), relativeAnchor - caretHalf)
        );
    }

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <Animated.View
                    style={[
                        styles.panel,
                        { top: safeTop, left: safeLeft, width: PANEL_WIDTH, transform: [{ scale }], opacity },
                    ]}
                >
                    {/* caret */}
                    <View style={[styles.caret, { left: caretLeft }]} />

                    <Text style={styles.header}>Exercise options</Text>

                    <RNBounceable
                        onPress={() => { replaceExercise(); onClose(); }}
                        style={styles.row}
                        hitSlop={8}
                    >
                        <View style={styles.left}>
                            <View style={[styles.iconBadge, { backgroundColor: "#E9F4FF" }]}>
                                <MaterialCommunityIcons name="swap-horizontal" size={18} color="#0699FF" />
                            </View>
                            <Text style={styles.rowText}>Replace exercise</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#9AA3AF" />
                    </RNBounceable>

                    <View style={styles.divider} />

                    <RNBounceable
                        onPress={() => { deleteExercise(); onClose(); }}
                        style={styles.row}
                        hitSlop={8}
                    >
                        <View style={styles.left}>
                            <View style={[styles.iconBadge, { backgroundColor: "#FDE8E8" }]}>
                                <FontAwesome6 name="trash-can" size={14} color="#E65252" />
                            </View>
                            <Text style={[styles.rowText, { color: "#E65252" }]}>Remove exercise</Text>
                        </View>
                    </RNBounceable>
                </Animated.View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(2,6,23,0.35)", // softer dim
    },
    panel: {
        position: "absolute",
        zIndex: 10,
        borderRadius: scaleSize(18),
        backgroundColor: theme.surface,
        paddingTop: scaleSize(10),
        paddingBottom: scaleSize(8),
        paddingHorizontal: scaleSize(10),
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: scaleSize(14),
        shadowOffset: { width: 0, height: scaleSize(8) },
        elevation: 6,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
    },
    caret: {
        position: "absolute",
        top: scaleSize(-6),
        left: scaleSize(18),
        width: scaleSize(12),
        height: scaleSize(12),
        backgroundColor: theme.surface,
        transform: [{ rotate: "45deg" }],
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
    },
    header: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(13),
        color: theme.textSecondary,
        paddingHorizontal: scaleSize(8),
        paddingBottom: scaleSize(6),
    },
    row: {
        paddingHorizontal: scaleSize(8),
        paddingVertical: scaleSize(10),
        borderRadius: scaleSize(12),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    left: { flexDirection: "row", alignItems: "center" },
    iconBadge: {
        width: scaleSize(28),
        height: scaleSize(28),
        borderRadius: scaleSize(14),
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(10),
    },
    rowText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(15),
        color: theme.textPrimary,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.hairline,
        marginHorizontal: scaleSize(8),
    },
});

export default ExerciseOptionsPanel;
