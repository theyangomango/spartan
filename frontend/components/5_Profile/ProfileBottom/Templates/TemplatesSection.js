// TemplatesSection.js — lists the user's workout templates inside Profile bottom sheet
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Weight } from "iconsax-react-native";

import scaleSize from "../../../../helper/scaleSize";
import theme from "../../../../theme/mfpDark";
import { withStrongPress } from "../../../../utils/haptics";
import EditTemplateModal from "../../../3_Workout/Template/EditTemplateModal";
import { BLUE } from "../../../3_Workout/sections/workoutTheme";
import makeID from "../../../../../backend/helper/makeID";
import updateDoc from "../../../../../backend/helper/firebase/updateDoc";
import { emitUserDataUpdate } from "../../../../utils/userDataEvents";
import { SafeAreaView } from "react-native-safe-area-context";

const TEMPLATE_ICON_COLOR = "#F4F8FF";
const TEMPLATE_SECONDARY_ICON_COLOR = BLUE.ACCENT;
const TEMPLATE_ICON_BG = "rgba(82, 148, 232, 0.32)";
const TEMPLATE_ICON_BORDER = "rgba(150, 212, 255, 0.5)";
const TEMPLATE_CARD_GRADIENT = ["#203662", "#101C34"];
const TEMPLATE_CARD_BORDER = "rgba(126, 208, 255, 0.45)";
const TEMPLATE_SHADOW_COLOR = "rgba(8, 22, 44, 0.7)";
const CARD_SHADOW_OFFSET = scaleSize(10);
const CARD_SHADOW_RADIUS = scaleSize(20);
const TEMPLATE_SUBTITLE_COLOR = "#D2E6FF";
const CARD_RADIUS = scaleSize(22);
const CARD_MIN_HEIGHT = scaleSize(86);

const normalizeSetType = (value) => {
    const raw = typeof value === "string" ? value.toLowerCase() : "";
    return raw === "warmup" || raw === "dropset" || raw === "failure" ? raw : null;
};

const normalizeTemplateShape = (tpl = {}) => {
    const exercises = Array.isArray(tpl?.exercises)
        ? tpl.exercises.map((ex) => ({
            name: ex?.name ?? "",
            muscle: ex?.muscle ?? "",
            sets: Array.isArray(ex?.sets)
                ? ex.sets.map((set) => ({
                    weight: Number(set?.weight) || 0,
                    reps: Number(set?.reps) || 0,
                    type: normalizeSetType(set?.type),
                }))
                : [],
        }))
        : [];
    return {
        ...tpl,
        name: tpl?.name ?? "Untitled Template",
        exercises,
    };
};

const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value instanceof Date) {
        const ms = value.getTime();
        return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof value?.toDate === "function") {
        try {
            const date = value.toDate();
            const ms = date?.getTime?.() ?? 0;
            return Number.isFinite(ms) ? ms : 0;
        } catch {
            return 0;
        }
    }
    if (typeof value?.seconds === "number") {
        const millis = value.seconds * 1000 + (value.nanoseconds ? value.nanoseconds / 1e6 : 0);
        return Number.isFinite(millis) ? millis : 0;
    }
    if (typeof value?._seconds === "number") {
        const millis = value._seconds * 1000 + (value._nanoseconds ? value._nanoseconds / 1e6 : 0);
        return Number.isFinite(millis) ? millis : 0;
    }
    return 0;
};

const countExercises = (tpl) => (Array.isArray(tpl?.exercises) ? tpl.exercises.length : 0);

const countSets = (tpl) => {
    if (!Array.isArray(tpl?.exercises)) return 0;
    return tpl.exercises.reduce((total, exercise) => {
        const sets = Array.isArray(exercise?.sets) ? exercise.sets.length : 0;
        return total + sets;
    }, 0);
};

