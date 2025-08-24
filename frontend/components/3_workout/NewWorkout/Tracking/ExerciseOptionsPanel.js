import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';

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

    // Keep panel within screen bounds
    const safeLeft = Math.min(
        Math.max(12, position?.left ?? 12),
        screenWidth - PANEL_WIDTH - 12
    );
    const safeTop = Math.min(
        Math.max(80, position?.top ?? 80),
        screenHeight - 140
    );

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
                    <View style={styles.caret} />

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
        borderRadius: 18,
        backgroundColor: "#FFFFFF",
        paddingTop: 10,
        paddingBottom: 8,
        paddingHorizontal: 10,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2,6,23,0.06)",
    },
    caret: {
        position: "absolute",
        top: -6,
        left: 18,
        width: 12,
        height: 12,
        backgroundColor: "#fff",
        transform: [{ rotate: "45deg" }],
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2,6,23,0.06)",
    },
    header: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 13,
        color: "#64748B",
        paddingHorizontal: 8,
        paddingBottom: 6,
    },
    row: {
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    left: { flexDirection: "row", alignItems: "center" },
    iconBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    rowText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 15,
        color: "#0F172A",
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(2,6,23,0.06)",
        marginHorizontal: 8,
    },
});

export default ExerciseOptionsPanel;
