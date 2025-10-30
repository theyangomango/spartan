import React from "react";
import { StyleSheet, Text, View } from "react-native";

import theme from "../../../theme/mfpDark";
import { scaleSize, ts } from "../layoutConstants";

export default function ProgressSection() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Progress</Text>
            <Text style={styles.subtitle}>Progress tracking coming soon.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(24),
        backgroundColor: theme.bg,
    },
    title: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(20),
        color: theme.textPrimary ?? "#F6F8FF",
        marginBottom: scaleSize(8),
    },
    subtitle: {
        textAlign: "center",
        fontFamily: "Outfit_400Regular",
        fontSize: ts(14),
        color: "rgba(255,255,255,0.65)",
    },
});
