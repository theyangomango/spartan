import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    FlatList,
    Dimensions,
    TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Weight } from "iconsax-react-native";
import SelectExerciseModal from "../2_Competition/SelectExercise/SelectExerciseModal";
import RNBounceable from "@freakycoder/react-native-bounceable";

import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";

const METRICS = ["1RM", "Volume", "Reps"];
const metricLabel = (m) => (m === "1RM" ? "1RM" : m);
const { width } = Dimensions.get("window");

const theme = require("../../theme/mfpDark").default;

const CARD_MAX_WIDTH = Math.min(width - scaleSize(40), scaleSize(520));
const CARD_BG = "rgba(18, 20, 28, 0.97)";
const CARD_GRADIENT = ["#262938", "#141621"];
const CARD_STROKE = "rgba(116, 140, 210, 0.24)";
const HEADER_GRADIENT = ["rgba(36, 38, 56, 0.96)", "rgba(18, 20, 32, 0.94)"];
const HEADER_BORDER = "rgba(126, 148, 206, 0.34)";
const SECTION_DIVIDER = "rgba(96, 112, 170, 0.22)";

// Styled to mirror the refreshed Tribe Banner treatment
const TRIBE_CARD_GRADIENT = ["#31344A", "#1C1D2C"];
const TRIBE_CARD_BORDER = "rgba(138, 152, 218, 0.38)";
const TRIBE_ACCENT = "#F4C56E";
const TRIBE_TEXT_PRIMARY = "#F5F6FF";
const TRIBE_ACCENT_BG = "rgba(244, 197, 110, 0.2)";
const TRIBE_ACCENT_BORDER = "rgba(244, 197, 110, 0.38)";
const TRIBE_BADGE_BG = "rgba(244, 197, 110, 0.18)";
const TRIBE_BADGE_BORDER = "rgba(244, 197, 110, 0.32)";
const TRIBE_BADGE_SECONDARY_BG = "rgba(148, 198, 255, 0.18)";
const TRIBE_BADGE_SECONDARY_BORDER = "rgba(148, 198, 255, 0.32)";
const TRIBE_BADGE_TEXT = "#FCE3B5";
const TRIBE_BADGE_TEXT_SECONDARY = "#D6E8FF";
const TRIBE_DELETE_BG = "rgba(255, 122, 140, 0.16)";
const TRIBE_DELETE_BORDER = "rgba(255, 150, 162, 0.32)";
const TRIBE_DELETE_ICON = "#FFB5BF";
const ITEM_SHADOW_COLOR = "rgba(16, 18, 30, 0.4)";

const ADD_BTN_GRADIENT = ["#3A3D55", "#25273A"];

const FOOTER_GRADIENT = ["#2D9EFF", "#7BB8FF"];
const EMPTY_GRADIENT = ["rgba(244, 197, 110, 0.08)", "rgba(28, 30, 44, 0.82)"];
const OPTION_BG = "rgba(27, 29, 42, 0.92)";
const OPTION_BORDER = "rgba(132, 148, 206, 0.32)";
const TOGGLE_ACTIVE_BG = "rgba(244, 197, 110, 0.22)";
const TOGGLE_ACTIVE_BORDER = "rgba(244, 197, 110, 0.45)";

