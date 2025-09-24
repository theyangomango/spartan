// components/3_Workout/sections/StartCluster.jsx
import React, { memo, useMemo, useState, useCallback, useRef } from "react";
import { View, Pressable, StyleSheet, Platform, Animated, useWindowDimensions, Text, Dimensions, Modal } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { AddSquare } from "iconsax-react-native";
import StartOpenButton from "../ui/StartOpenButton";
import { SMALL_SIZE, ROW_WIDTH } from "./workoutTheme";
import theme from "../../../theme/mfpDark";

import scaleSize from "../../../helper/scaleSize";
import { strong as haptic } from "../../../utils/haptics";

const DEFAULT_PRIVACY_ICON = Feather;

const PRIVACY_OPTIONS = Object.freeze([
    {
        value: "global",
        Icon: MaterialCommunityIcons,
        iconName: "earth",
        label: "Global",
        shortLabel: "Global",
        description: "Everyone in the app can see your workout.",
    },
    {
        value: "friends",
        Icon: Feather,
        iconName: "users",
        label: "Friends",
        shortLabel: "Friends",
        description: "Only your friends can see your workout.",
    },
    {
        value: "hidden",
        Icon: Feather,
        iconName: "lock",
        label: "Hidden",
        shortLabel: "Hidden",
        description: "Keep this workout private to you.",
    },
]);

const renderPrivacyIcon = (option, props) => {
    if (!option) return null;
    const IconComponent = option.Icon || DEFAULT_PRIVACY_ICON;
    return <IconComponent name={option.iconName} {...props} />;
};

