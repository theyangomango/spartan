// screens/Competition.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    StyleSheet,
    View,
    Text,
    Animated,
    Easing,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
    { key: "progress", label: "Progress" },
    { key: "leaderboard", label: "Compete" },
    { key: "exercises", label: "Ladder" },
];
const resolveTabKey = (candidate) => {
    if (typeof candidate !== "string") return null;
    const key = candidate.trim().toLowerCase();
    if (!key) return null;
    return VIEW_TABS.some((tab) => tab.key === key) ? key : null;
};
const getTabIndex = (key) => {
    const index = VIEW_TABS.findIndex((tab) => tab.key === key);
    return index === -1 ? 0 : index;
};

export default function Competition({ navigation, route }) {
    const insets = useStableSafeAreaInsets();
    const { width: windowWidth = 1 } = useWindowDimensions();
    const [activeTab, setActiveTab] = useState(() => {
        const requestedFromRoute = resolveTabKey(route?.params?.focusTab);
        if (requestedFromRoute) return requestedFromRoute;
        const pendingTab = consumePendingCompetitionTab();
        const requestedFromPending = resolveTabKey(pendingTab);
        if (requestedFromPending) return requestedFromPending;
        return "progress";
    });
    const [progressScrollSignal, setProgressScrollSignal] = useState(0);
    const [exercisesScrollSignal, setExercisesScrollSignal] = useState(0);
    const triggerExercisesScroll = useCallback(() => {
        setExercisesScrollSignal(Date.now());
    }, []);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const isFirstRender = useRef(true);
    const prevWidthRef = useRef(windowWidth);
    const indicatorX = useRef(new Animated.Value(0)).current;
    const indicatorWidth = useRef(new Animated.Value(0)).current;
    const indicatorReady = useRef(false);
    const [tabLayouts, setTabLayouts] = useState({});
    const skipTabAnimationRef = useRef(true);

    useEffect(() => {
        const unsubscribe = subscribeCompetitionTabRequests((tabKey) => {
            const resolved = resolveTabKey(tabKey);
            if (!resolved) return;
            skipTabAnimationRef.current = true;
            setActiveTab((current) => (current === resolved ? current : resolved));
            clearPendingCompetitionTab();
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const requested = resolveTabKey(route?.params?.focusTab);
        if (!requested) return;
        skipTabAnimationRef.current = true;
        setActiveTab((current) => (current === requested ? current : requested));
        navigation?.setParams?.({ focusTab: undefined });
        clearPendingCompetitionTab();
    }, [route?.params?.focusTab, navigation]);

    const handleTabPress = useCallback(
        (key) => {
            setActiveTab((current) => (current === key ? current : key));
            if (key === "exercises" && activeTab === "exercises") {
                triggerExercisesScroll();
            }
        },
        [activeTab, triggerExercisesScroll]
    );
    const handleTabLayout = useCallback((key, event) => {
        const { x, width } = event.nativeEvent.layout;
        setTabLayouts((prev) => {
            const existing = prev[key];
            if (existing && existing.x === x && existing.width === width) return prev;
            return { ...prev, [key]: { x, width } };
        });
    }, []);

    const handleRequestBodyWeightEntry = useCallback(() => {
        setActiveTab("progress");
        setProgressScrollSignal(Date.now());
    }, []);

    const handleSectionScroll = useCallback(() => {
        // Header remains static; keep callback for compatibility with section props.
    }, []);

    useEffect(() => {
        if (!windowWidth) return;
        const target = -windowWidth * getTabIndex(activeTab);
        const widthChanged = prevWidthRef.current !== windowWidth;
        prevWidthRef.current = windowWidth;
        if (isFirstRender.current || widthChanged || skipTabAnimationRef.current) {
            slideAnim.setValue(target);
            skipTabAnimationRef.current = false;
            isFirstRender.current = false;
            return;
        }
        Animated.timing(slideAnim, {
            toValue: target,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [activeTab, windowWidth, slideAnim]);

    useEffect(() => {
        const layout = tabLayouts[activeTab];
        if (!layout) return;
        const targetWidth = layout.width * 0.55;
        const targetX = layout.x + (layout.width - targetWidth) / 2;
        if (!indicatorReady.current || skipTabAnimationRef.current) {
            indicatorX.setValue(targetX);
            indicatorWidth.setValue(targetWidth);
            indicatorReady.current = true;
            if (skipTabAnimationRef.current) {
                skipTabAnimationRef.current = false;
            }
            return;
        }
        Animated.parallel([
            Animated.timing(indicatorX, {
                toValue: targetX,
                duration: 280,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.timing(indicatorWidth, {
                toValue: targetWidth,
                duration: 280,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }),
        ]).start();
    }, [activeTab, tabLayouts, indicatorX, indicatorWidth]);

    useEffect(() => {
        if (activeTab === "exercises") {
            triggerExercisesScroll();
        }
    }, [activeTab, triggerExercisesScroll]);

    const sectionComponents = useMemo(
        () => ({
            leaderboard: (
                <LeaderboardsSection
                    navigation={navigation}
                    onRequestBodyWeightEntry={handleRequestBodyWeightEntry}
                    onScroll={handleSectionScroll}
                />
            ),
            progress: (
                <ProgressSection
                    scrollSignal={progressScrollSignal}
                    onScroll={handleSectionScroll}
                />
            ),
            exercises: (
                <ExercisesSection
                    onScroll={handleSectionScroll}
                    scrollSignal={exercisesScrollSignal}
                />
            ),
        }),
        [navigation, handleRequestBodyWeightEntry, progressScrollSignal, exercisesScrollSignal, handleSectionScroll]
    );

    return (
        <SafeAreaView style={styles.mainContainer} edges={["top"]}>
            <View style={styles.tabsWrapper}>
                <View
                    style={[
                        styles.tabsContent,
                        { paddingTop: SIZES.headerPaddingTop + scaleSize(12) },
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
                                    onLayout={(event) => handleTabLayout(tab.key, event)}
                                >
                                    <Text
                                        style={[
                                            styles.viewTabLabel,
                                            isActive && styles.viewTabLabelActive,
                                        ]}
                                    >
                                        {tab.label}
                                    </Text>
                                </RNBounceable>
                            );
                        })}
                        {tabLayouts[activeTab] && (
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    styles.viewTabIndicatorActive,
                                    {
                                        transform: [{ translateX: indicatorX }],
                                        width: indicatorWidth,
                                    },
                                ]}
                            />
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.sectionContainer}>
                <Animated.View
                    style={[
                        styles.sectionsRow,
                        {
                            width: windowWidth * VIEW_TABS.length,
                            transform: [{ translateX: slideAnim }],
                        },
                    ]}
                >
                    {VIEW_TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        const SectionElement = sectionComponents[tab.key];
                        if (!SectionElement) return null;
                        return (
                            <View
                                key={tab.key}
                                style={[styles.sectionPane, { width: windowWidth }]}
                                pointerEvents={isActive ? "auto" : "none"}
                            >
                                {SectionElement}
                            </View>
                        );
                    })}
                </Animated.View>
            </View>

            <Footer currentScreenName="Competition" navigation={navigation} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: theme.bg },
    tabsWrapper: {
        backgroundColor: theme.bg,
        zIndex: 2,
        elevation: 2,
    },
    tabsContent: {
        backgroundColor: theme.bg,
    },
    sectionContainer: {
        flex: 1,
        overflow: "hidden",
    },
    sectionsRow: {
        flexDirection: "row",
        flex: 1,
        height: "100%",
    },
    sectionPane: {
        flex: 1,
    },
    viewTabsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: scaleSize(6),
        position: "relative",
        paddingBottom: scaleSize(6),
    },
    viewTabButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(4),
    },
    viewTabLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(16),
        color: "rgba(255,255,255,0.45)",
    },
    viewTabLabelActive: {
        color: "rgba(255,255,255,0.98)",
    },
    viewTabIndicatorActive: {
        position: "absolute",
        bottom: 0,
        left: 0,
        height: scaleSize(3),
        borderRadius: scaleSize(999),
        backgroundColor: "rgba(34, 61, 100, 0.9)",
    },
});
