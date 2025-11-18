import React, { useCallback } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import FeedSnapshotCard from "../components/1_Feed/FeedSnapshotCard";
import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";

const LADDER_TIERS = ["bronze", "silver", "gold", "platinum", "saphire", "diamond"];

export default function RankLadderScreen({ navigation }) {
    const handleGoBack = useCallback(() => {
        try {
            if (navigation?.canGoBack?.()) {
                navigation.goBack();
                return;
            }
        } catch {}
        try {
            navigation?.navigate?.("Tabs");
        } catch {}
    }, [navigation]);

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerBack}
                    onPress={handleGoBack}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    activeOpacity={0.8}
                >
                    <Ionicons name="chevron-back" size={scaleSize(22)} color="#f7f8ff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rank Ladder</Text>
                <View style={styles.headerBack} />
            </View>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {LADDER_TIERS.map((tier) => (
                    <View key={tier} style={styles.cardBlock}>
                        <FeedSnapshotCard rankTier={tier} showRankTabs={false} enableRankAnimations={false} />
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(12),
        paddingTop: scaleSize(4),
        paddingBottom: scaleSize(8),
    },
    headerBack: {
        width: scaleSize(44),
        height: scaleSize(44),
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(18),
        color: "#f5f7ff",
        letterSpacing: 0.4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: scaleSize(8),
        paddingBottom: scaleSize(40),
    },
    cardBlock: {
        marginBottom: scaleSize(24),
    },
});
