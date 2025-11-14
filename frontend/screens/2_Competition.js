// screens/Competition.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";

import useStableSafeAreaInsets from "../hooks/useStableSafeAreaInsets";
import Footer from "../components/Footer";
import theme from "../theme/mfpDark";
import { withStrongPress } from "../utils/haptics";
import {
    scaleSize,
    SIZES,
    ts,
} from "../components/2_Competition/layoutConstants";
import LeaderboardsSection from "../components/2_Competition/sections/LeaderboardsSection";
import ProgressSection from "../components/2_Competition/sections/ProgressSection";
import ExercisesSection from "../components/2_Competition/sections/ExercisesSection";
import {
    clearPendingCompetitionTab,
    consumePendingCompetitionTab,
    subscribeCompetitionTabRequests,
} from "../utils/competitionTabEvents";

const VIEW_TABS = [
    { key: "leaderboard", label: "Leaderboards" },
    { key: "progress", label: "Progress" },
    { key: "exercises", label: "Exercises" },
];

const resolveTabKey = (candidate) => {
    if (typeof candidate !== "string") return null;
    const key = candidate.trim().toLowerCase();
    if (!key) return null;
    return VIEW_TABS.some((tab) => tab.key === key) ? key : null;
};

export default function Competition({ navigation, route }) {
    const insets = useStableSafeAreaInsets();
    const [activeTab, setActiveTab] = useState(() => {
        const requestedFromRoute = resolveTabKey(route?.params?.focusTab);
        if (requestedFromRoute) return requestedFromRoute;
        const pendingTab = consumePendingCompetitionTab();
        const requestedFromPending = resolveTabKey(pendingTab);
        if (requestedFromPending) return requestedFromPending;
        return "leaderboard";
    });
    const [progressScrollSignal, setProgressScrollSignal] = useState(0);

    useEffect(() => {
        const unsubscribe = subscribeCompetitionTabRequests((tabKey) => {
            const resolved = resolveTabKey(tabKey);
            if (!resolved) return;
            setActiveTab((current) => (current === resolved ? current : resolved));
            clearPendingCompetitionTab();
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const requested = resolveTabKey(route?.params?.focusTab);
        if (!requested) return;
        setActiveTab((current) => (current === requested ? current : requested));
        navigation?.setParams?.({ focusTab: undefined });
        clearPendingCompetitionTab();
    }, [route?.params?.focusTab, navigation]);

    const handleTabPress = useCallback((key) => {
        setActiveTab(key);
    }, []);

    const handleRequestBodyWeightEntry = useCallback(() => {
        setActiveTab("progress");
        setProgressScrollSignal(Date.now());
    }, []);

    const sectionComponents = useMemo(
        () => ({
            leaderboard: (
                <LeaderboardsSection
                    navigation={navigation}
                    onRequestBodyWeightEntry={handleRequestBodyWeightEntry}
                />
            ),
            progress: <ProgressSection scrollSignal={progressScrollSignal} />,
            exercises: <ExercisesSection />,
        }),
        [navigation, handleRequestBodyWeightEntry, progressScrollSignal]
    );

    return (
        <View style={styles.mainContainer}>
            <View
                style={[
                    styles.tabsWrapper,
                    { paddingTop: insets.top + SIZES.headerPaddingTop + scaleSize(12) },
                ]}
            >
                <View
                    style={[
                        styles.viewTabsContainer,
                        { paddingHorizontal: SIZES.headerPaddingHorizontal },
                    ]}
                >
                    {VIEW_TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <RNBounceable
                                key={tab.key}
                                onPress={withStrongPress(() => handleTabPress(tab.key))}
                                style={styles.viewTabButton}
                                activeScale={0.97}
                                accessibilityRole="button"
                                accessibilityLabel={`Switch to ${tab.label}`}
                            >
                                <Text
                                    style={[
                                        styles.viewTabLabel,
                                        isActive && styles.viewTabLabelActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                                <View
                                    style={[
                                        styles.viewTabIndicator,
                                        isActive && styles.viewTabIndicatorActive,
                                    ]}
                                />
                            </RNBounceable>
                        );
                    })}
                </View>
            </View>

            <View style={styles.sectionContainer}>
                {VIEW_TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const SectionElement = sectionComponents[tab.key];
                    if (!SectionElement) return null;
                    return (
                        <View
                            key={tab.key}
                            style={[
                                styles.sectionLayer,
                                isActive ? styles.sectionLayerActive : styles.sectionLayerInactive,
                            ]}
                            pointerEvents={isActive ? "auto" : "none"}
                        >
                            {SectionElement}
                        </View>
                    );
                })}
            </View>

            <Footer currentScreenName="Competition" navigation={navigation} />
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: theme.bg },
    tabsWrapper: {
        backgroundColor: "transparent",
    },
    sectionContainer: {
        flex: 1,
        position: "relative",
    },
    sectionLayer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    sectionLayerActive: {
        opacity: 1,
    },
    sectionLayerInactive: {
        opacity: 0,
    },
    viewTabsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: scaleSize(6),
    },
    viewTabButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(4),
    },
    viewTabLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(14),
        color: "rgba(255,255,255,0.45)",
    },
    viewTabLabelActive: {
        color: "rgba(255,255,255,0.98)",
    },
    viewTabIndicator: {
        marginTop: scaleSize(6),
        height: scaleSize(3),
        width: "55%",
        borderRadius: scaleSize(999),
        backgroundColor: "transparent",
    },
    viewTabIndicatorActive: {
        backgroundColor: "rgba(34, 61, 100, 0.9)",
    },
});
