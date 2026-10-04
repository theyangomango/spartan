// Custom numeric keypad shown by StatKeyboardProvider while a stat input is active.
import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Animated, Easing } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import scaleSize from "../../../../helper/scaleSize";
import theme from "../../../../theme/mfpDark";
import useStableSafeAreaInsets from "../../../../hooks/useStableSafeAreaInsets";

const StatKeyboardOverlay = ({
    visible,
    onPressDigit,
    onPressDecimal,
    onBackspace,
    onIncrement,
    onDecrement,
    onNext,
    onCollapse,
}) => {
    const insets = useStableSafeAreaInsets();
    const translateY = useRef(new Animated.Value(visible ? 0 : 1)).current;
    const [shouldRender, setShouldRender] = useState(visible);

    useEffect(() => {
        if (visible) setShouldRender(true);
        const easing = visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic);
        Animated.timing(translateY, {
            toValue: visible ? 0 : 1,
            duration: 200,
            easing,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (!visible && finished) setShouldRender(false);
        });
    }, [visible, translateY]);

    if (!shouldRender) return null;

    const animatedStyle = {
        transform: [
            {
                translateY: translateY.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, scaleSize(200)],
                }),
            },
        ],
        opacity: translateY.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
        }),
    };

    const renderKey = (label, onPress, keyStyle) => (
        <TouchableOpacity
            key={label}
            style={[styles.key, keyStyle]}
            activeOpacity={0.7}
            onPress={onPress}
        >
            <Text style={styles.keyLabel}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.overlay} pointerEvents="box-none">
            <Animated.View
                style={[
                    styles.keyboard,
                    { paddingBottom: (insets?.bottom || 0) + scaleSize(14) },
                    animatedStyle,
                ]}
                pointerEvents={visible ? "auto" : "none"}
            >
                <View style={styles.keypad}>
                    <View style={styles.row}>
                        {renderKey("1", () => onPressDigit("1"))}
                        {renderKey("2", () => onPressDigit("2"))}
                        {renderKey("3", () => onPressDigit("3"))}
                    </View>
                    <View style={styles.row}>
                        {renderKey("4", () => onPressDigit("4"))}
                        {renderKey("5", () => onPressDigit("5"))}
                        {renderKey("6", () => onPressDigit("6"))}
                    </View>
                    <View style={styles.row}>
                        {renderKey("7", () => onPressDigit("7"))}
                        {renderKey("8", () => onPressDigit("8"))}
                        {renderKey("9", () => onPressDigit("9"))}
                    </View>
                    <View style={styles.row}>
                        {renderKey(".", onPressDecimal)}
                        {renderKey("0", () => onPressDigit("0"))}
                        <TouchableOpacity style={[styles.key, styles.iconKey]} onPress={onBackspace} activeOpacity={0.7}>
                            <MaterialCommunityIcons name="backspace-outline" size={scaleSize(20)} color={theme.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.actionsColumn}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.collapseButton]}
                        onPress={onCollapse}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="keyboard-outline"
                            size={scaleSize(18)}
                            color={theme.textPrimary}
                        />
                    </TouchableOpacity>

                    <View style={styles.incrementRow}>
                        <TouchableOpacity style={[styles.incrementButton, styles.incrementLeft]} onPress={onDecrement} activeOpacity={0.7}>
                            <Text style={styles.incrementLabel}>−</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.incrementButton, styles.incrementRight]} onPress={onIncrement} activeOpacity={0.7}>
                            <Text style={styles.incrementLabel}>＋</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.nextButton} onPress={onNext} activeOpacity={0.85}>
                        <Text style={styles.nextLabel}>Next</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

export default StatKeyboardOverlay;

const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        alignItems: "center",
        justifyContent: "flex-end",
        pointerEvents: "box-none",
    },
    keyboard: {
        backgroundColor: "#111418",
        borderTopLeftRadius: scaleSize(18),
        borderTopRightRadius: scaleSize(18),
        paddingTop: scaleSize(10),
        paddingHorizontal: scaleSize(12),
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(14),
        shadowOffset: { width: 0, height: -scaleSize(6) },
        elevation: 20,
    },
    keypad: {
        flex: 3,
        marginRight: scaleSize(10),
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: scaleSize(6),
    },
    key: {
        flex: 1,
        height: scaleSize(50),
        marginHorizontal: scaleSize(3),
        borderRadius: scaleSize(12),
        backgroundColor: "#1C2127",
        alignItems: "center",
        justifyContent: "center",
    },
    iconKey: {
        flexDirection: "row",
    },
    keyLabel: {
        fontSize: scaleSize(17),
        fontFamily: "Outfit_600SemiBold",
        color: theme.textPrimary,
    },
    actionsColumn: {
        flex: 1,
        justifyContent: "space-between",
    },
    actionButton: {
        height: scaleSize(44),
        borderRadius: scaleSize(12),
        backgroundColor: "#1C2127",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaleSize(8),
    },
    collapseButton: {
        backgroundColor: "#1C2127",
    },
    incrementRow: {
        flexDirection: "row",
        height: scaleSize(44),
        borderRadius: scaleSize(12),
        overflow: "hidden",
        marginBottom: scaleSize(8),
    },
    incrementButton: {
        flex: 1,
        backgroundColor: "#1C2127",
        alignItems: "center",
        justifyContent: "center",
    },
    incrementLeft: {
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: "rgba(255,255,255,0.1)",
    },
    incrementRight: {},
    incrementLabel: {
        fontSize: scaleSize(18),
        fontFamily: "Outfit_600SemiBold",
        color: theme.textPrimary,
    },
    nextButton: {
        height: scaleSize(44),
        borderRadius: scaleSize(12),
        backgroundColor: theme.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    nextLabel: {
        fontSize: scaleSize(14),
        fontFamily: "Outfit_600SemiBold",
        color: theme.textPrimary,
    },
});