export default function TribeComparisonModal({ visible, onClose, initialList = [], onSaveList }) {
    const [items, setItems] = useState(() => sanitize(initialList));
    const [editingIndex, setEditingIndex] = useState(-1);
    const [exercisePickerOpen, setExercisePickerOpen] = useState(false);

    React.useEffect(() => {
        if (visible) {
            setItems(sanitize(initialList));
            setEditingIndex(-1);
            setExercisePickerOpen(false);
        }
    }, [visible, initialList]);

    const startAdd = () => {
        setItems((prev) => [
            ...prev,
            { exercise: "Bench Press (Barbell)", metric: "1RM", normalizeByBodyweight: false },
        ]);
        setEditingIndex(items.length);
    };

    const startEdit = (index) => setEditingIndex(index);

    const deleteItem = (index) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(-1);
    };

    const updateField = (index, patch) => {
        setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
    };

    const handleSave = () => onSaveList?.(sanitize(items));

    const editing = editingIndex >= 0 ? items[editingIndex] : null;

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={withStrongPress(onClose)}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <View style={styles.card}>
                            <LinearGradient
                                colors={CARD_GRADIENT}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.cardGradient}
                                pointerEvents="none"
                            />
                            <LinearGradient colors={HEADER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                                <View style={styles.headerCopy}>
                                    <Text style={styles.title}>Tribe Comparisons</Text>
                                    <Text style={styles.subtitle} numberOfLines={2}>
                                        Pick the lifts your tribe competes on.
                                    </Text>
                                </View>
                                <Pressable hitSlop={12} onPress={withStrongPress(onClose)} style={styles.closeBtn}>
                                    <Ionicons name="close" size={18} color={TRIBE_TEXT_PRIMARY} />
                                </Pressable>
                            </LinearGradient>

                            <View style={styles.listSection}>
                                <FlatList
                                    data={items}
                                    keyExtractor={(_, i) => `cmp-${i}`}
                                    contentContainerStyle={[
                                        styles.listContent,
                                        items.length === 0 && styles.listContentEmpty,
                                    ]}
                                    renderItem={({ item, index }) => {
                                        const metricCopy = metricLabel(item.metric);
                                        const summary = `Ranked by ${metricCopy}${item.normalizeByBodyweight ? " • per lb" : ""}`;

                                        return (
                                            <TouchableOpacity
                                                activeOpacity={0.92}
                                                onPress={withStrongPress(() => startEdit(index))}
                                                style={styles.itemTouchable}
                                            >
                                                <View style={styles.itemShadow}>
                                                    <LinearGradient
                                                        colors={TRIBE_CARD_GRADIENT}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 1 }}
                                                        style={styles.itemCard}
                                                    >
                                                        <View style={styles.itemContent}>
                                                            <View style={styles.itemIconPill}>
                                                                <Weight size={scaleSize(18)} color={TRIBE_ACCENT} variant="Bold" />
                                                            </View>
                                                            <View style={styles.itemTextColumn}>
                                                                <Text style={styles.itemTitle} numberOfLines={1}>
                                                                    {item.exercise}
                                                                </Text>
                                                                <Text style={styles.itemSubtitle} numberOfLines={1}>
                                                                    {summary}
                                                                </Text>
                                                                <View style={styles.itemMetaRow}>
                                                                    <View style={styles.metaBadge}>
                                                                        <Text style={styles.metaBadgeText}>{metricCopy}</Text>
                                                                    </View>
                                                                    {item.normalizeByBodyweight ? (
                                                                        <View style={[styles.metaBadge, styles.metaBadgeSecondary]}>
                                                                            <Text style={[styles.metaBadgeText, styles.metaBadgeTextSecondary]}>per lb</Text>
                                                                        </View>
                                                                    ) : null}
                                                                </View>
                                                            </View>
                                                            <TouchableOpacity
                                                                onPress={withStrongPress(() => deleteItem(index))}
                                                                hitSlop={10}
                                                                style={styles.deletePill}
                                                            >
                                                                <Ionicons name="trash-outline" size={scaleSize(16)} color={TRIBE_DELETE_ICON} />
                                                            </TouchableOpacity>
                                                        </View>
                                                    </LinearGradient>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    }}
                                    ListEmptyComponent={(
                                        <View style={styles.emptyState}>
                                            <LinearGradient
                                                colors={EMPTY_GRADIENT}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.emptyGradient}
                                            >
                                                <View style={styles.emptyIcon}>
                                                    <Ionicons name="sparkles-outline" size={scaleSize(18)} color={TRIBE_ACCENT} />
                                                </View>
                                                <Text style={styles.emptyTitle}>No comparisons yet</Text>
                                                <Text style={styles.emptySubtitle}>
                                                    Add lifts or goals to let everyone know what winning looks like for your tribe.
                                                </Text>
                                            </LinearGradient>
                                        </View>
                                    )}
                                />
                            </View>

                            <View style={styles.footerRow}>
                                <RNBounceable
                                    style={styles.addBtnOuter}
                                    activeScale={0.97}
                                    onPress={withStrongPress(startAdd)}
                                >
                                    <LinearGradient
                                        colors={ADD_BTN_GRADIENT}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.addBtn}
                                    >
                                        <Ionicons
                                            name="add"
                                            size={scaleSize(18)}
                                            color={TRIBE_TEXT_PRIMARY}
                                            style={{ marginRight: scaleSize(8) }}
                                        />
                                        <Text style={styles.addText}>Add comparison</Text>
                                    </LinearGradient>
                                </RNBounceable>

                                {/* <RNBounceable
                                    style={styles.saveBtnOuter}
                                    activeScale={0.96}
                                    onPress={withStrongPress(handleSave)}
                                >
                                    <LinearGradient
                                        colors={FOOTER_GRADIENT}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.saveGradient}
                                    >
                                        <Ionicons
                                            name="save-outline"
                                            size={scaleSize(17)}
                                            color="#0e1320"
                                            style={{ marginRight: scaleSize(8) }}
                                        />
                                        <Text style={styles.saveText}>Save</Text>
                                    </LinearGradient>
                                </RNBounceable> */}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>

            <Modal
                visible={editingIndex >= 0}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setEditingIndex(-1)}
            >
                <TouchableWithoutFeedback onPress={withStrongPress(() => setEditingIndex(-1))}>
                    <View style={styles.backdrop}>
                        <TouchableWithoutFeedback onPress={() => { }}>
                            <View style={styles.editorCard}>
                                <LinearGradient
                                    colors={HEADER_GRADIENT}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.editorHeader}
                                >
                                    <View style={styles.editorHeaderCopy}>
                                        <Text style={styles.editorTitle}>Edit comparison</Text>
                                        {editing ? (
                                            <Text style={styles.editorSubtitle} numberOfLines={1}>
                                                {editing.exercise}
                                            </Text>
                                        ) : null}
                                    </View>
                                    <Pressable
                                        hitSlop={12}
                                        onPress={withStrongPress(() => setEditingIndex(-1))}
                                        style={styles.closeBtn}
                                    >
                                        <Ionicons name="close" size={18} color={TRIBE_TEXT_PRIMARY} />
                                    </Pressable>
                                </LinearGradient>

                                {editing ? (
                                    <View style={styles.editorBody}>
                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            style={styles.optionCard}
                                            onPress={withStrongPress(() => setExercisePickerOpen(true))}
                                        >
                                            <View style={styles.optionIcon}>
                                                <Weight size={scaleSize(18)} color={TRIBE_ACCENT} variant="Bold" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.optionLabel}>Exercise</Text>
                                                <Text style={styles.optionValue} numberOfLines={1}>
                                                    {editing.exercise}
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={scaleSize(18)} color={theme.textSecondary} />
                                        </TouchableOpacity>

                                        <Text style={styles.sectionLabel}>Metric</Text>
                                        <View style={styles.metricPills}>
                                            {METRICS.map((m) => {
                                                const active = m === editing.metric;
                                                return (
                                                    <TouchableOpacity
                                                        key={m}
                                                        onPress={withStrongPress(() => updateField(editingIndex, { metric: m }))}
                                                        activeOpacity={0.85}
                                                        style={[styles.metricChip, active && styles.metricChipActive]}
                                                    >
                                                        <Text
                                                            style={[styles.metricChipText, active && styles.metricChipTextActive]}
                                                        >
                                                            {metricLabel(m)}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        <TouchableOpacity
                                            style={styles.toggleCard}
                                            activeOpacity={0.88}
                                            onPress={withStrongPress(() =>
                                                updateField(editingIndex, {
                                                    normalizeByBodyweight: !editing.normalizeByBodyweight,
                                                })
                                            )}
                                        >
                                            <View style={styles.optionIcon}>
                                                <Ionicons
                                                    name="body-outline"
                                                    size={scaleSize(18)}
                                                    color={theme.primary}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.optionLabel}>Normalize by bodyweight</Text>
                                                <Text style={styles.optionHint}>Rank by (metric ÷ bodyweight)</Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.toggleBadge,
                                                    editing.normalizeByBodyweight && styles.toggleBadgeActive,
                                                ]}
                                            >
                                                <Ionicons
                                                    name={editing.normalizeByBodyweight ? "checkmark" : "add"}
                                                    size={scaleSize(16)}
                                                    color={editing.normalizeByBodyweight ? theme.textPrimary : theme.textSecondary}
                                                />
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                ) : null}

                                <RNBounceable
                                    style={styles.doneBtnOuter}
                                    activeScale={0.96}
                                    onPress={withStrongPress(() => setEditingIndex(-1))}
                                >
                                    <LinearGradient
                                        colors={FOOTER_GRADIENT}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.doneGradient}
                                    >
                                        <Ionicons
                                            name="checkmark"
                                            size={scaleSize(18)}
                                            color="#0e1320"
                                            style={{ marginRight: scaleSize(6) }}
                                        />
                                        <Text style={styles.doneText}>Done</Text>
                                    </LinearGradient>
                                </RNBounceable>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>

                <Modal
                    visible={exercisePickerOpen}
                    transparent
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={() => setExercisePickerOpen(false)}
                >
                    <SelectExerciseModal
                        closeModal={() => setExercisePickerOpen(false)}
                        setComparedExercise={(ex) => {
                            updateField(editingIndex, { exercise: ex });
                            setExercisePickerOpen(false);
                        }}
                    />
                </Modal>
            </Modal>
        </Modal>
    );
}

