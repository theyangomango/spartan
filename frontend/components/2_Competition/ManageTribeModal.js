// components/2_Competition/ManageTribeModal.jsx
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Modal, View, StyleSheet, Pressable, Text, TextInput } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";

import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";

function ManageTribeModal({
    visible,
    tribe,
    isOwner,
    renameValue,
    onChangeRename,
    onCancel,
    onRename,
    onLeave,
}) {
    const [copyFeedback, setCopyFeedback] = useState(false);
    const copyFeedbackTimeoutRef = useRef(null);

    const clearCopyFeedback = useCallback(() => {
        if (copyFeedbackTimeoutRef.current) {
            clearTimeout(copyFeedbackTimeoutRef.current);
            copyFeedbackTimeoutRef.current = null;
        }
    }, []);

    const handleCopyCode = useCallback(() => {
        const code = (() => {
            if (!tribe?.code && tribe?.code !== 0) return "";
            if (typeof tribe.code === "string") return tribe.code.trim();
            return String(tribe.code ?? "").trim();
        })();

        if (!code) return;

        try {
            const { setStringAsync } = require("expo-clipboard");
            setStringAsync(code).catch(() => {});
        } catch { }

        setCopyFeedback(true);
        clearCopyFeedback();
        copyFeedbackTimeoutRef.current = setTimeout(() => {
            setCopyFeedback(false);
            copyFeedbackTimeoutRef.current = null;
        }, 2000);
    }, [tribe?.code, clearCopyFeedback]);

    useEffect(() => {
        if (!visible) {
            setCopyFeedback(false);
            clearCopyFeedback();
        }
    }, [visible, clearCopyFeedback]);

    useEffect(() => {
        setCopyFeedback(false);
        clearCopyFeedback();
    }, [tribe?.code, clearCopyFeedback]);

    useEffect(() => () => {
        clearCopyFeedback();
    }, [clearCopyFeedback]);

    return (
        <Modal
            visible={visible}
            transparent
            statusBarTranslucent
            animationType="fade"
            onRequestClose={onCancel}
            presentationStyle="overFullScreen"
        >
            <View style={styles.modalBackdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={withStrongPress(onCancel)} />
                <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
                    <Text style={styles.modalTitle}>Manage tribe</Text>
                    {tribe ? (
                        <>
                            <Text style={styles.metaText}>
                                Name: <Text style={{ fontFamily: "Outfit_600SemiBold" }}>{tribe.name}</Text>
                            </Text>
                            <View style={styles.codeRow}>
                                <Text style={[styles.metaText, styles.codeLabel]}>
                                    Code: <Text style={styles.codeValue}>{tribe.code}</Text>
                                </Text>
                                <RNBounceable
                                    style={styles.copyButton}
                                    onPress={withStrongPress(handleCopyCode)}
                                >
                                    <Text style={styles.copyButtonText}>{copyFeedback ? "Copied!" : "Copy"}</Text>
                                </RNBounceable>
                            </View>
                            {copyFeedback ? (
                                <Text style={styles.copyHint}>Code copied to clipboard</Text>
                            ) : null}
                            <View style={{ height: scaleSize(10) }} />
                            {isOwner && (
                                <>
                                    <TextInput
                                        placeholder="Rename tribe"
                                        placeholderTextColor="#8C95A3"
                                        value={renameValue}
                                        onChangeText={onChangeRename}
                                        style={styles.input}
                                        returnKeyType="done"
                                    />
                                    <RNBounceable
                                        style={[styles.btn, styles.btnPrimary, { marginBottom: scaleSize(8) }]}
                                        onPress={withStrongPress(onRename)}
                                    >
                                        <Text style={[styles.btnText, styles.btnPrimaryText]}>Rename</Text>
                                    </RNBounceable>
                                </>
                            )}
                            <RNBounceable style={[styles.btn, styles.btnDanger]} onPress={withStrongPress(onLeave)}>
                                <Text style={[styles.btnText, styles.btnDangerText]}>Leave tribe</Text>
                            </RNBounceable>
                        </>
                    ) : (
                        <Text style={styles.metaText}>No tribe selected.</Text>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.25)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(22),
    },
    modalCard: {
        width: "100%",
        maxWidth: scaleSize(420),
        backgroundColor: require("../../theme/mfpDark").default.surface,
        borderRadius: scaleSize(16),
        paddingVertical: scaleSize(16),
        paddingHorizontal: scaleSize(14),
    },
    modalTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(18),
        color: "#EAEAEA",
        marginBottom: scaleSize(10),
    },
    metaText: {
        fontFamily: "Outfit_500Medium",
        color: "#EAEAEA",
        marginBottom: scaleSize(6),
    },
    codeRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: scaleSize(6),
        marginTop: scaleSize(10),
    },
    codeLabel: {
        marginBottom: 0,
        marginRight: scaleSize(10),
        flexShrink: 1,
    },
    codeValue: {
        fontFamily: "Outfit_600SemiBold",
    },
    copyButton: {
        backgroundColor: "#2D9EFF",
        paddingVertical: scaleSize(6),
        paddingHorizontal: scaleSize(12),
        borderRadius: scaleSize(8),
        marginLeft: scaleSize(8),
        flexShrink: 0,
    },
    copyButtonText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(12),
        color: "#fff",
    },
    copyHint: {
        fontFamily: "Outfit_500Medium",
        color: "#A5AEC0",
        fontSize: scaleSize(12),
        marginBottom: scaleSize(6),
    },
    input: {
        backgroundColor: require("../../theme/mfpDark").default.field,
        borderRadius: scaleSize(10),
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(10),
        fontFamily: "Outfit_500Medium",
        color: "#EAEAEA",
        marginBottom: scaleSize(12),
    },
    btn: { paddingVertical: scaleSize(10), paddingHorizontal: scaleSize(14), borderRadius: scaleSize(10) },
    btnText: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(14) },
    btnPrimary: { backgroundColor: "#2D9EFF" },
    btnPrimaryText: { color: "#fff" },
    btnDanger: { backgroundColor: "#3B2323", marginTop: scaleSize(4) },
    btnDangerText: { color: "#FF6B6B" },
});

export default memo(ManageTribeModal);
