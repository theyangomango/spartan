// components/2_Competition/JoinTribeModal.jsx
import React from "react";
import { Modal, View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";

import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";

const JoinTribeModal = ({ visible, value, onChangeText, onCancel, onJoin }) => {
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
});
