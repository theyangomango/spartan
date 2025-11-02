import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Image, ScrollView } from "react-native";
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
    attachments = [],
    onRemoveAttachment,
    canSend = false,
    isSending = false,
    isBlocked = false,
}) {
    const disabled = isSending || isBlocked || !canSend;
    const handleSend = () => {
        if (disabled) return;
        onSend?.();
    };

    const handleSubmit = () => {
        if (disabled) return;
        onSend?.();
    };

    return (
        <View style={[styles.wrap, { marginBottom: isFocused ? 4 : 22 }]}>
            {isBlocked && (
                <View style={styles.blockedNotice}>
                    <Ionicons name="lock-closed" size={scaleSize(12)} color={theme.textSecondary} style={{ marginRight: scaleSize(6) }} />
                    <Text style={styles.blockedNoticeText}>Messaging disabled for this conversation.</Text>
                </View>
            )}
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

            {!!attachments.length && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.attachmentsRow}
                >
                    {attachments.map((item) => {
                        const key = item.localId || item.assetId || item.id || item.uri;
                        const isVideo = (item.type || "").startsWith("video");
                        return (
                            <View key={key} style={styles.attachmentItem}>
                                <Image source={{ uri: item.uri }} style={styles.attachmentImage} />
                                {isVideo && (
                                    <View style={styles.attachmentBadge}>
                                        <Ionicons name="play" size={scaleSize(14)} color="#fff" />
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={styles.attachmentRemove}
                                    onPress={() => onRemoveAttachment?.(item.localId || item.uri)}
                                    activeOpacity={isSending ? 1 : 0.7}
                                    disabled={isSending}
                                >
                                    <Ionicons name="close" size={scaleSize(14)} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </ScrollView>
            )}

            <View style={styles.row}>
                <TouchableOpacity
                    style={[styles.iconBtn, isSending && styles.iconBtnDisabled]}
                    onPress={onOpenPicker}
                    activeOpacity={isSending ? 1 : 0.85}
                    disabled={isSending}
                >
                    <Ionicons name="image" size={18} color={theme.primary} />
                    {!!attachments.length && (
                        <View style={styles.iconBadge}>
                            <Text style={styles.iconBadgeText}>{attachments.length}</Text>
                        </View>
                    )}
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
                    onSubmitEditing={handleSubmit}
                    editable={!isSending && !isBlocked}
                    hitSlop={{ top: scaleSize(10), bottom: scaleSize(10) }}
                />

                <TouchableOpacity
                    style={[styles.sendBtn, disabled && styles.sendBtnDisabled]}
                    onPress={handleSend}
                    activeOpacity={disabled ? 1 : 0.8}
                    disabled={disabled}
                >
                    <Ionicons name="send" size={15} color={theme.textPrimary} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: scaleSize(12), paddingTop: scaleSize(6), paddingBottom: scaleSize(10) },
    attachmentsRow: {
        paddingVertical: scaleSize(6),
        paddingHorizontal: scaleSize(2),
        marginBottom: scaleSize(8),
    },
    attachmentItem: {
        width: scaleSize(66),
        height: scaleSize(66),
        borderRadius: scaleSize(16),
        overflow: "hidden",
        marginRight: scaleSize(8),
        backgroundColor: theme.field,
    },
    attachmentImage: { width: "100%", height: "100%", resizeMode: "cover" },
    attachmentRemove: {
        position: "absolute",
        top: scaleSize(4),
        right: scaleSize(4),
        backgroundColor: "rgba(0,0,0,0.55)",
        borderRadius: scaleSize(10),
        padding: scaleSize(2),
    },
    attachmentBadge: {
        position: "absolute",
        left: scaleSize(4),
        bottom: scaleSize(4),
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: scaleSize(10),
        paddingHorizontal: scaleSize(4),
        paddingVertical: scaleSize(2),
    },
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
        position: "relative",
    },
    iconBtnDisabled: {
        opacity: 0.5,
    },
    iconBadge: {
        position: "absolute",
        top: scaleSize(-2),
        right: scaleSize(-2),
        minWidth: scaleSize(18),
        height: scaleSize(18),
        borderRadius: scaleSize(9),
        backgroundColor: theme.primary,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(4),
    },
    iconBadgeText: {
        color: "#fff",
        fontSize: scaleSize(10),
        fontFamily: "Outfit_600SemiBold",
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
    sendBtnDisabled: {
        opacity: 0.4,
    },

    blockedNotice: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 95, 95, 0.12)",
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(6),
        borderRadius: scaleSize(10),
        marginBottom: scaleSize(8),
    },
    blockedNoticeText: {
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
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