const StartCluster = ({
    scaleAnim,
    hasActiveWorkout,
    onStartWorkout,
    onOpenNewWorkout,
    onOpenCreatePost,
}) => {
    const scale = scaleAnim || new Animated.Value(1);
    const { height: screenHeight } = useWindowDimensions();
    const buttonRef = useRef(null);
    const [panelAnchor, setPanelAnchor] = useState(null);
    const [privacyMode, setPrivacyMode] = useState(PRIVACY_OPTIONS[0].value);
    const [privacyOpen, setPrivacyOpen] = useState(false);
    const privacyDisabled = !!hasActiveWorkout;
    const currentPrivacy = useMemo(
        () => PRIVACY_OPTIONS.find((opt) => opt.value === privacyMode) || PRIVACY_OPTIONS[0],
        [privacyMode]
    );
    const containerStyle = useMemo(
        () => ({
            minHeight: Math.max(scaleSize(180), Math.round(screenHeight * 0.22)),
            justifyContent: "center",
        }),
        [screenHeight],
    );

    const closePrivacy = useCallback(() => setPrivacyOpen(false), []);

    const togglePrivacy = useCallback(() => {
        if (privacyDisabled) return;
        setPrivacyOpen((open) => !open);
        try { haptic(); } catch { }
    }, [privacyDisabled]);

    const handleSelectPrivacy = useCallback((value) => {
        try { haptic(); } catch { }
        setPrivacyMode(value);
        closePrivacy();
    }, [closePrivacy]);

    const updatePanelAnchor = useCallback(() => {
        if (!buttonRef.current) return;
        try {
            buttonRef.current.measureInWindow((x, y, width, height) => {
                if (typeof x === "number" && typeof y === "number") {
                    setPanelAnchor({ x, y, width, height });
                }
            });
        } catch {
            // noop
        }
    }, []);

    React.useEffect(() => {
        if (privacyDisabled && privacyOpen) closePrivacy();
    }, [privacyDisabled, privacyOpen, closePrivacy]);

    React.useEffect(() => {
        if (privacyOpen) {
            updatePanelAnchor();
            const id = setTimeout(updatePanelAnchor, 30);
            return () => clearTimeout(id);
        }
        return undefined;
    }, [privacyOpen, updatePanelAnchor]);

    const panelStyle = useMemo(() => {
        if (!panelAnchor) return null;
        const panelWidth = scaleSize(188);
        const estPanelHeight = scaleSize(216);
        const horizontalPadding = scaleSize(16);
        const verticalPadding = scaleSize(14);
        const { width: screenW, height: screenH } = Dimensions.get("window");
        const centerX = panelAnchor.x + panelAnchor.width / 2;
        let left = centerX - panelWidth / 2;
        left = Math.min(Math.max(left, horizontalPadding), screenW - panelWidth - horizontalPadding);
        let top = panelAnchor.y - estPanelHeight - scaleSize(12);
        top = Math.max(verticalPadding, Math.min(top, screenH - estPanelHeight - verticalPadding));
        return { left, top, width: panelWidth };
    }, [panelAnchor]);

    const handleButtonLayout = useCallback(() => {
        updatePanelAnchor();
    }, [updatePanelAnchor]);

    const handleCreatePost = useCallback(() => {
        if (typeof onOpenCreatePost !== 'function') return;
        try { haptic(); } catch { }
        onOpenCreatePost();
    }, [onOpenCreatePost]);

    return (
        <>
            {privacyOpen && (
                <Modal
                    transparent
                    animationType="fade"
                    visible
                    onRequestClose={closePrivacy}
                >
                    <View style={styles.modalRoot} pointerEvents="box-none">
                        <Pressable style={styles.privacyBackdrop} onPress={closePrivacy} />
                        {panelStyle && (
                            <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                                <View style={[styles.privacyPanel, panelStyle]} pointerEvents="auto">
                                    {PRIVACY_OPTIONS.map((option) => {
                                        const active = option.value === privacyMode;
                                        return (
                                            <Pressable
                                                key={option.value}
                                                onPress={() => handleSelectPrivacy(option.value)}
                                                style={[styles.privacyOption, active && styles.privacyOptionActive]}
                                                android_ripple={{ color: "rgba(90, 158, 255, 0.16)" }}
                                            >
                                                <View style={styles.privacyOptionHeader}>
                                                    {renderPrivacyIcon(option, {
                                                        size: 16,
                                                        color: active ? theme.textPrimary : "#A9B9D6",
                                                    })}
                                                    <Text style={[styles.privacyOptionLabel, active && styles.privacyOptionLabelActive]}>
                                                        {option.label}
                                                    </Text>
                                                    {active && <Feather name="check" size={14} color={theme.textPrimary} />}
                                                </View>
                                                <Text style={styles.privacyOptionDescription}>{option.description}</Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </View>
                </Modal>
            )}
            <View style={[styles.wrap, containerStyle]} pointerEvents="box-none">
                <View style={styles.actionsRow} pointerEvents="box-none">
                    <View style={[styles.glowWrap, styles.privacyWrap, privacyDisabled && styles.smallBtnDisabled]}>
                        <Pressable
                            ref={buttonRef}
                            onLayout={handleButtonLayout}
                            onPress={togglePrivacy}
                            disabled={privacyDisabled}
                            style={[styles.smallBtn, styles.smallBtnBump, privacyOpen && styles.smallBtnActive]}
                            accessibilityRole="button"
                            accessibilityLabel={`Workout visibility: ${currentPrivacy.label}`}
                            accessibilityState={{ disabled: privacyDisabled, expanded: privacyOpen }}
                        >
                            {renderPrivacyIcon(currentPrivacy, {
                                size: 22,
                                color: "#E5E7EB",
                                style: styles.privacyIcon,
                            })}
                        </Pressable>
                        <Text style={styles.privacyLabel}>{currentPrivacy.shortLabel}</Text>
                    </View>

                    <Animated.View style={{ transform: [{ scale }] }}>
                        <StartOpenButton
                            hasActiveWorkout={hasActiveWorkout}
                            onOpen={onOpenNewWorkout}
                            onStart={() => onStartWorkout?.(privacyMode)}
                        />
                    </Animated.View>

                    <View style={[styles.glowWrap, styles.postWrap]}>
                        <Pressable
                            onPress={handleCreatePost}
                            style={[styles.smallBtn, styles.smallBtnBump]}
                            accessibilityRole="button"
                            accessibilityLabel="Create a new post"
                        >
                            <AddSquare size={22} color="#E5E7EB" />
                        </Pressable>
                        <Text style={[styles.actionLabel, styles.actionLabelHidden]}>POST</Text>
                    </View>
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    modalRoot: { flex: 1, position: "relative" },
    wrap: { alignItems: "center", justifyContent: "center" },
    actionsRow: {
        width: ROW_WIDTH,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: scaleSize(10),
    },
    glowWrap: { position: "relative", alignItems: "center", justifyContent: "center", overflow: "visible" },
    smallBtn: {
        width: SMALL_SIZE,
        height: SMALL_SIZE,
        borderRadius: scaleSize(SMALL_SIZE / 2),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.surface,
        borderWidth: 0,
        ...Platform.select({
            ios: { shadowOpacity: 0 },
            android: { elevation: 0 },
        }),
    },
    smallBtnBump: { top: scaleSize(-6), position: "relative" },
    smallBtnActive: { borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(141, 191, 255, 0.6)" },
    smallBtnDisabled: { opacity: 0.3 },
    privacyWrap: { position: "relative" },
    privacyIcon: { marginBottom: scaleSize(2) },
    privacyLabel: {
        marginTop: scaleSize(4),
        fontSize: scaleSize(11),
        color: "#E3E8F4",
        fontFamily: "Outfit_600SemiBold",
        letterSpacing: 0.2,
        includeFontPadding: false,
        textTransform: "uppercase",
    },
    postWrap: { position: "relative" },
    actionLabel: {
        marginTop: scaleSize(4),
        fontSize: scaleSize(11),
        color: "#E3E8F4",
        fontFamily: "Outfit_600SemiBold",
        letterSpacing: 0.2,
        includeFontPadding: false,
        textTransform: "uppercase",
    },
    actionLabelHidden: { opacity: 0 },
    privacyBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(8, 13, 24, 0.58)",
    },
    privacyPanel: {
        position: "absolute",
        backgroundColor: "rgba(19, 28, 46, 0.94)",
        borderRadius: scaleSize(20),
        paddingVertical: scaleSize(14),
        paddingHorizontal: scaleSize(16),
        borderWidth: scaleSize(1),
        borderColor: "rgba(127, 190, 255, 0.4)",
        gap: scaleSize(8),
        minWidth: scaleSize(210),
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.32,
                shadowRadius: scaleSize(12),
                shadowOffset: { width: 0, height: scaleSize(6) },
            },
            android: { elevation: 10 },
        }),
    },
    privacyOption: {
        borderRadius: scaleSize(14),
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(12),
        backgroundColor: "rgba(17, 26, 43, 0.78)",
        gap: scaleSize(6),
    },
    privacyOptionActive: {
        backgroundColor: "rgba(45, 158, 255, 0.22)",
    },
    privacyOptionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    privacyOptionLabel: {
        flex: 1,
        marginLeft: scaleSize(8),
        marginRight: scaleSize(8),
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14.5),
        color: "#DAE2F6",
    },
    privacyOptionLabelActive: { color: theme.textPrimary },
    privacyOptionDescription: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12.5),
        color: "#ADB9D4",
        lineHeight: scaleSize(15),
    },
});

export default memo(StartCluster);
