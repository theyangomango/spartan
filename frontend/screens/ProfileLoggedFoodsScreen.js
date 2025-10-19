import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    SafeAreaView,
    SectionList,
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
        return date.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return dayKey;
    }
};

const formatQuantity = (quantity) => {
    const value = Number(quantity) || 0;
    if (!value) return "";
    const rounded = Number.isInteger(value) ? value : value.toFixed(1);
    const label = value === 1 ? "Serving" : "Servings";
    return `${rounded} ${label}`;
};

const FoodRow = ({ item }) => {
    const quantityLabel = formatQuantity(item.quantity);
    const metaParts = [];
    if (item.meal) metaParts.push(item.meal);
    if (quantityLabel) metaParts.push(quantityLabel);
    if (item.brand) metaParts.push(item.brand);
    const metaLine = metaParts.join(" • ");

    return (
        <View style={styles.foodRow}>
            <View style={styles.foodRowHeader}>
                <Text style={styles.foodName} numberOfLines={1}>{item.name || "Food"}</Text>
                {Number(item.macros?.calories) ? (
                    <Text style={styles.foodCalories}>{Math.round(item.macros.calories)} kcal</Text>
                ) : null}
            </View>
            {metaLine ? (
                <Text style={styles.foodMeta} numberOfLines={2}>{metaLine}</Text>
            ) : null}
            {item.desc ? (
                <Text style={styles.foodDesc} numberOfLines={2}>{item.desc}</Text>
            ) : null}
            <View style={styles.foodMacroRow}>
                <Text style={[styles.foodMacro, styles.foodMacroP]}>
                    P {Math.round(item.macros?.protein || 0)}g
                </Text>
                <Text style={[styles.foodMacro, styles.foodMacroC]}>
                    C {Math.round(item.macros?.carbs || 0)}g
                </Text>
                <Text style={[styles.foodMacro, styles.foodMacroF]}>
                    F {Math.round(item.macros?.fat || 0)}g
                </Text>
            </View>
        </View>
    );
};

const SectionHeader = ({ title, totals }) => (
    <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{formatDayLabel(title)}</Text>
        <Text style={styles.sectionSubtitle}>
            {`${Math.round(totals.calories)} kcal • P${Math.round(totals.protein)}g • C${Math.round(totals.carbs)}g • F${Math.round(totals.fat)}g`}
        </Text>
    </View>
);

const toSections = (loggedFoods) => {
    const grouped = groupLoggedFoodsByDay(loggedFoods);
    return grouped.map(({ dayKey, items }) => {
        const totals = items.reduce(
            (acc, item) => ({
                calories: acc.calories + (Number(item.macros?.calories) || 0),
                protein: acc.protein + (Number(item.macros?.protein) || 0),
                carbs: acc.carbs + (Number(item.macros?.carbs) || 0),
                fat: acc.fat + (Number(item.macros?.fat) || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        return { title: dayKey, data: items, totals };
    });
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
        sections.reduce((acc, section) => acc + section.data.length, 0)
    ), [sections]);

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const renderItem = useCallback(({ item }) => <FoodRow item={item} />, []);
    const renderSectionHeader = useCallback(
        ({ section }) => <SectionHeader title={section.title} totals={section.totals} />,
        []
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
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.key}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
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
        fontSize: scaleSize(18),
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
        paddingHorizontal: scaleSize(18),
        paddingBottom: scaleSize(120),
    },
    itemSeparator: {
        height: scaleSize(14),
    },
    sectionSeparator: {
        height: scaleSize(28),
    },
    sectionHeader: {
        marginBottom: scaleSize(12),
    },
    sectionTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(16),
        color: "#F8FAFC",
    },
    sectionSubtitle: {
        marginTop: scaleSize(2),
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(12),
        color: "rgba(203, 213, 225, 0.78)",
    },
    foodRow: {
        padding: scaleSize(16),
        borderRadius: scaleSize(16),
        backgroundColor: "rgba(30, 41, 59, 0.72)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(148, 163, 184, 0.16)",
    },
    foodRowHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: scaleSize(6),
    },
    foodName: {
        flex: 1,
        fontFamily: "Nunito_800ExtraBold",
        fontSize: scaleSize(14),
        color: "#F8FAFC",
        marginRight: scaleSize(8),
    },
    foodCalories: {
        fontFamily: "Nunito_700Bold",
        fontSize: scaleSize(12),
        color: "#FDE68A",
    },
    foodMeta: {
        fontFamily: "Nunito_600SemiBold",
        fontSize: scaleSize(12),
        color: "rgba(209, 213, 219, 0.85)",
        marginBottom: scaleSize(4),
    },
    foodDesc: {
        fontFamily: "Nunito_500Medium",
        fontSize: scaleSize(12),
        color: "rgba(148, 163, 184, 0.9)",
        marginBottom: scaleSize(6),
    },
    foodMacroRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        marginTop: scaleSize(6),
    },
    foodMacro: {
        fontFamily: "Nunito_700Bold",
        fontSize: scaleSize(12),
        marginRight: scaleSize(12),
    },
    foodMacroP: {
        color: "#93C5FD",
    },
    foodMacroC: {
        color: "#FCA5A5",
    },
    foodMacroF: {
        color: "#FBCFE8",
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
