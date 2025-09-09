// components/2_Competition/CreateTribeModal.jsx
import React, { memo } from "react";
import { Modal, View, StyleSheet, Pressable, Text, TextInput } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";

function CreateTribeModal({ visible, value, onChangeText, onCancel, onCreate }) {
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
                <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
                <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
                    <Text style={styles.modalTitle}>Create a tribe</Text>
                    <TextInput
                        placeholder="Tribe name"
                        placeholderTextColor="#8C95A3"
                        value={value}
                        onChangeText={onChangeText}
                        style={styles.input}
                        autoFocus
                        returnKeyType="done"
                    />
                    <View style={styles.modalActions}>
                        <RNBounceable style={[styles.btn, styles.btnGhost]} onPress={onCancel}>
                            <Text style={[styles.btnText, styles.btnGhostText]}>Cancel</Text>
                        </RNBounceable>
                        <RNBounceable style={[styles.btn, styles.btnPrimary]} onPress={onCreate}>
                            <Text style={[styles.btnText, styles.btnPrimaryText]}>Create</Text>
                        </RNBounceable>
                    </View>
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
        paddingHorizontal: 22,
    },
    modalCard: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#252733",
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
        backgroundColor: "#1E232C",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: "Outfit_500Medium",
        color: "#EAEAEA",
        marginBottom: 12,
    },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
    btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
    btnText: { fontFamily: "Outfit_700Bold", fontSize: 14 },
    btnPrimary: { backgroundColor: "#2D9EFF" },
    btnPrimaryText: { color: "#fff" },
    btnGhost: { backgroundColor: "#1F2730" },
    btnGhostText: { color: "#EAEAEA" },
});

export default memo(CreateTribeModal);
