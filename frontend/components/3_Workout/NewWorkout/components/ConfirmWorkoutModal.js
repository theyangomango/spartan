import React, { memo } from "react";
import { Modal, Pressable, Text, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";

import scaleSize from "../../../../helper/scaleSize";
import theme from "../../../../theme/mfpDark";
import { withStrongPress } from "../../../../utils/haptics";

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(11, 11, 11, 0.82)",
        paddingHorizontal: scaleSize(24),
    },
    modalContainer: {
        width: "100%",
        maxWidth: scaleSize(360),
        paddingTop: scaleSize(30),
        paddingBottom: scaleSize(22),
        paddingHorizontal: scaleSize(22),
        backgroundColor: theme.surface,
        borderRadius: scaleSize(20),
        borderWidth: scaleSize(1),
        borderColor: "rgba(255, 255, 255, 0.08)",
        alignItems: "center",
        shadowColor: "#000000",
        shadowOpacity: 0.22,
        shadowRadius: scaleSize(26),
        shadowOffset: { width: 0, height: scaleSize(14) },
        elevation: 18,
        overflow: "hidden",
    },
    modalAccentBar: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: scaleSize(3.5),
        borderTopLeftRadius: scaleSize(20),
        borderTopRightRadius: scaleSize(20),
    },
    modalIconRing: {
        width: scaleSize(54),
        height: scaleSize(54),
        borderRadius: scaleSize(27),
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaleSize(18),
        borderWidth: scaleSize(1),
    },
    modalTitle: {
        fontSize: scaleSize(18.5),
        fontFamily: "Outfit_700Bold",
        color: theme.textPrimary,
        textAlign: "center",
        marginBottom: scaleSize(8),
        letterSpacing: 0.1,
    },
    modalBody: {
        fontSize: scaleSize(13.4),
        fontFamily: "Outfit_500Medium",
        color: theme.textSecondary,
        textAlign: "center",
        marginBottom: scaleSize(20),
        lineHeight: scaleSize(19),
    },
    modalAction: {
        width: "100%",
        borderRadius: scaleSize(12),
        paddingVertical: scaleSize(12),
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaleSize(12),
    },
    modalActionText: {
        fontFamily: "Nunito_800ExtraBold",
        fontSize: scaleSize(14.3),
        letterSpacing: 0.25,
    },
    modalActionSecondary: {
        backgroundColor: theme.field,
        borderWidth: scaleSize(1),
        borderColor: "rgba(255, 255, 255, 0.08)",
        marginBottom: 0,
    },
    modalActionSecondaryText: {
        fontFamily: "Nunito_800ExtraBold",
        fontSize: scaleSize(13.4),
        color: theme.textPrimary,
        letterSpacing: 0.2,
    },
    modalActionDisabled: {
        opacity: 0.6,
    },
});

const VARIANT_CONFIG = {
    cancel: {
        iconName: "alert-decagram",
        iconColor: "#FFE3E6",
        accent: "#F36B78",
        accentSoft: "rgba(243, 107, 120, 0.16)",
        accentBorder: "rgba(243, 107, 120, 0.32)",
        primaryBg: "#F25764",
        primaryText: theme.textPrimary,
        primaryShadow: "rgba(242, 87, 100, 0.35)",
    },
    finish: {
        iconName: "check-decagram",
        iconColor: "#C5F8DD",
        accent: theme.success,
        accentSoft: "rgba(16, 185, 129, 0.16)",
        accentBorder: "rgba(16, 185, 129, 0.32)",
        primaryBg: theme.successButton,
        primaryText: theme.textPrimary,
        primaryShadow: "rgba(16, 185, 129, 0.32)",
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
}) => {
    const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.finish;

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
                    <View style={[styles.modalAccentBar, { backgroundColor: config.accent }]} />
                    <View style={[styles.modalIconRing, { backgroundColor: config.accentSoft, borderColor: config.accentBorder }] }>
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
                        style={[
                            styles.modalAction,
                            {
                                backgroundColor: config.primaryBg,
                                shadowColor: config.primaryShadow,
                                shadowOpacity: 0.32,
                                shadowRadius: scaleSize(10),
                                shadowOffset: { width: 0, height: scaleSize(5) },
                                elevation: 6,
                            },
                            primaryBusy && styles.modalActionDisabled,
                        ]}
                        disabled={primaryBusy}
                    >
                        <Text style={[styles.modalActionText, { color: config.primaryText }]}>
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
