import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Animated, Easing } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import scaleSize from "../../../../helper/scaleSize";
import theme from "../../../../theme/mfpDark";
import useStableSafeAreaInsets from "../../../../hooks/useStableSafeAreaInsets";

const StatKeyboardContext = createContext(null);

export const useStatKeyboard = () => useContext(StatKeyboardContext);

const MAX_REGISTERED = 400;

const StatKeyboardOverlay = ({
    activeId,
    visible,
    onPressDigit,
    onPressDecimal,
    onBackspace,
    onIncrement,
    onDecrement,
    onCopyPrevious,
    onNext,
    canCopyPrevious,
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

export function StatKeyboardProvider({ children }) {
    const inputsRef = useRef(new Map());
    const orderRef = useRef([]);
    const activeIdRef = useRef(null);
    const [activeId, setActiveId] = useState(null);

    const pendingClearIdRef = useRef(null);
    const pendingClearTimeoutRef = useRef(null);

    const cancelPendingClear = useCallback(() => {
        if (pendingClearTimeoutRef.current) {
            clearTimeout(pendingClearTimeoutRef.current);
            pendingClearTimeoutRef.current = null;
            pendingClearIdRef.current = null;
        }
    }, []);

    const callActive = useCallback((method, ...args) => {
        const id = activeIdRef.current;
        if (!id) return null;
        const handlers = inputsRef.current.get(id);
        if (!handlers || typeof handlers[method] !== "function") return null;
        return handlers[method](...args);
    }, []);

    const setActiveInput = useCallback((id) => {
        if (pendingClearIdRef.current && pendingClearTimeoutRef.current) {
            cancelPendingClear();
        }
        if (activeIdRef.current !== id) {
            activeIdRef.current = id;
            setActiveId(id);
        }
        if (!id) {
            return;
        }
    }, [callActive, cancelPendingClear]);

    const clearActiveInput = useCallback((id) => {
        if (id && activeIdRef.current !== id) {
            return;
        }
        const prev = activeIdRef.current;
        const handlers = prev ? inputsRef.current.get(prev) : null;
        if (handlers && typeof handlers.forceBlur === "function") {
            try { handlers.forceBlur(); } catch {}
        }
        activeIdRef.current = null;
        setActiveId(null);
        if (handlers && typeof handlers.onCustomKeyboardDismissed === "function") {
            try { handlers.onCustomKeyboardDismissed(); } catch {}
        }
    }, []);

    const requestClearActiveInput = useCallback((id) => {
        cancelPendingClear();
        pendingClearIdRef.current = id;
        pendingClearTimeoutRef.current = setTimeout(() => {
            pendingClearTimeoutRef.current = null;
            const active = activeIdRef.current;
            if (!active) {
                clearActiveInput(undefined);
                return;
            }
            if (id && active === id) {
                return;
            }
            if (!id || active !== id) {
                clearActiveInput(id);
            }
        }, 40);
    }, [cancelPendingClear, clearActiveInput]);

    const focusNext = useCallback(() => {
        const order = orderRef.current;
        if (!order.length) return;
        const id = activeIdRef.current;
        if (!id) return;
        const idx = order.indexOf(id);
        if (idx < 0) return;

        if (order.length === 1 || idx === order.length - 1) {
            const handler = inputsRef.current.get(id);
            if (handler && typeof handler.blur === "function") {
                handler.blur();
            }
            clearActiveInput(id);
            return;
        }

        const nextId = order[idx + 1];
        const handler = inputsRef.current.get(nextId);
        if (handler && typeof handler.focus === "function") {
            handler.focus();
        }
    }, [clearActiveInput]);

    const registerInput = useCallback((id, handlers) => {
        if (!id || typeof id !== "string") return () => {};
        if (inputsRef.current.size > MAX_REGISTERED) {
            inputsRef.current.clear();
            orderRef.current = [];
        }
        inputsRef.current.set(id, handlers);
        orderRef.current = [...orderRef.current.filter((x) => x !== id), id];
        return () => {
            inputsRef.current.delete(id);
            orderRef.current = orderRef.current.filter((x) => x !== id);
            if (activeIdRef.current === id) {
                requestClearActiveInput(id);
            }
        };
    }, [requestClearActiveInput]);

    const collapseKeyboard = useCallback(() => {
        cancelPendingClear();
        const current = activeIdRef.current;
        if (current) {
            clearActiveInput(current);
        } else {
            clearActiveInput(undefined);
        }
    }, [cancelPendingClear, clearActiveInput]);

    const contextValue = useMemo(() => ({
        registerInput,
        setActiveInput,
        clearActiveInput,
        requestClearActiveInput,
        getHandlers: (id) => (id ? inputsRef.current.get(id) || null : null),
        focusNext,
        activeId,
        collapseKeyboard,
    }), [
        registerInput,
        setActiveInput,
        clearActiveInput,
        requestClearActiveInput,
        focusNext,
        activeId,
        collapseKeyboard,
    ]);

    const visible = !!activeId;
    const handlers = activeId ? inputsRef.current.get(activeId) : null;

    return (
        <StatKeyboardContext.Provider value={contextValue}>
            <View style={{ flex: 1 }}>
                {children}
                <StatKeyboardOverlay
                    activeId={activeId}
                    visible={visible}
                    onPressDigit={(digit) => callActive("appendChar", digit)}
                    onPressDecimal={() => callActive("addDecimal")}
                    onBackspace={() => callActive("backspace")}
                    onIncrement={() => callActive("increment")}
                    onDecrement={() => callActive("decrement")}
                    onCopyPrevious={() => callActive("copyPrevious")}
                    onNext={() => {
                        if (handlers && typeof handlers.blur === "function") {
                            handlers.blur();
                        }
                        focusNext();
                    }}
                    onCollapse={collapseKeyboard}
                />
            </View>
        </StatKeyboardContext.Provider>
    );
}

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
