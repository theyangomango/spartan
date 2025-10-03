import React, { memo, useMemo } from "react";
import { Modal, Pressable, Text, StyleSheet, View } from "react-native";
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
        backgroundColor: "rgba(8, 11, 20, 0.82)",
        paddingHorizontal: scaledSize(24),
    },
    modalContainer: {
        width: "100%",
        maxWidth: scaledSize(360),
        paddingTop: scaledSize(30),
        paddingBottom: scaledSize(22),
        paddingHorizontal: scaledSize(22),
        backgroundColor: theme.surface,
        borderRadius: scaledSize(20),
        borderWidth: scaledSize(1),
        borderColor: "rgba(255, 255, 255, 0.08)",
        alignItems: "center",
        shadowColor: "#000000",
        shadowOpacity: 0.22,
        shadowRadius: scaledSize(26),
        shadowOffset: { width: 0, height: scaledSize(14) },
        elevation: 18,
        overflow: "hidden",
    },
    modalAccentBar: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: scaledSize(3.5),
        borderTopLeftRadius: scaledSize(20),
        borderTopRightRadius: scaledSize(20),
    },
    modalIconRing: {
        width: scaledSize(54),
        height: scaledSize(54),
        borderRadius: scaledSize(27),
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaledSize(18),
        borderWidth: scaledSize(1),
    },
    modalTitle: {
        fontSize: scaledSize(18.5),
        fontFamily: "Outfit_700Bold",
        color: theme.textPrimary,
        textAlign: "center",
        marginBottom: scaledSize(8),
        letterSpacing: 0.1,
    },
    modalBody: {
        fontSize: scaledSize(13.4),
        fontFamily: "Outfit_500Medium",
        color: theme.textSecondary,
        textAlign: "center",
        marginBottom: scaledSize(20),
        lineHeight: scaledSize(19),
    },
    modalAction: {
        width: "100%",
        borderRadius: scaledSize(12),
        paddingVertical: scaledSize(12),
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaledSize(12),
    },
    modalActionText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaledSize(14.3),
        letterSpacing: 0.25,
    },
    modalActionSecondary: {
        backgroundColor: theme.field,
        borderWidth: scaledSize(1),
        borderColor: "rgba(255, 255, 255, 0.08)",
        marginBottom: 0,
    },
    modalActionSecondaryText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaledSize(13.4),
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
    iconName,
    iconColor,
}) => {
    const config = useMemo(() => {
        const base = VARIANT_CONFIG[variant] || VARIANT_CONFIG.finish;
        return {
            iconName: iconName || base.iconName,
            iconColor: iconColor || base.iconColor,
            accent: base.accent,
            accentSoft: base.accentSoft,
            accentBorder: base.accentBorder,
            primaryBg: base.primaryBg,
            primaryText: base.primaryText,
            primaryShadow: base.primaryShadow,
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
                                shadowRadius: scaledSize(10),
                                shadowOffset: { width: 0, height: scaledSize(5) },
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
