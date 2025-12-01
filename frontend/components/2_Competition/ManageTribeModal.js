// components/2_Competition/ManageTribeModal.jsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, View, StyleSheet, Pressable, Text, TextInput } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import Svg, { Rect } from "react-native-svg";
import qrcode from "qrcode-generator";

import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";

const TribeQRCode = memo(({ value, size = 220 }) => {
    const matrix = useMemo(() => {
        try {
            const qr = qrcode(0, "M");
            qr.addData(value || "");
            qr.make();
            const count = qr.getModuleCount();
            const cells = [];
            for (let row = 0; row < count; row += 1) {
                for (let col = 0; col < count; col += 1) {
                    if (qr.isDark(row, col)) cells.push({ row, col });
                }
            }
            return { cells, count };
        } catch {
            return { cells: [], count: 0 };
        }
    }, [value]);

    if (!value || !matrix.count) return null;
    const cellSize = size / matrix.count;
    return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Rect x="0" y="0" width={size} height={size} fill="#fff" />
            {matrix.cells.map((cell, idx) => (
                <Rect
                    key={`${cell.row}-${cell.col}-${idx}`}
                    x={cell.col * cellSize}
                    y={cell.row * cellSize}
                    width={cellSize}
                    height={cellSize}
                    fill="#0b0b0b"
                />
            ))}
        </Svg>
    );
});

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
                            <Text style={[styles.metaText, { marginBottom: scaleSize(4) }]}>Share QR to join:</Text>
                            <View style={styles.qrWrap}>
                                <TribeQRCode value={tribe.code} size={scaleSize(220)} />
                            </View>
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
    qrWrap: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(10),
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
