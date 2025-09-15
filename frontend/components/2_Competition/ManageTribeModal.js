// components/2_Competition/ManageTribeModal.jsx
import React, { memo } from "react";
import { Modal, View, StyleSheet, Pressable, Text, TextInput } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";

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
                    <Text style={styles.modalTitle}>Manage tribe</Text>
                    {tribe ? (
                        <>
                            <Text style={styles.metaText}>
                                Name: <Text style={{ fontFamily: "Outfit_600SemiBold" }}>{tribe.name}</Text>
                            </Text>
                            <Text style={styles.metaText}>
                                Code: <Text style={{ fontFamily: "Outfit_600SemiBold" }}>{tribe.code}</Text>
                            </Text>
                            <View style={{ height: 10 }} />
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
                                        style={[styles.btn, styles.btnPrimary, { marginBottom: 8 }]}
                                        onPress={onRename}
                                    >
                                        <Text style={[styles.btnText, styles.btnPrimaryText]}>Rename</Text>
                                    </RNBounceable>
                                </>
                            )}
                            <RNBounceable style={[styles.btn, styles.btnDanger]} onPress={onLeave}>
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
        paddingHorizontal: 22,
    },
    modalCard: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: require("../../theme/mfpDark").default.surface,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 14,
    },
    modalTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: require('../../helper/scaleSize').ts(18),
        color: "#EAEAEA",
        marginBottom: 10,
    },
    metaText: {
        fontFamily: "Outfit_500Medium",
        color: "#EAEAEA",
        marginBottom: 6,
    },
    input: {
        backgroundColor: require("../../theme/mfpDark").default.field,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: "Outfit_500Medium",
        color: "#EAEAEA",
        marginBottom: 12,
    },
    btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
    btnText: { fontFamily: "Outfit_700Bold", fontSize: require('../../helper/scaleSize').ts(14) },
    btnPrimary: { backgroundColor: "#2D9EFF" },
    btnPrimaryText: { color: "#fff" },
    btnDanger: { backgroundColor: "#3B2323", marginTop: 4 },
    btnDangerText: { color: "#FF6B6B" },
});

export default memo(ManageTribeModal);
