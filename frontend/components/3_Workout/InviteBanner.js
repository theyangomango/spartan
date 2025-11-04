// components/3_Workout/ui/InviteBanner.js
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import FastImage from "react-native-fast-image";
import theme from "../../theme/mfpDark";

import scaleSize from "../../helper/scaleSize";

export default function InviteBanner({ invite, pfpUri, onAccept, onDecline }) {
    return (
        <View style={styles.inviteCard}>
            <View style={styles.inviteLeft}>
                <View style={styles.invitePfpWrap}>
                    {pfpUri ? (
                        <FastImage
                            source={{
                                uri: pfpUri,
                                priority: FastImage.priority.normal,
                                cache: FastImage.cacheControl.immutable,
                            }}
                            style={styles.invitePfp}
                        />
                    ) : (
                        <View style={[styles.invitePfp, { backgroundColor: "#E5E7EB" }]} />
                    )}
                </View>

                <View style={styles.inviteCopy}>
                    <Text style={styles.inviteTitle} numberOfLines={2} ellipsizeMode="tail">
                        {!invite?.fromHandle && "You’ve been invited to join their workout"}
                        {invite?.fromHandle && <Text style={styles.inviteHandle}>{invite.fromHandle}</Text>}
                        {invite?.fromHandle && " invited you to join their workout"}
                    </Text>
                </View>
            </View>

            <View style={styles.inviteActions}>
                <Pressable onPress={onAccept} style={styles.inviteAccept} hitSlop={8}>
                    <Text style={styles.inviteAcceptText}>Accept</Text>
                </Pressable>
                <Pressable onPress={onDecline} hitSlop={8} style={styles.inviteDismiss}>
                    <Text style={styles.inviteDismissText}>Dismiss</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // EXACT copy from the 900-line screen
    inviteCard: {
        width: "92%",
        borderRadius: scaleSize(16),
        backgroundColor: "rgba(18, 20, 28, 0.96)",
        borderWidth: scaleSize(1),
        borderColor: "rgba(255, 255, 255, 0.12)",
        paddingVertical: scaleSize(12),
        paddingHorizontal: scaleSize(14),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "rgba(15, 23, 42, 0.85)",
        shadowOpacity: 0.3,
        shadowRadius: scaleSize(20),
        shadowOffset: { width: 0, height: scaleSize(12) },
        elevation: 8,
    },
    inviteLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: scaleSize(12) },
    invitePfpWrap: {
        width: scaleSize(34),
        height: scaleSize(34),
        borderRadius: scaleSize(17),
        overflow: "hidden",
        marginRight: scaleSize(10),
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: "rgba(255, 255, 255, 0.08)",
    },
    invitePfp: { width: "100%", height: "100%" },
    inviteCopy: { flex: 1 },
    inviteTitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(13),
        lineHeight: scaleSize(16),
        color: theme.textSecondary,
        flexShrink: 1,
    },
    inviteHandle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
        lineHeight: scaleSize(16),
        color: theme.textPrimary,
    },

    inviteActions: { flexDirection: "row", alignItems: "center" },
    inviteAccept: {
        height: scaleSize(28),
        minWidth: scaleSize(74),
        paddingHorizontal: scaleSize(12),
        borderRadius: scaleSize(14),
        backgroundColor: theme.successButton,
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(8),
        shadowColor: "#10B981",
        shadowOpacity: 0.28,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(4) },
        elevation: 3,
    },
    inviteAcceptText: { color: "#fff", fontFamily: "Outfit_700Bold", fontSize: scaleSize(12) },
    inviteDismiss: { paddingHorizontal: scaleSize(4), paddingVertical: scaleSize(4) },
    inviteDismissText: {
        color: theme.textSecondary,
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11.5),
        opacity: 0.85,
    },
});
