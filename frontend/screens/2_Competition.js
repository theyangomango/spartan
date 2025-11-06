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

const VIEW_TABS = [
    { key: "leaderboard", label: "Leaderboards" },
    { key: "progress", label: "Progress" },
    { key: "exercises", label: "Exercises" },
];

export default function Competition({ navigation, route }) {
    const insets = useStableSafeAreaInsets();
    const [activeTab, setActiveTab] = useState(() => {
        const requested = route?.params?.focusTab;
        if (
            typeof requested === "string" &&
            VIEW_TABS.some((tab) => tab.key === requested)
        ) {
            return requested;
        }
        return "leaderboard";
    });
    const [progressScrollSignal, setProgressScrollSignal] = useState(0);

    useEffect(() => {
        const requested = route?.params?.focusTab;
        if (
            typeof requested === "string" &&
            VIEW_TABS.some((tab) => tab.key === requested)
        ) {
            if (requested !== activeTab) {
                setActiveTab(requested);
            }
            navigation?.setParams?.({ focusTab: undefined });
        }
    }, [route?.params?.focusTab, activeTab, navigation]);

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
