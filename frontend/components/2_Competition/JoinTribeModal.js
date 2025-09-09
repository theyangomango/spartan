// components/2_Competition/JoinTribeModal.jsx
import React from "react";
import { Modal, View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";

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
                <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

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
                        <RNBounceable style={[styles.btn, styles.btnGhost]} onPress={onCancel}>
                            <Text style={[styles.btnText, styles.btnGhostText]}>Cancel</Text>
                        </RNBounceable>
                        <RNBounceable style={[styles.btn, styles.btnPrimary]} onPress={onJoin}>
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
        paddingHorizontal: 22,
    },
    modalCard: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#2E3445",
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 14,
    },
    modalTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: 18,
        color: "#EAEAEA",
        marginBottom: 10,
    },
    input: {
        backgroundColor: "#2A3142",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: "Outfit_500Medium",
        color: "#EAEAEA",
        marginBottom: 12,
        letterSpacing: 1, // a bit of spacing helps codes feel clearer
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
    },
    btn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
    },
    btnText: {
        fontFamily: "Outfit_700Bold",
        fontSize: 14,
    },
    btnPrimary: { backgroundColor: "#2D9EFF" },
    btnPrimaryText: { color: "#fff" },
    btnGhost: { backgroundColor: "#2A3142" },
    btnGhostText: { color: "#EAEAEA" },
});