const TemplatesSection = ({ templates, isVisible, isBottomSheetExpanded, onScrollExpandRequest, viewingSelf = true }) => {
    const sortedTemplates = useMemo(() => {
        if (!Array.isArray(templates)) return [];
        return templates
            .filter(Boolean)
            .map((tpl) => ({ ...tpl }))
            .sort((a, b) => toMillis(b?.lastDate) - toMillis(a?.lastDate));
    }, [templates]);

    const isEmpty = sortedTemplates.length === 0;

    const previewTemplateRef = useRef({});
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewKey, setPreviewKey] = useState(0);
    const copyPendingRef = useRef(false);

    const isDraggingRef = useRef(false);
    const recentlyDraggedRef = useRef(false);
    const dragEndTimeoutRef = useRef(null);

    const clearDragEndTimeout = useCallback(() => {
        const timeout = dragEndTimeoutRef.current;
        if (!timeout) return;
        clearTimeout(timeout);
        dragEndTimeoutRef.current = null;
    }, []);

    const scheduleRecentlyDraggedReset = useCallback(() => {
        clearDragEndTimeout();
        dragEndTimeoutRef.current = setTimeout(() => {
            recentlyDraggedRef.current = false;
            dragEndTimeoutRef.current = null;
        }, 180);
    }, [clearDragEndTimeout]);

    useEffect(() => () => {
        clearDragEndTimeout();
    }, [clearDragEndTimeout]);

    useEffect(() => {
        if (isVisible) return;
        isDraggingRef.current = false;
        recentlyDraggedRef.current = false;
        clearDragEndTimeout();
    }, [isVisible, clearDragEndTimeout]);

    const handleScrollBeginDrag = useCallback(() => {
        isDraggingRef.current = true;
        recentlyDraggedRef.current = true;
        clearDragEndTimeout();
    }, [clearDragEndTimeout]);

    const handleScrollEndDrag = useCallback(() => {
        isDraggingRef.current = false;
        recentlyDraggedRef.current = true;
        scheduleRecentlyDraggedReset();
    }, [scheduleRecentlyDraggedReset]);

    const handleMomentumScrollEnd = useCallback(() => {
        isDraggingRef.current = false;
        recentlyDraggedRef.current = false;
        clearDragEndTimeout();
    }, [clearDragEndTimeout]);

    const handleScroll = useCallback((event) => {
        if (typeof onScrollExpandRequest !== "function") return;
        const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
        if (!isDraggingRef.current && !recentlyDraggedRef.current) return;
        onScrollExpandRequest(Math.max(0, offsetY));
    }, [onScrollExpandRequest]);

    const openPreview = useCallback((tpl) => {
        if (!tpl) return;
        previewTemplateRef.current = normalizeTemplateShape(tpl);
        setPreviewKey((prev) => prev + 1);
        setPreviewVisible(true);
    }, []);

    const closePreview = useCallback(() => {
        setPreviewVisible(false);
    }, []);

    const persistCopy = useCallback(async (tpl) => {
        const uid = (() => {
            try { return global?.userData?.uid; } catch { return null; }
        })();
        if (!tpl || !uid) {
            closePreview();
            return;
        }
        if (copyPendingRef.current) return;
        copyPendingRef.current = true;
        try {
            const normalized = normalizeTemplateShape(tpl);
            const templateName = (normalized?.name || "").trim() || "Copied Template";
            const exercises = Array.isArray(normalized?.exercises)
                ? normalized.exercises.map((ex) => ({
                    name: ex?.name || "",
                    muscle: ex?.muscle || "",
                    sets: Array.isArray(ex?.sets)
                        ? ex.sets.map((set) => ({
                            weight: Number(set?.weight) || 0,
                            reps: Number(set?.reps) || 0,
                            type: normalizeSetType(set?.type),
                        }))
                        : [],
                }))
                : [];
            const tid = makeID();
            const newTemplate = { id: tid, tid, name: templateName, exercises, lastDate: null };

            const existingTemplates = (() => {
                try { return Array.isArray(global?.userData?.templates) ? [...global.userData.templates] : []; }
                catch { return []; }
            })();
            const nextTemplates = [...existingTemplates, newTemplate];

            try {
                await updateDoc('users', uid, { templates: nextTemplates });
            } catch { }

            try {
                global.userData = { ...(global.userData || {}), templates: nextTemplates };
                global.__templatesLocalSig = JSON.stringify(nextTemplates || []);
                global.__templatesDirty = true;
                emitUserDataUpdate();
            } catch { }
        } finally {
            copyPendingRef.current = false;
            closePreview();
        }
    }, [closePreview]);

    const renderTemplate = useCallback(({ item }) => {
        const name = item?.name?.trim?.() || "Untitled Template";
        const exerciseCount = countExercises(item);
        const setCount = countSets(item);
        const metaParts = [];
        if (exerciseCount > 0) metaParts.push(`${exerciseCount} ${exerciseCount === 1 ? "Exercise" : "Exercises"}`);
        if (setCount > 0) metaParts.push(`${setCount} ${setCount === 1 ? "Set" : "Sets"}`);
        const metaSubtitle = metaParts.join(" • ");
        const infoText = metaSubtitle;

        const handlePress = withStrongPress(() => openPreview(item));

        return (
            <View style={styles.cardShadow}>
                <Pressable
                    onPress={handlePress}
                    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                >
                    <LinearGradient
                        colors={TEMPLATE_CARD_GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardBackground}
                    />
                    <View style={styles.iconWrap}>
                        <Weight size={scaleSize(19)} color={TEMPLATE_ICON_COLOR} variant="Broken" />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{name}</Text>
                        {infoText ? (
                            <View style={styles.cardSubRow}>
                                <Ionicons name="sparkles-outline" size={scaleSize(14)} color={TEMPLATE_SECONDARY_ICON_COLOR} style={styles.cardSubIcon} />
                                <Text style={styles.cardSubtitle} numberOfLines={1}>{infoText}</Text>
                            </View>
                        ) : null}
                    </View>
                </Pressable>
            </View>
        );
    }, [openPreview]);

    const keyExtractor = useCallback((item, index) => {
        const tid = item?.tid ?? item?.id;
        return tid ? String(tid) : `template-${index}`;
    }, []);

    const renderSeparator = useCallback(() => <View style={styles.separator} />, []);

    const footerHeight = isBottomSheetExpanded ? scaleSize(90) : scaleSize(320);

    const emptySubtitleText = viewingSelf
        ? "Create a workout template to see it here."
        : "This user does not have any templates.";

    return (
        <View style={[styles.container, !isVisible && styles.hidden]}>
            {isEmpty ? (
                <View style={[styles.emptyState, isBottomSheetExpanded ? styles.emptyExpanded : styles.emptyCollapsed]}>
                    <Text style={styles.emptyTitle}>No templates yet</Text>
                    <Text style={styles.emptySubtitle}>{emptySubtitleText}</Text>
                </View>
            ) : (
                <FlatList
                    data={sortedTemplates}
                    keyExtractor={keyExtractor}
                    renderItem={renderTemplate}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={renderSeparator}
                    ListFooterComponent={<View style={{ height: footerHeight }} />}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    onScrollBeginDrag={handleScrollBeginDrag}
                    onScrollEndDrag={handleScrollEndDrag}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                />
            )}
            <Modal
                visible={previewVisible}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={closePreview}
            >
                <SafeAreaView style={styles.previewModalContainer} edges={['bottom']}>
                    <EditTemplateModal
                        key={previewKey}
                        openedTemplateRef={previewTemplateRef}
                        updateTemplate={() => { }}
                        deleteTemplate={() => { }}
                        closeModal={closePreview}
                        onSave={() => { }}
                        readOnly
                        onCopyTemplate={persistCopy}
                    />
                </SafeAreaView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: scaleSize(5),
        flexGrow: 1,
        paddingHorizontal: scaleSize(16),
    },
    hidden: {
        display: "none",
    },
    listContent: {
        paddingBottom: scaleSize(24),
        paddingTop: scaleSize(6),
    },
    separator: {
        height: scaleSize(14),
    },
    cardShadow: {
        borderRadius: CARD_RADIUS,
        backgroundColor: "transparent",
        overflow: "visible",
        minHeight: CARD_MIN_HEIGHT,
        ...Platform.select({
            ios: {
                shadowColor: TEMPLATE_SHADOW_COLOR,
                shadowOpacity: 0.24,
                shadowRadius: CARD_SHADOW_RADIUS,
                shadowOffset: { width: 0, height: CARD_SHADOW_OFFSET },
            },
            android: {
                elevation: 6,
            },
        }),
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: CARD_RADIUS,
        minHeight: CARD_MIN_HEIGHT,
        borderWidth: scaleSize(1.2),
        borderColor: TEMPLATE_CARD_BORDER,
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(18),
        justifyContent: "flex-start",
        overflow: "hidden",
    },
    cardPressed: {
        transform: [{ scale: 0.98 }],
        opacity: 0.9,
    },
    cardBackground: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: CARD_RADIUS,
    },
    iconWrap: {
        width: scaleSize(32),
        height: scaleSize(32),
        borderRadius: scaleSize(22),
        borderWidth: scaleSize(1.3),
        borderColor: TEMPLATE_ICON_BORDER,
        backgroundColor: TEMPLATE_ICON_BG,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: scaleSize(10),
    },
    cardContent: {
        flex: 1,
        minWidth: 0,
        marginLeft: scaleSize(18),
        paddingRight: scaleSize(6),
        justifyContent: "center",
        gap: scaleSize(6),
    },
    cardTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        color: "#F5F8FF",
        includeFontPadding: false,
    },
    cardSubRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    cardSubIcon: {
        marginRight: scaleSize(6),
    },
    cardSubtitle: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12.5),
        color: TEMPLATE_SUBTITLE_COLOR,
        includeFontPadding: false,
    },
    emptyState: {
        alignItems: "center",
        paddingHorizontal: scaleSize(24),
    },
    emptyCollapsed: {
        paddingVertical: scaleSize(18),
    },
    emptyExpanded: {
        flex: 1,
        justifyContent: "center",
        paddingVertical: scaleSize(40),
    },
    emptyTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(15),
        color: "#E9F1FF",
        includeFontPadding: false,
        marginBottom: scaleSize(6),
    },
    emptySubtitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12.5),
        color: TEMPLATE_SUBTITLE_COLOR,
        includeFontPadding: false,
        textAlign: "center",
    },
    previewModalContainer: {
        flex: 1,
        backgroundColor: theme.surface,
        paddingTop: scaleSize(18),
    },
});

export default memo(TemplatesSection);
