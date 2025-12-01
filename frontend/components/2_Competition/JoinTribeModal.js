// components/2_Competition/JoinTribeModal.jsx
import React, { useMemo, useRef, useState } from "react";
import { Modal, View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Camera, CameraView } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";

const JoinTribeModal = ({ visible, value, onChangeText, onCancel, onJoin }) => {
    const [scannerVisible, setScannerVisible] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState("undetermined"); // 'granted' | 'denied' | 'undetermined'
    const [cameraReady, setCameraReady] = useState(false);
    const scannedRef = useRef(false);

    const handleRequestPermission = async () => {
        try {
            const current = await Camera.getCameraPermissionsAsync();
            if (current?.granted) {
                setPermissionStatus("granted");
                setScannerVisible(true);
                return;
            }
            const status = await Camera.requestCameraPermissionsAsync();
            const granted = status?.granted === true;
            setPermissionStatus(granted ? "granted" : status?.status || "denied");
            if (granted) {
                setScannerVisible(true);
            }
        } catch (err) {
            setPermissionStatus("denied");
        }
    };

    const handleCloseScanner = () => {
        setScannerVisible(false);
        scannedRef.current = false;
        setCameraReady(false);
    };

    const handleBarcodeScanned = ({ data }) => {
        if (scannedRef.current) return;
        scannedRef.current = true;
        const cleaned = (data || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (cleaned) {
            onChangeText?.(cleaned);
            setTimeout(() => onJoin?.(), 150);
        }
        handleCloseScanner();
    };

    const permissionDenied = permissionStatus === "denied";

    const renderScanner = useMemo(() => {
        if (!scannerVisible) return null;
        return (
            <View style={styles.scannerOverlay}>
                <View style={styles.scannerHeader}>
                    <Text style={styles.scannerTitle}>Scan tribe QR</Text>
                    <RNBounceable onPress={withStrongPress(handleCloseScanner)} hitSlop={8}>
                        <Ionicons name="close" size={scaleSize(22)} color="#fff" />
                    </RNBounceable>
                </View>

                {permissionDenied ? (
                    <View style={styles.permissionWrap}>
                        <Text style={styles.permissionText}>
                            Camera access is needed to scan a tribe QR code.
                        </Text>
                        <RNBounceable
                            style={[styles.btn, styles.btnPrimary, styles.permissionBtn]}
                            onPress={withStrongPress(handleRequestPermission)}
                        >
                            <Text style={[styles.btnText, styles.btnPrimaryText]}>Grant Camera Access</Text>
                        </RNBounceable>
                    </View>
                ) : (
                    <View style={styles.scannerCameraWrap}>
                        <CameraView
                            style={styles.scannerCamera}
                            barcodeScannerSettings={{ barCodeTypes: ["qr"] }}
                            onBarcodeScanned={handleBarcodeScanned}
                            onCameraReady={() => {
                                setCameraReady(true);
                            }}
                        />
                        {!cameraReady ? (
                            <View style={styles.scannerLoading}>
                                <ActivityIndicator color="#fff" />
                                <Text style={styles.permissionText}>Starting camera…</Text>
                            </View>
                        ) : null}
                    </View>
                )}
            </View>
        );
    }, [scannerVisible, permissionDenied, cameraReady]);

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
                {/* Backdrop to close */}
                <Pressable style={StyleSheet.absoluteFill} onPress={withStrongPress(onCancel)} />

                <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>Join a tribe</Text>
                    <Text style={styles.metaText}>Scan the tribe’s QR code to join instantly.</Text>

                    <RNBounceable
                        style={[styles.btn, styles.btnPrimary, styles.scanBtn]}
                        onPress={withStrongPress(handleRequestPermission)}
                    >
                        <Ionicons name="qr-code" size={scaleSize(18)} color="#fff" style={{ marginRight: scaleSize(8) }} />
                        <Text style={[styles.btnText, styles.btnPrimaryText]}>Scan QR</Text>
                    </RNBounceable>

                    <Text style={styles.metaHint}>Need a backup? Enter code manually.</Text>
                    <TextInput
                        placeholder="Enter code (e.g. 7F2K9Q)"
                        placeholderTextColor="#8C95A3"
                        value={value}
                        // Auto-capitalize + disable “smart” corrections
                        autoCapitalize="characters"
                        autoCorrect={false}
                        autoComplete="off"
                        keyboardType="default"
                        returnKeyType="done"
                        onChangeText={(t) => {
                            // Uppercase + strip spaces as user types
                            const cleaned = (t || "").toUpperCase().replace(/\s+/g, "");
                            onChangeText?.(cleaned);
                        }}
                        style={styles.input}
                    />

                    <View style={styles.modalActions}>
                        <RNBounceable style={[styles.btn, styles.btnGhost]} onPress={withStrongPress(onCancel)}>
                            <Text style={[styles.btnText, styles.btnGhostText]}>Cancel</Text>
                        </RNBounceable>
                        <RNBounceable style={[styles.btn, styles.btnPrimary]} onPress={withStrongPress(onJoin)}>
                            <Text style={[styles.btnText, styles.btnPrimaryText]}>Join</Text>
                        </RNBounceable>
                    </View>
                </View>

                {renderScanner}
            </View>
        </Modal>
    );
};

export default JoinTribeModal;

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
        marginBottom: scaleSize(12),
    },
    metaHint: {
        fontFamily: "Outfit_500Medium",
        color: "#A5AEC0",
        marginTop: scaleSize(12),
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
        letterSpacing: 1, // a bit of spacing helps codes feel clearer
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: scaleSize(10),
    },
    btn: {
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(14),
        borderRadius: scaleSize(10),
    },
    btnText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
    },
    btnPrimary: { backgroundColor: "#2D9EFF" },
    btnPrimaryText: { color: "#fff" },
    btnGhost: { backgroundColor: require("../../theme/mfpDark").default.field },
    btnGhostText: { color: "#EAEAEA" },
    scanBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: scaleSize(4),
    },
    scannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.75)",
        paddingTop: scaleSize(50),
        paddingHorizontal: scaleSize(16),
        paddingBottom: scaleSize(24),
        justifyContent: "flex-start",
    },
    scannerHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: scaleSize(12),
    },
    scannerTitle: {
        fontFamily: "Outfit_700Bold",
        color: "#fff",
        fontSize: scaleSize(16),
    },
    scannerCameraWrap: {
        borderRadius: scaleSize(16),
        overflow: "hidden",
        backgroundColor: "rgba(0,0,0,0.35)",
        minHeight: scaleSize(280),
    },
    scannerCamera: {
        width: "100%",
        height: scaleSize(320),
    },
    scannerLoading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
        gap: scaleSize(8),
    },
    permissionWrap: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(30),
        paddingHorizontal: scaleSize(16),
        gap: scaleSize(10),
    },
    permissionText: {
        fontFamily: "Outfit_500Medium",
        color: "#EAEAEA",
        textAlign: "center",
    },
    permissionBtn: {
        width: "100%",
    },
});
