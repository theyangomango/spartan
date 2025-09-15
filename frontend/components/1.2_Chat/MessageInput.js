import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import theme from "../../theme/mfpDark";

import scaleSize from "../../helper/scaleSize";

export default function MessageInput({
    text,
    setText,
    onSend,
    onOpenPicker,
    isFocused,
    onFocus,
    onBlur,
    replyDraft,     // { senderHandle, text, hasMedia }
    clearReply,
}) {
    return (
        <View style={[styles.wrap, { marginBottom: isFocused ? 4 : 22 }]}>
            {!!replyDraft && (
                <View style={styles.replyRow}>
                    <View style={styles.replyBar} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.replyTitle}>Replying to {replyDraft.senderHandle}</Text>
                        <Text numberOfLines={1} style={styles.replySnippet}>
                            {replyDraft.text || (replyDraft.hasMedia ? "Media" : "")}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={clearReply} style={styles.closeReply}>
                    <Ionicons name="close" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
            </View>
            )}
            <View style={styles.row}>
                {/* UI-only change: use the image icon (same onPress behavior) */}
                <TouchableOpacity style={styles.iconBtn} onPress={onOpenPicker} activeOpacity={0.85}>
                    <Ionicons name="image" size={18} color={theme.primary} />
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="Type a message…"
                    placeholderTextColor={theme.textSecondary}
                    value={text}
                    onChangeText={setText}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    returnKeyType="send"
                    onSubmitEditing={onSend}
                    hitSlop={{top: scaleSize(10), bottom: scaleSize(10)}}
                />

                <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
                    <Ionicons name="send" size={15} color={theme.textPrimary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: scaleSize(12), paddingTop: scaleSize(6), paddingBottom:scaleSize(10) },
    row: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        borderRadius: scaleSize(28),
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(8),
        ...(Platform.OS === "android" && { elevation: 3 }),
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(10),
        shadowOffset: { width: 0, height: scaleSize(6) },
    },
    iconBtn: {
        width: scaleSize(34),
        height: scaleSize(34),
        borderRadius: scaleSize(17),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.addBtnBg,
    },
    input: {
        flex: 1,
        paddingHorizontal: scaleSize(12),
        fontSize: scaleSize(14.5),
        color: theme.textPrimary,
        fontFamily: "Outfit_500Medium",
    },
    sendBtn: {
        width: scaleSize(36), height: scaleSize(36), borderRadius: scaleSize(18),
        alignItems: "center", justifyContent: "center",
        backgroundColor: theme.primary,
        marginLeft: scaleSize(6),
    },

    // reply preview chip
    replyRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.field,
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        borderRadius: scaleSize(14),
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(8),
        marginBottom: scaleSize(8),
    },
    replyBar: { width: scaleSize(3), height: scaleSize(26), borderRadius: scaleSize(2), backgroundColor: theme.primary, marginRight: scaleSize(8) },
    replyTitle: { fontSize: scaleSize(12), color: theme.textPrimary, fontFamily: "Outfit_600SemiBold" },
    replySnippet: { fontSize: scaleSize(12), color: theme.textSecondary, fontFamily: "Outfit_500Medium" },
    closeReply: { padding: scaleSize(6), marginLeft: scaleSize(6) },
});