const sanitize = (arr) =>
    (arr || []).map((x) => ({
        exercise: x?.exercise || "Bench Press (Barbell)",
        metric: x?.metric || "1RM",
        normalizeByBodyweight: !!x?.normalizeByBodyweight,
    }));

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(4, 7, 12, 0.74)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: scaleSize(18),
    },
    card: {
        width: CARD_MAX_WIDTH,
        borderRadius: scaleSize(24),
        backgroundColor: CARD_BG,
        borderWidth: scaleSize(1),
        borderColor: CARD_STROKE,
        overflow: "hidden",
        shadowColor: "rgba(10, 12, 24, 0.6)",
        shadowOpacity: 0.26,
        shadowRadius: scaleSize(20),
        shadowOffset: { width: 0, height: scaleSize(12) },
        elevation: 10,
    },
    cardGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        paddingHorizontal: scaleSize(22),
        paddingTop: scaleSize(20),
        paddingBottom: scaleSize(18),
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: HEADER_BORDER,
    },
    headerCopy: { flex: 1, paddingRight: scaleSize(12) },
    title: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(18),
        color: TRIBE_TEXT_PRIMARY,
    },
    subtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(12.5),
        color: "rgba(214, 220, 255, 0.76)",
        marginTop: scaleSize(6),
    },
    closeBtn: {
        width: scaleSize(32),
        height: scaleSize(32),
        borderRadius: scaleSize(16),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(44, 46, 66, 0.72)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(136, 152, 218, 0.36)",
    },
    listSection: {
        paddingHorizontal: scaleSize(18),
        paddingTop: scaleSize(18),
        paddingBottom: scaleSize(12),
        maxHeight: scaleSize(360),
    },
    listContent: {
        paddingBottom: scaleSize(12),
    },
    listContentEmpty: {
        flexGrow: 1,
        justifyContent: "center",
    },
    itemTouchable: {
        borderRadius: scaleSize(20),
        marginBottom: scaleSize(14),
        alignSelf: "stretch",
    },
    itemShadow: {
        borderRadius: scaleSize(20),
        shadowColor: ITEM_SHADOW_COLOR,
        shadowOpacity: 0.24,
        shadowRadius: scaleSize(16),
        shadowOffset: { width: 0, height: scaleSize(7) },
        elevation: 6,
        backgroundColor: "transparent",
        alignSelf: "stretch",
    },
    itemCard: {
        borderRadius: scaleSize(20),
        borderWidth: scaleSize(1),
        borderColor: TRIBE_CARD_BORDER,
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(11),
        overflow: "hidden",
        width: "100%",
    },
    itemContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    itemIconPill: {
        width: scaleSize(32),
        height: scaleSize(32),
        borderRadius: scaleSize(16),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: TRIBE_ACCENT_BG,
        borderWidth: scaleSize(1),
        borderColor: TRIBE_ACCENT_BORDER,
        marginRight: scaleSize(12),
    },
    itemTextColumn: {
        flex: 1,
        minWidth: 0,
    },
    itemTitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: scaleSize(13),
        color: TRIBE_TEXT_PRIMARY,
        letterSpacing: 0.18,
    },
    itemSubtitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(11),
        color: "rgba(201, 208, 238, 0.75)",
        marginTop: scaleSize(2),
    },
    itemMetaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        marginTop: scaleSize(8),
        gap: scaleSize(6),
    },
    metaBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(4),
        borderRadius: scaleSize(999),
        backgroundColor: TRIBE_BADGE_BG,
        borderWidth: scaleSize(1),
        borderColor: TRIBE_BADGE_BORDER,
    },
    metaBadgeSecondary: {
        backgroundColor: TRIBE_BADGE_SECONDARY_BG,
        borderColor: TRIBE_BADGE_SECONDARY_BORDER,
    },
    metaBadgeText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(10),
        color: TRIBE_BADGE_TEXT,
        letterSpacing: 0.36,
        textTransform: "uppercase",
    },
    metaBadgeTextSecondary: {
        color: TRIBE_BADGE_TEXT_SECONDARY,
    },
    deletePill: {
        width: scaleSize(34),
        height: scaleSize(34),
        borderRadius: scaleSize(18),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: TRIBE_DELETE_BG,
        borderWidth: scaleSize(1),
        borderColor: TRIBE_DELETE_BORDER,
        marginLeft: scaleSize(12),
    },
    emptyState: { alignItems: "center" },
    emptyGradient: {
        width: "100%",
        borderRadius: scaleSize(18),
        paddingVertical: scaleSize(26),
        paddingHorizontal: scaleSize(18),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(120, 184, 255, 0.24)",
        alignItems: "center",
    },
    emptyIcon: {
        width: scaleSize(44),
        height: scaleSize(44),
        borderRadius: scaleSize(22),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: TRIBE_ACCENT_BG,
        marginBottom: scaleSize(12),
    },
    emptyTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(15),
        color: TRIBE_TEXT_PRIMARY,
    },
    emptySubtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(12.5),
        color: "rgba(210, 218, 246, 0.75)",
        textAlign: "center",
        marginTop: scaleSize(8),
    },
    footerRow: {
        paddingHorizontal: scaleSize(18),
        paddingBottom: scaleSize(20),
        paddingTop: scaleSize(10),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: SECTION_DIVIDER,
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(12),
    },
    addBtnOuter: { flex: 1 },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(12),
        borderRadius: scaleSize(18),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(138, 152, 218, 0.32)",
    },
    addText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13.5),
        color: TRIBE_TEXT_PRIMARY,
    },
    saveBtnOuter: { flex: 1 },
    saveGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(12),
        borderRadius: scaleSize(18),
    },
    saveText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        color: "#0e1320",
    },
    editorCard: {
        width: Math.min(width - scaleSize(48), scaleSize(420)),
        borderRadius: scaleSize(24),
        backgroundColor: CARD_BG,
        borderWidth: scaleSize(1),
        borderColor: CARD_STROKE,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.28,
        shadowRadius: scaleSize(18),
        shadowOffset: { width: 0, height: scaleSize(12) },
        elevation: 12,
    },
    editorHeader: {
        paddingHorizontal: scaleSize(20),
        paddingVertical: scaleSize(18),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: HEADER_BORDER,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    editorHeaderCopy: { flex: 1, paddingRight: scaleSize(12) },
    editorTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(17),
        color: TRIBE_TEXT_PRIMARY,
    },
    editorSubtitle: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(12.5),
        color: "rgba(214, 220, 255, 0.74)",
        marginTop: scaleSize(4),
    },
    editorBody: {
        paddingHorizontal: scaleSize(20),
        paddingTop: scaleSize(18),
        paddingBottom: scaleSize(14),
        gap: scaleSize(16),
    },
    optionCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(14),
        borderRadius: scaleSize(18),
        backgroundColor: OPTION_BG,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: OPTION_BORDER,
    },
    optionIcon: {
        width: scaleSize(40),
        height: scaleSize(40),
        borderRadius: scaleSize(20),
        alignItems: "center",
        justifyContent: "center",
        marginRight: scaleSize(12),
        backgroundColor: TRIBE_ACCENT_BG,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: TRIBE_ACCENT_BORDER,
    },
    optionLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(13),
        color: "rgba(218, 224, 255, 0.82)",
    },
    optionValue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        color: TRIBE_TEXT_PRIMARY,
        marginTop: scaleSize(4),
    },
    sectionLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12.5),
        color: "rgba(204, 210, 245, 0.6)",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginTop: scaleSize(4),
    },
    metricPills: { flexDirection: "row", flexWrap: "wrap", gap: scaleSize(8) },
    metricChip: {
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(7),
        borderRadius: scaleSize(999),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: OPTION_BORDER,
        backgroundColor: "rgba(35, 38, 58, 0.82)",
    },
    metricChipActive: {
        backgroundColor: TRIBE_ACCENT_BG,
        borderColor: TRIBE_ACCENT_BORDER,
    },
    metricChipText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(12.5),
        color: "rgba(212, 220, 255, 0.68)",
    },
    metricChipTextActive: { color: TRIBE_TEXT_PRIMARY },
    toggleCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(14),
        borderRadius: scaleSize(18),
        backgroundColor: OPTION_BG,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: OPTION_BORDER,
    },
    optionHint: {
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(12),
        color: "rgba(206, 214, 248, 0.5)",
        marginTop: scaleSize(4),
    },
    toggleBadge: {
        width: scaleSize(34),
        height: scaleSize(34),
        borderRadius: scaleSize(17),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(42, 44, 62, 0.82)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: OPTION_BORDER,
    },
    toggleBadgeActive: {
        backgroundColor: TOGGLE_ACTIVE_BG,
        borderColor: TOGGLE_ACTIVE_BORDER,
    },
    doneBtnOuter: {
        paddingHorizontal: scaleSize(20),
        paddingBottom: scaleSize(20),
    },
    doneGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: scaleSize(18),
        paddingVertical: scaleSize(12),
    },
    doneText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        color: "#0e1320",
    },
});
