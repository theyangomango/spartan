import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
                        <Ionicons name="close" size={16} color="#6B7280" />
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.row}>
                {/* UI-only change: use the image icon (same onPress behavior) */}
                <TouchableOpacity style={styles.iconBtn} onPress={onOpenPicker} activeOpacity={0.85}>
                    <Ionicons name="image" size={18} color="#517eb6ff" />
                </TouchableOpacity>

                <TextInput
                    style={styles.input}
                    placeholder="Type a message…"
                    placeholderTextColor="#9AA6B2"
                    value={text}
                    onChangeText={setText}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    returnKeyType="send"
                    onSubmitEditing={onSend}
                />

                <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
                    <Ionicons name="send" size={15} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: 12, paddingTop: 6 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.06)",
        borderRadius: 28,
        paddingVertical: 10,
        paddingHorizontal: 8,
        ...(Platform.OS === "android" && { elevation: 3 }),
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
    },
    iconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(45,158,255,0.10)",
    },
    input: {
        flex: 1,
        paddingHorizontal: 12,
        fontSize: 14.5,
        color: "#0F172A",
        fontFamily: "Poppins_500Medium",
    },
    sendBtn: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: "center", justifyContent: "center",
        backgroundColor: "#0499FE",
        marginLeft: 6,
    },

    // reply preview chip
    replyRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F8FF",
        borderWidth: 1,
        borderColor: "rgba(45,158,255,0.15)",
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 8,
    },
    replyBar: { width: 3, height: 26, borderRadius: 2, backgroundColor: "#2D9EFF", marginRight: 8 },
    replyTitle: { fontSize: 12, color: "#0F172A", fontFamily: "Poppins_600SemiBold" },
    replySnippet: { fontSize: 12, color: "#64748B", fontFamily: "Poppins_500Medium" },
    closeReply: { padding: 6, marginLeft: 6 },
});
