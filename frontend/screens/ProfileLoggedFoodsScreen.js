import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import Footer from "../components/Footer";
import theme from "../theme/mfpDark";
import scaleSize from "../helper/scaleSize";
import readDoc from "../../backend/helper/firebase/readDoc";
import { canViewerAccessProfile } from "../utils/workoutPrivacy";
import { clearFooterSuppression } from "../state/footerSuppressionStore";
import { withStrongPress } from "../utils/haptics";
import { groupLoggedFoodsByDay } from "../utils/loggedFoods";
import MealItemCard from "../components/2_MacroTracking/MealItemCard";
import { summarizeFood } from "../utils/nutrition";

const LockedView = ({ subtitle }) => (
    <View style={styles.lockedContainer}>
        <View style={styles.lockedIconWrap}>
            <Ionicons name="lock-closed" size={scaleSize(42)} color="#A5B4FC" />
        </View>
        <Text style={styles.lockedTitle}>This account is private</Text>
        <Text style={styles.lockedSubtitle}>
            {subtitle || "Follow to view logged food items from this profile."}
        </Text>
    </View>
);

const formatDayLabel = (dayKey) => {
    if (!dayKey || typeof dayKey !== "string") return "Unknown Day";
    const [year, month, day] = dayKey.split("-").map((part) => parseInt(part, 10));
    if (!year || !month || !day) return dayKey;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return dayKey;
    try {
        const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
        const pad2 = (n) => String(n).padStart(2, "0");
        const monthPart = pad2(date.getMonth() + 1);
        const dayPart = pad2(date.getDate());
        const yearPart = String(date.getFullYear()).slice(-2);
        return `${weekday}, ${monthPart}/${dayPart}/${yearPart}`;
    } catch {
        return dayKey;
    }
};

const COLORS = {
    bg: theme.bg,
    card: theme.surface,
    text: "#F8FAFC",
    subtext: "rgba(203, 213, 225, 0.85)",
    hairline: "rgba(148, 163, 184, 0.18)",
    ringTint: theme.primary,
    accent: theme.primary,
};

const MACRO_COLORS = {
    protein: "#6c97fccc",
    carbs: "#FF7CB5cc",
    fat: "#FFC874cc",
};

