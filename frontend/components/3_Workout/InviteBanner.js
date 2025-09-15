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
        borderRadius: scaleSize(14),
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(12),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: scaleSize(10),
        shadowOffset: { width: 0, height: scaleSize(6) },
        elevation: 3,
    },
    inviteLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: scaleSize(8) },
    invitePfpWrap: {
        width: scaleSize(36),
        height: scaleSize(36),
        borderRadius: scaleSize(18),
        overflow: "hidden",
        marginRight: scaleSize(10),
        backgroundColor: theme.surface,
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
    },
    invitePfp: { width: "100%", height: "100%" },
    inviteTitle: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(14.5), color: theme.textPrimary },
    inviteSub: { fontFamily: "Outfit_500Medium", fontSize: scaleSize(12.5), color: theme.textSecondary, marginTop: scaleSize(2) },

    inviteActions: { flexDirection: "row", alignItems: "center" },
    inviteAccept: {
        height: scaleSize(30),
        paddingHorizontal: scaleSize(14),
        borderRadius: scaleSize(999),
        backgroundColor: "#10B981",
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(8),
    },
    inviteAcceptText: { color: "#fff", fontFamily: "Outfit_700Bold", fontSize: scaleSize(13) },
    inviteDismiss: { paddingHorizontal: scaleSize(6), paddingVertical: scaleSize(4) },
    inviteDismissText: { color: theme.textSecondary, fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(12.5) },
});
