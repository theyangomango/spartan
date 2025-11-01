import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Camera } from "expo-camera";
import { CameraView } from "expo-camera/next";
import { Ionicons } from "@expo/vector-icons";

import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import { lookupBarcode } from "../../screens/fatsecretClient";
import { strong as haptic } from "../../utils/haptics";

const SCAN_RETRY_DELAY_MS = 500;

const WorkoutBarcodeScannerModal = ({ visible, onClose, onResult }) => {
    const [permission, requestPermission] = Camera.useCameraPermissions();
    const [scanLocked, setScanLocked] = useState(false);
    const [scanBusy, setScanBusy] = useState(false);
    const [scanError, setScanError] = useState("");
    const retryTimerRef = useRef(null);

    const clearRetry = useCallback(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    }, []);

    const scheduleRetry = useCallback(() => {
        clearRetry();
        retryTimerRef.current = setTimeout(() => {
            setScanLocked(false);
            retryTimerRef.current = null;
        }, SCAN_RETRY_DELAY_MS);
    }, [clearRetry]);

    useEffect(() => {
        if (visible) {
            setScanError("");
            setScanBusy(false);
            setScanLocked(false);
            if (!permission?.granted) {
                requestPermission().catch(() => {});
            }
        } else {
            clearRetry();
        }
    }, [visible, permission?.granted, requestPermission, clearRetry]);

    useEffect(() => () => clearRetry(), [clearRetry]);

    const handleClose = useCallback(() => {
        clearRetry();
        setScanLocked(false);
        setScanBusy(false);
        setScanError("");
        onClose?.();
    }, [clearRetry, onClose]);

    const handleScan = useCallback(async (scan) => {
        if (!scan || scanLocked || scanBusy) return;
        const raw = String(scan?.data || "").trim();
        if (!raw) return;

        setScanLocked(true);
        setScanBusy(true);
        setScanError("");
        try {
            const digits = raw.replace(/\D/g, "");
            if (!digits) {
                setScanError("Invalid barcode");
                setScanBusy(false);
                scheduleRetry();
                return;
            }
            const response = await lookupBarcode(digits);
            const food = response?.food;
            if (food && food.food_id) {
                try { haptic(); } catch {}
                clearRetry();
                onResult?.(food);
            } else {
                setScanError("No match found");
                setScanBusy(false);
                scheduleRetry();
            }
        } catch {
            setScanError("Lookup failed");
            setScanBusy(false);
            scheduleRetry();
        }
    }, [scanLocked, scanBusy, scheduleRetry, clearRetry, onResult]);

    const renderCamera = () => {
        if (!permission?.granted) {
            return (
                <View style={styles.permissionWrap}>
                    <Text style={styles.permissionText}>Camera access is required to scan barcodes.</Text>
                    <Pressable
                        onPress={() => requestPermission().catch(() => {})}
                        style={styles.permissionButton}
                    >
                        <Text style={styles.permissionButtonText}>Grant Permission</Text>
                    </Pressable>
                </View>
            );
        }

        return (
            <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                    barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
                }}
                onBarcodeScanned={handleScan}
            >
                <View style={styles.overlayHeader}>
                    <Pressable onPress={handleClose} hitSlop={12}>
                        <Ionicons name="close" size={scaleSize(26)} color="#fff" />
                    </Pressable>
                    <Text style={styles.overlayTitle}>Scan a food barcode</Text>
                    <View style={{ width: scaleSize(26) }} />
                </View>
                <View style={styles.overlayFooter}>
                    <Text style={styles.overlayHint}>
                        {scanBusy ? "Looking up…" : (scanError || "Align the barcode within the frame")}
                    </Text>
                </View>
            </CameraView>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={handleClose}
        >
            <View style={styles.root}>
                {renderCamera()}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#000" },
    camera: { flex: 1 },
    overlayHeader: {
        position: "absolute",
        top: Platform.select({ ios: scaleSize(56), android: scaleSize(32), default: scaleSize(48) }),
        left: scaleSize(20),
        right: scaleSize(20),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    overlayTitle: {
        color: "#fff",
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(18),
    },
    overlayFooter: {
        position: "absolute",
        bottom: Platform.select({ ios: scaleSize(60), android: scaleSize(40), default: scaleSize(48) }),
        left: scaleSize(20),
        right: scaleSize(20),
        alignItems: "center",
    },
    overlayHint: {
        color: "#fff",
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(14),
        textAlign: "center",
    },
    permissionWrap: {
        flex: 1,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(24),
    },
    permissionText: {
        color: "#fff",
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(14),
        textAlign: "center",
        marginBottom: scaleSize(20),
    },
    permissionButton: {
        paddingVertical: scaleSize(12),
        paddingHorizontal: scaleSize(20),
        borderRadius: scaleSize(999),
        backgroundColor: theme.primary,
    },
    permissionButtonText: {
        color: "#fff",
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
    },
});

export default WorkoutBarcodeScannerModal;
