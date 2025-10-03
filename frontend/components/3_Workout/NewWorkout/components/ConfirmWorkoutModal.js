import React, { memo, useMemo } from "react";
import { Modal, Pressable, Text, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";

import scaleSize from "../../../../helper/scaleSize";
import { ss as scaledSize } from "../../../../utils/scale";
import theme from "../../../../theme/mfpDark";
import { withStrongPress } from "../../../../utils/haptics";

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(8, 13, 24, 0.78)",
        paddingHorizontal: scaleSize(scaledSize(24)),
    },
    modalContainer: {
        width: "100%",
        maxWidth: scaleSize(scaledSize(360)),
        paddingTop: scaleSize(scaledSize(36)),
        paddingBottom: scaleSize(scaledSize(24)),
        paddingHorizontal: scaleSize(scaledSize(24)),
        backgroundColor: "rgba(20, 28, 45, 0.96)",
        borderRadius: scaleSize(scaledSize(24)),
        borderWidth: scaleSize(scaledSize(1)),
        borderColor: "rgba(99, 123, 171, 0.38)",
        alignItems: "center",
        shadowColor: "#000000",
        shadowOpacity: 0.28,
        shadowRadius: scaleSize(scaledSize(24)),
        shadowOffset: { width: 0, height: scaleSize(scaledSize(14)) },
        elevation: 16,
        overflow: "hidden",
    },
    modalAccentBar: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: scaleSize(scaledSize(6)),
        borderTopLeftRadius: scaleSize(scaledSize(24)),
        borderTopRightRadius: scaleSize(scaledSize(24)),
        opacity: 0.9,
    },
    modalIconRing: {
        width: scaleSize(scaledSize(58)),
        height: scaleSize(scaledSize(58)),
        borderRadius: scaleSize(scaledSize(32)),
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaleSize(scaledSize(18)),
        borderWidth: scaleSize(scaledSize(1.5)),
    },
    modalIconRingDanger: {
        backgroundColor: "rgba(239,68,68,0.12)",
        borderColor: "rgba(239,68,68,0.36)",
    },
    modalIconRingSuccess: {
        backgroundColor: "rgba(34,197,94,0.12)",
        borderColor: "rgba(34,197,94,0.36)",
    },
    modalTitle: {
        fontSize: scaleSize(scaledSize(20)),
        fontFamily: "Poppins_700Bold",
        color: theme.textPrimary,
        textAlign: "center",
        marginBottom: scaleSize(scaledSize(10)),
        letterSpacing: 0.2,
    },
    modalBody: {
        fontSize: scaleSize(scaledSize(13.8)),
        fontFamily: "Outfit_500Medium",
        color: theme.textSecondary,
        textAlign: "center",
        marginBottom: scaleSize(scaledSize(22)),
        lineHeight: scaleSize(scaledSize(20)),
    },
    modalAction: {
        width: "100%",
        borderRadius: scaleSize(scaledSize(14)),
        paddingVertical: scaleSize(scaledSize(12)),
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaleSize(scaledSize(12)),
    },
    modalActionDanger: {
        backgroundColor: "#EF4444",
        shadowColor: "#EF4444",
        shadowOpacity: 0.32,
        shadowRadius: scaleSize(scaledSize(12)),
        shadowOffset: { width: 0, height: scaleSize(scaledSize(6)) },
        elevation: 6,
    },
    modalActionSuccess: {
        backgroundColor: "#10B981",
        shadowColor: "#10B981",
        shadowOpacity: 0.32,
        shadowRadius: scaleSize(scaledSize(12)),
        shadowOffset: { width: 0, height: scaleSize(scaledSize(6)) },
        elevation: 6,
    },
    modalActionSecondary: {
        backgroundColor: "rgba(148, 163, 184, 0.12)",
        borderWidth: scaleSize(scaledSize(1)),
        borderColor: "rgba(148, 197, 255, 0.24)",
        marginBottom: 0,
    },
    modalActionText: {
        fontFamily: "Poppins_700Bold",
        fontSize: scaleSize(scaledSize(14.5)),
        color: "#F8FAFC",
        letterSpacing: 0.3,
    },
    modalActionSecondaryText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(scaledSize(13.5)),
        color: theme.textPrimary,
        letterSpacing: 0.25,
    },
    modalActionDisabled: {
        opacity: 0.6,
    },
});

const VARIANT_CONFIG = {
    cancel: {
        gradient: ["#2D9EFF", "#60A5FA"],
        iconName: "trash-can-outline",
        iconColor: "#FEE2E2",
        ringStyle: styles.modalIconRingDanger,
        actionStyle: styles.modalActionDanger,
    },
    finish: {
        gradient: ["#34D399", "#22C55E"],
        iconName: "check-decagram",
        iconColor: "#D1FAE5",
        ringStyle: styles.modalIconRingSuccess,
        actionStyle: styles.modalActionSuccess,
    },
};

const ConfirmWorkoutModal = ({
    visible,
    variant = "finish",
    title,
    body,
    primaryLabel,
    primaryBusyLabel,
    primaryBusy = false,
    secondaryLabel,
    onPrimary,
    onSecondary,
    onRequestClose,
    iconName,
    iconColor,
}) => {
    const config = useMemo(() => {
        const base = VARIANT_CONFIG[variant] || VARIANT_CONFIG.finish;
        return {
            gradient: base.gradient,
            iconName: iconName || base.iconName,
            iconColor: iconColor || base.iconColor,
            ringStyle: base.ringStyle,
            actionStyle: base.actionStyle,
        };
    }, [variant, iconName, iconColor]);

    const handleBackdropPress = () => {
        if (onRequestClose) {
            onRequestClose();
            return;
        }
        if (onSecondary) onSecondary();
    };

    const handlePrimaryPress = () => {
        if (onPrimary) onPrimary();
    };

    const handleSecondaryPress = () => {
        if (onSecondary) onSecondary();
    };

    const renderBody = () => {
        if (!body) return null;
        return <Text style={styles.modalBody}>{body}</Text>;
    };

    return (
        <Modal
            animationType="fade"
            transparent
            visible={visible}
            onRequestClose={onRequestClose}
            statusBarTranslucent
        >
            <Pressable style={styles.modalOverlay} onPress={withStrongPress(handleBackdropPress)}>
                <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                    <LinearGradient
                        colors={config.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.modalAccentBar}
                    />
                    <View style={[styles.modalIconRing, config.ringStyle]}>
                        <MaterialCommunityIcons
                            name={config.iconName}
                            size={scaleSize(26)}
                            color={config.iconColor}
                        />
                    </View>
                    <Text style={styles.modalTitle}>{title}</Text>
                    {renderBody()}
                    <RNBounceable
                        onPress={withStrongPress(handlePrimaryPress)}
                        style={[styles.modalAction, config.actionStyle, primaryBusy && styles.modalActionDisabled]}
                        disabled={primaryBusy}
                    >
                        <Text style={styles.modalActionText}>
                            {primaryBusy ? (primaryBusyLabel || primaryLabel) : primaryLabel}
                        </Text>
                    </RNBounceable>
                    {secondaryLabel ? (
                        <RNBounceable
                            onPress={withStrongPress(handleSecondaryPress)}
                            style={[styles.modalAction, styles.modalActionSecondary]}
                        >
                            <Text style={styles.modalActionSecondaryText}>{secondaryLabel}</Text>
                        </RNBounceable>
                    ) : null}
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default memo(ConfirmWorkoutModal);
