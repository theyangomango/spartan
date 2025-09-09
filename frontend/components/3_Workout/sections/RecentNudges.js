import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BLUE } from "./workoutTheme";
import theme from "../../../theme/mfpDark";

export default function RecentNudges({ items = [], onStartTemplate }) {
    const [idx, setIdx] = useState(0);

    useEffect(() => {
        if (!items.length) return;
        const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 5500);
        return () => clearInterval(t);
    }, [items.length]);

    if (!items.length) {
        return (
            <View style={styles.nudge}>
                <Ionicons name="flash-outline" size={17} color={theme.textSecondary} style={{ marginRight: 8 }} />
                <Text numberOfLines={1} style={[styles.nudgeText, { color: theme.textSecondary }]}>
                    No updates yet — be the first to log today
                </Text>
            </View>
        );
    }

    const it = items[idx];
    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onStartTemplate && onStartTemplate(it.templateId)}
            style={styles.nudge}
        >
            <Ionicons name="flash-outline" size={17} color={BLUE.ACCENT} style={{ marginRight: 8 }} />
            <Text numberOfLines={1} style={styles.nudgeText}>
                {it.primary} <Text style={styles.nudgeAccent}>{it.accent}</Text>{" "}
                <Text style={styles.nudgeTail}>• {it.tail}</Text>
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    nudge: {
        marginTop: 6,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.surface,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
            android: { elevation: 1 },
        }),
    },
    nudgeText: { flex: 1, fontFamily: "Outfit_700Bold", color: BLUE.TITLE, fontSize: 14 },
    nudgeAccent: { color: BLUE.ACCENT },
    nudgeTail: { color: theme.textSecondary, fontFamily: "Outfit_600SemiBold" },
});