const toSections = (loggedFoods) => {
    const grouped = groupLoggedFoodsByDay(loggedFoods);
    return grouped.map(({ dayKey, items }) => {
        const entries = Array.isArray(items) ? items : [];
        const totals = entries.reduce(
            (acc, item) => ({
                calories: acc.calories + (Number(item.macros?.calories) || 0),
                protein: acc.protein + (Number(item.macros?.protein) || 0),
                carbs: acc.carbs + (Number(item.macros?.carbs) || 0),
                fat: acc.fat + (Number(item.macros?.fat) || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        return { dayKey, items: entries, totals };
    }).filter((section) => Array.isArray(section.items) && section.items.length > 0);
};

export default function ProfileLoggedFoodsScreen({ navigation, route }) {
    const params = route?.params || {};
    const initialUser = params?.initialUser || null;
    const passedUid = params?.targetUid || initialUser?.uid || "";
    const targetUid = passedUid ? String(passedUid) : "";
    const isViewingSelf = !!params?.isViewingSelf;

    const [userData, setUserData] = useState(() => (initialUser && initialUser.uid ? initialUser : null));
    const [isUserLoading, setIsUserLoading] = useState(!initialUser);

    useFocusEffect(
        useCallback(() => {
            clearFooterSuppression();
            return undefined;
        }, [])
    );

    useEffect(() => {
        if (!targetUid) return;
        let cancelled = false;
        setIsUserLoading(true);
        readDoc("users", targetUid)
            .then((doc) => {
                if (cancelled) return;
                if (doc && doc.uid) setUserData(doc);
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setIsUserLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [targetUid]);

    useEffect(() => {
        if (!isViewingSelf) return undefined;
        try {
            const { subscribeUserData } = require("../utils/userDataEvents");
            const unsubscribe = subscribeUserData((nextUser) => {
                if (nextUser && nextUser.uid) setUserData(nextUser);
            });
            return unsubscribe;
        } catch {
            return undefined;
        }
    }, [isViewingSelf]);

    const viewerData = (() => { try { return global?.userData || null; } catch { return null; } })();
    const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";
    const canViewContent = canViewerAccessProfile(userData, viewerUid, viewerData);

    const sections = useMemo(() => (
        !userData || !canViewContent
            ? []
            : toSections(userData?.loggedFoods || {})
    ), [userData, canViewContent]);

    const totalItems = useMemo(() => (
        sections.reduce((acc, section) => acc + (Array.isArray(section.items) ? section.items.length : 0), 0)
    ), [sections]);

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const renderSummary = useCallback((entry) => {
        const parts = [];
        if (entry.meal) parts.push(entry.meal);
        const base = summarizeFood(entry.desc, entry.brand, entry.quantity ?? entry.qty ?? 1);
        if (base) parts.push(base);
        return parts.join(" • ");
    }, []);

    const renderDay = useCallback(
        ({ item }) => {
            const entries = Array.isArray(item?.items) ? item.items : [];
            return (
                <View style={styles.daySection}>
                    <View style={styles.dayHeader}>
                        <View style={styles.dayHeaderRow}>
                            <Text style={styles.dayTitle}>{formatDayLabel(item.dayKey)}</Text>
                            <Text style={styles.dayCalories}>{`${Math.round(item.totals.calories)} kcal`}</Text>
                        </View>
                    <Text style={styles.daySubtitle}>
                        <Text style={styles.daySubtitleProtein}>{`P${Math.round(item.totals.protein)}g`}</Text>
                        <Text style={styles.daySubtitleDot}>{' • '}</Text>
                        <Text style={styles.daySubtitleCarbs}>{`C${Math.round(item.totals.carbs)}g`}</Text>
                        <Text style={styles.daySubtitleDot}>{' • '}</Text>
                        <Text style={styles.daySubtitleFat}>{`F${Math.round(item.totals.fat)}g`}</Text>
                    </Text>
                </View>
                <View style={styles.dayCards}>
                        {entries.map((entry, index) => (
                            <MealItemCard
                                key={entry.key}
                                entry={entry}
                                COLORS={COLORS}
                                cardStyle={[
                                    styles.card,
                                    index === 0 && styles.cardFirst,
                                    index === entries.length - 1 && styles.cardLast,
                                ]}
                                showCaloriesRight
                                renderSummary={renderSummary}
                                enableSwipe={false}
                                onPress={() => navigation.navigate('FoodDetail', {
                                    entry: entry.raw || entry,
                                    mealName: entry.meal,
                                    dayKey: entry.dayKey,
                                    readOnly: true,
                                    mode: 'edit',
                                })}
                            />
                        ))}
                    </View>
                </View>
            );
        },
        [navigation, renderSummary]
    );

    let mainContent = null;
    if (!targetUid) {
        mainContent = (
            <View style={styles.errorContainer}>
                <Text style={styles.emptyTitle}>Profile unavailable</Text>
                <Text style={styles.emptySubtitle}>We could not determine which profile to load.</Text>
            </View>
        );
    } else if (!userData && isUserLoading) {
        mainContent = (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#93C5FD" />
            </View>
        );
    } else if (!canViewContent) {
        const lockedSubtitle = userData?.settings?.profilePrivate
            ? "Only approved followers can view logged food items from this profile."
            : "";
        mainContent = <LockedView subtitle={lockedSubtitle} />;
    } else if (!sections.length) {
        mainContent = (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No logged food yet</Text>
                <Text style={styles.emptySubtitle}>
                    Food items you log will appear here for quick reference.
                </Text>
            </View>
        );
    } else {
        mainContent = (
            <FlatList
                data={sections}
                keyExtractor={(item) => item.dayKey}
                renderItem={renderDay}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={<View style={styles.listTopSpacer} />}
                ItemSeparatorComponent={() => <View style={styles.sectionSeparator} />}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            <View style={styles.contentWrap}>
                <View style={styles.headerContainer}>
                    <View style={styles.headerRow}>
                        <Pressable
                            onPress={withStrongPress(handleBack)}
                            style={styles.headerBackButton}
                            hitSlop={12}
                        >
                            <Ionicons name="chevron-back" size={scaleSize(22)} color={theme.textPrimary} />
                        </Pressable>
                        <View style={styles.headerTitles}>
                            <Text style={styles.headerTitle}>Logged Food Items</Text>
                            <Text style={styles.headerSubtitle}>
                                {totalItems === 1 ? "1 item logged" : `${totalItems} items logged`}
                            </Text>
                        </View>
                        <View style={styles.headerRightSpacer} />
                    </View>
                </View>
                {mainContent}
            </View>

            <Footer currentScreenName={"Profile"} navigation={navigation} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    contentWrap: {
        flex: 1,
        paddingBottom: scaleSize(16),
    },
    headerContainer: {
        paddingTop: scaleSize(8),
        paddingBottom: scaleSize(12),
        paddingHorizontal: scaleSize(18),
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerBackButton: {
        width: scaleSize(34),
        height: scaleSize(34),
        borderRadius: scaleSize(17),
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitles: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(16),
        color: "#F1F5FF",
    },
    headerSubtitle: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(12.5),
        color: "rgba(226, 232, 240, 0.72)",
    },
    headerRightSpacer: {
        width: scaleSize(34),
    },
    loadingWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(24),
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(24),
    },
    emptyTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(18),
        color: "#F1F5FF",
        marginBottom: scaleSize(6),
        textAlign: "center",
    },
    emptySubtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(14),
        color: "rgba(226, 232, 240, 0.68)",
        textAlign: "center",
        lineHeight: scaleSize(20),
    },
    listContent: {
        paddingHorizontal: 0,
        paddingBottom: scaleSize(120),
    },
    listTopSpacer: {
        height: scaleSize(2),
    },
    sectionSeparator: {
        height: scaleSize(18),
    },
    daySection: {
    },
    dayHeader: {
        paddingHorizontal: scaleSize(22),
        paddingTop: scaleSize(14),
        paddingBottom: scaleSize(10),
    },
    dayHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    dayTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13.5),
        color: "#F8FAFC",
        letterSpacing: 0.18,
        textTransform: "uppercase",
    },
    dayCalories: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(12.5),
        color: "rgba(248, 250, 252, 0.92)",
    },
    daySubtitle: {
        marginTop: scaleSize(3),
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11.5),
        color: "rgba(148, 163, 184, 0.85)",
        letterSpacing: 0.25,
    },
    daySubtitleProtein: {
        color: MACRO_COLORS.protein,
    },
    daySubtitleCarbs: {
        color: MACRO_COLORS.carbs,
    },
    daySubtitleFat: {
        color: MACRO_COLORS.fat,
    },
    daySubtitleDot: {
        color: "rgba(148, 163, 184, 0.75)",
    },
    dayCards: {
        paddingHorizontal: 0,
        paddingVertical: scaleSize(4),
    },
    card: {
        borderRadius: 0,
        borderWidth: 0,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.hairline,
        marginVertical: 0,
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(26),
        backgroundColor: COLORS.card,
    },
    cardFirst: {
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    cardLast: {
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    lockedContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(24),
    },
    lockedIconWrap: {
        width: scaleSize(82),
        height: scaleSize(82),
        borderRadius: scaleSize(41),
        backgroundColor: "rgba(148, 163, 184, 0.2)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaleSize(12),
    },
    lockedTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(18),
        color: "#E5E7EB",
        marginBottom: scaleSize(6),
        textAlign: "center",
    },
    lockedSubtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(14),
        color: "#94A3B8",
        textAlign: "center",
        lineHeight: scaleSize(20),
    },
});
