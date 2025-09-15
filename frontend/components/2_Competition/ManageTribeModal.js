// components/2_Competition/ManageTribeModal.jsx
import React, { memo } from "react";
import { Modal, View, StyleSheet, Pressable, Text, TextInput } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";

import scaleSize from "../../helper/scaleSize";

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
