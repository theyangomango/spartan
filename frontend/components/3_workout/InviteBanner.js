import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function InviteBanner({ invite, onAccept, onDecline }) {
    return (
        <View style={styles.wrap}>
            <Ionicons name="hand-left" size={18} color="#2A65D9" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>Workout invite</Text>
                <Text style={styles.sub} numberOfLines={1}>
                    from @{invite.fromHandle || invite.fromUid?.slice(0, 6)}
                </Text>
            </View>
            <Pressable style={[styles.btn, styles.accept]} onPress={onAccept}>
                <Text style={styles.btnText}>Accept</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.decline]} onPress={onDecline}>
                <Text style={[styles.btnText, { color: "#A33" }]}>Decline</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        marginHorizontal: 20,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: "#F1F6FF",
        borderColor: "#DBE9FF",
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: "row",
        alignItems: "center",
    },
    title: { fontFamily: "Nunito_800ExtraBold", color: "#111", fontSize: 14, includeFontPadding: false },
    sub: { fontFamily: "Nunito_600SemiBold", color: "#47639F", fontSize: 12 },
    btn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginLeft: 8,
    },
    accept: { backgroundColor: "#59AAEE" },
    decline: { backgroundColor: "#F9ECEC" },
    btnText: { fontFamily: "Nunito_800ExtraBold", color: "#fff", fontSize: 12.5 },
});
