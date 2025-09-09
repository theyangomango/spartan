// components/3_Workout/ui/InviteBanner.js
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import FastImage from "react-native-fast-image";
import theme from "../../theme/mfpDark";

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

                <View style={{ flex: 1 }}>
                    <Text style={styles.inviteTitle}>
                        {invite?.fromHandle ? `@${invite.fromHandle} invited you` : "You’ve been invited"}
                    </Text>
                    <Text style={styles.inviteSub}>Join their workout?</Text>
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
        borderRadius: 14,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.hairline,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    inviteLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
    invitePfpWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: "hidden",
        marginRight: 10,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.hairline,
    },
    invitePfp: { width: "100%", height: "100%" },
    inviteTitle: { fontFamily: "Outfit_700Bold", fontSize: 14.5, color: theme.textPrimary },
    inviteSub: { fontFamily: "Outfit_500Medium", fontSize: 12.5, color: theme.textSecondary, marginTop: 2 },

    inviteActions: { flexDirection: "row", alignItems: "center" },
    inviteAccept: {
        height: 30,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: "#10B981",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },
    inviteAcceptText: { color: "#fff", fontFamily: "Outfit_700Bold", fontSize: 13 },
    inviteDismiss: { paddingHorizontal: 6, paddingVertical: 4 },
    inviteDismissText: { color: theme.textSecondary, fontFamily: "Outfit_600SemiBold", fontSize: 12.5 },
});
