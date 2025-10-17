import React from "react";
import { StyleSheet, Text, View } from "react-native";

import theme from "../../../theme/mfpDark";
import { scaleSize, scaleFont } from "../layoutConstants";

const DEFAULT_MESSAGE = "Templates view coming soon";

export default function TemplatesSection({ message = DEFAULT_MESSAGE }) {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(120),
    },
    text: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleFont(16),
        color: "rgba(255,255,255,0.55)",
        textAlign: "center",
        paddingHorizontal: scaleSize(24),
    },
});

