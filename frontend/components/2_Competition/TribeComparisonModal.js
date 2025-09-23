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
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import SelectExerciseModal from "../2_Competition/SelectExercise/SelectExerciseModal";
import RNBounceable from "@freakycoder/react-native-bounceable";

import scaleSize from "../../helper/scaleSize";

const METRICS = ["1RM", "Volume", "Reps"];
const metricLabel = (m) => (m === '1RM' ? '1RM' : m);
const { width } = Dimensions.get("window");

const theme = require("../../theme/mfpDark").default;

// palette tuned to match competition stack
const MODAL_BG = theme.fieldDeep;
const TILE_BG = theme.surface;
const TILE_BORDER = theme.hairline;
const MONOGRAM_BG = theme.field;
const PRIMARY_TEXT = theme.textPrimary;
const SECONDARY_TEXT = theme.textSecondary;
const ACTION_PRIMARY = theme.primary;
const ACTION_PRIMARY_TEXT = "#FFFFFF";
const ACTION_GHOST_BG = theme.field;
const ACTION_GHOST_TEXT = theme.textPrimary;
const ACTION_GHOST_BORDER = theme.hairline;
const DELETE_RED = "#FF5C63";
const CHECKBOX_ACTIVE = theme.primary;
const PILL_ACTIVE_BG = "rgba(45, 158, 255, 0.16)";
const PILL_ACTIVE_BORDER = theme.primaryHairline || "rgba(45, 158, 255, 0.45)";
const PILL_ACTIVE_TEXT = theme.accentBlue || theme.primary;

// Manage cards – dark theme styling
const CARD_BG = theme.surface;
const CARD_BORDER = theme.hairline;
const CARD_TEXT_PRIMARY = theme.textPrimary;
const CARD_PILL_PRIMARY_BG = "rgba(235, 244, 255, 0.16)";
const CARD_PILL_PRIMARY_BORDER = "rgba(174, 208, 255, 0.28)";
const CARD_PILL_PRIMARY_TEXT = "#F5FAFF";
const CARD_PILL_MUTED_BG = "rgba(126, 108, 255, 0.2)";
const CARD_PILL_MUTED_BORDER = "rgba(170, 153, 255, 0.42)";
const CARD_PILL_MUTED_TEXT = "#E2DEFF";
const TROPHY_ACCENT = theme.accentGold || "#F2C663";
const TROPHY_RING = "rgba(242, 198, 99, 0.18)";

export default function TribeComparisonModal({ visible, onClose, initialList = [], onSaveList }) {
    const [items, setItems] = useState(() => sanitize(initialList));
    const [editingIndex, setEditingIndex] = useState(-1);
    const [exercisePickerOpen, setExercisePickerOpen] = useState(false);

    const sanitizedInitial = React.useMemo(() => sanitize(initialList), [initialList]);

    React.useEffect(() => {
        if (!visible) return;
        setItems((prev) => {
            if (listsEqual(prev, sanitizedInitial)) return prev;
            setEditingIndex(-1);
            setExercisePickerOpen(false);
            return sanitizedInitial;
        });
    }, [visible, sanitizedInitial]);

    const commitItems = React.useCallback(
        (nextOrUpdater, options) => {
            setItems((prev) => {
                const next = typeof nextOrUpdater === "function" ? nextOrUpdater(prev) : nextOrUpdater;
                const normalized = sanitize(next);
                const payloadOptions = options ? { finalize: false, ...options } : { finalize: false };
                if (listsEqual(prev, normalized)) return prev;
                onSaveList?.(normalized, payloadOptions);
                return normalized;
            });
        },
        [onSaveList]
    );

    const startAdd = () => {
        const nextIndex = items.length;
        commitItems((prev) => [...prev, { exercise: "Bench Press (Barbell)", metric: "1RM", normalizeByBodyweight: false }]);
        setEditingIndex(nextIndex);
    };

    const startEdit = (index) => setEditingIndex(index);

    const deleteItem = (index) => {
        commitItems((prev) => prev.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(-1);
    };

    const updateField = (index, patch) => {
        commitItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
    };

    const editing = editingIndex >= 0 ? items[editingIndex] : null;

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <View style={styles.card}>
                            <View style={styles.headerRow}>
                                <View>
                                    <Text style={styles.title}>Manage Tribe Comparisons</Text>
                                    <Text style={styles.subtitle}>Choose the metrics shown for your tribe leaderboard</Text>
                                </View>
                                <Pressable hitSlop={12} onPress={onClose}>
                                    <Ionicons name="close" size={20} color={PRIMARY_TEXT} />
                                </Pressable>
                            </View>

                            <FlatList
                                style={styles.list}
                                data={items}
                                keyExtractor={(_, i) => `cmp-${i}`}
                                renderItem={({ item, index }) => {
                                    const isFirst = index === 0;
                                    const pills = [
                                        { key: "metric", label: metricLabel(item.metric), tone: "primary" },
                                        ...(item.normalizeByBodyweight
                                            ? [{ key: "per", label: "per lb", tone: "muted" }]
                                            : []),
                                    ];

                                    return (
                                        <Swipeable
                                            overshootRight={false}
                                            friction={2.2}
                                            rightThreshold={scaleSize(32)}
                                            renderRightActions={(progress, dragX) => (
                                                <View style={styles.swipeActions}>
                                                    <RNBounceable
                                                        style={styles.swipeDelete}
                                                        onPress={() => deleteItem(index)}
                                                        activeOpacity={0.9}
                                                    >
                                                        <Ionicons name="trash" size={16} color={DELETE_RED} style={{ marginRight: scaleSize(6) }} />
                                                        <Text style={styles.swipeDeleteText}>Delete</Text>
                                                    </RNBounceable>
                                                </View>
                                            )}
                                        >
                                            <TouchableOpacity
                                                activeOpacity={0.9}
                                                onPress={() => startEdit(index)}
                                                style={[styles.itemCard, isFirst && styles.itemCardFirst]}
                                            >
                                                <View style={styles.itemBody}>
                                                    <View style={styles.trophyBadge}>
                                                        <Ionicons
                                                            name="trophy"
                                                            size={scaleSize(16)}
                                                            color={TROPHY_ACCENT}
                                                        />
                                                    </View>
                                                    <View style={styles.itemContent}>
                                                        <Text style={styles.itemTitle} numberOfLines={1}>
                                                            {item.exercise}
                                                        </Text>
                                                        <View style={styles.itemMetaRow}>
                                                            {pills.map((pill) => (
                                                                <View
                                                                    key={pill.key}
                                                                    style={[styles.itemPill, pill.tone === "muted" ? styles.itemPillMuted : styles.itemPillPrimary]}
                                                                >
                                                                    <Text
                                                                        style={[styles.itemPillText, pill.tone === "muted" && styles.itemPillTextMuted]}
                                                                        numberOfLines={1}
                                                                    >
                                                                        {pill.label}
                                                                    </Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        </Swipeable>
                                    );
                                }}
                                ListEmptyComponent={
                                    <View style={styles.emptyBox}>
                                        <Text style={styles.emptyText}>No comparisons yet</Text>
                                        <Text style={styles.emptySub}>Add targets for exercises, metrics, and per-lb normalization.</Text>
                                    </View>
                                }
                                contentContainerStyle={styles.listContent}
                            />

                            <View style={styles.footerRow}>
                                <RNBounceable style={styles.addRow} activeOpacity={0.9} onPress={startAdd}>
                                    <Text style={styles.addRowText}>+ Add Comparison</Text>
                                </RNBounceable>
                            </View>

                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
            {/* Inline editor */}
            <Modal
                visible={editingIndex >= 0}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setEditingIndex(-1)}
            >
                <TouchableWithoutFeedback onPress={() => setEditingIndex(-1)}>
                    <View style={styles.backdrop}>
                        <TouchableWithoutFeedback onPress={() => { }}>
                            <View style={styles.editorCard}>
                                <View style={styles.headerRow}>
                                    <Text style={styles.title}>Edit Comparison</Text>
                                    <Pressable hitSlop={12} onPress={() => setEditingIndex(-1)}>
                                        <Ionicons name="close" size={20} color={PRIMARY_TEXT} />
                                    </Pressable>
                                </View>

                                {editing && (
                                    <>
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            style={styles.inputRow}
                                            onPress={() => setExercisePickerOpen(true)}
                                        >
                                            <Ionicons name="barbell" size={18} color={PRIMARY_TEXT} style={{ marginRight: scaleSize(10) }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.label}>Exercise</Text>
                                                <Text style={styles.value} numberOfLines={1}>{editing.exercise}</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color={SECONDARY_TEXT} />
                                        </TouchableOpacity>

                                        <View style={styles.metricRow}>
                                            <Text style={styles.label}>Metric</Text>
                                            <View style={styles.metricPills}>
                                                {METRICS.map((m) => {
                                                    const active = m === editing.metric;
                                                    return (
                                                        <TouchableOpacity
                                                            key={m}
                                                            onPress={() => updateField(editingIndex, { metric: m })}
                                                            style={[styles.pill, active && styles.pillActive]}
                                                            activeOpacity={0.85}
                                                        >
                                                            <Text style={[styles.pillText, active && styles.pillTextActive]}>{metricLabel(m)}</Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.toggleRow}
                                            activeOpacity={0.85}
                                            onPress={() => updateField(editingIndex, { normalizeByBodyweight: !editing.normalizeByBodyweight })}
                                        >
                                            <Ionicons
                                                name={editing.normalizeByBodyweight ? "checkbox" : "square-outline"}
                                                size={20}
                                                color={editing.normalizeByBodyweight ? CHECKBOX_ACTIVE : SECONDARY_TEXT}
                                                style={{ marginRight: scaleSize(10) }}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.label}>Normalize by Bodyweight</Text>
                                                <Text style={styles.subtle}>Rank by (metric ÷ bodyweight)</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </>
                                )}

                                <TouchableOpacity style={styles.saveButton} activeOpacity={0.9} onPress={() => setEditingIndex(-1)}>
                                    <Ionicons name="checkmark" size={18} color={ACTION_PRIMARY_TEXT} style={{ marginRight: scaleSize(8) }} />
                                    <Text style={styles.saveText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>

                {/* Exercise picker */}
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

const listsEqual = (a = [], b = []) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        const left = a[i];
        const right = b[i];
        if (!right) return false;
        if (left.exercise !== right.exercise) return false;
        if (left.metric !== right.metric) return false;
        if (!!left.normalizeByBodyweight !== !!right.normalizeByBodyweight) return false;
    }
    return true;
};

const sanitize = (arr) =>
    (arr || []).map((x) => ({
        exercise: x?.exercise || "Bench Press (Barbell)",
        metric: x?.metric || "1RM",
        normalizeByBodyweight: !!x?.normalizeByBodyweight,
    }));

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: scaleSize(18),
    },
    card: {
        width: "100%",
        borderRadius: scaleSize(20),
        backgroundColor: MODAL_BG,
        padding: scaleSize(18),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: TILE_BORDER,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: scaleSize(20),
        shadowOffset: { width: 0, height: scaleSize(10) },
        elevation: 6,
    },
    editorCard: {
        width: scaleSize(Math.min(width - 32, 480)),
        borderRadius: scaleSize(20),
        backgroundColor: MODAL_BG,
        padding: scaleSize(18),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: TILE_BORDER,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: scaleSize(20),
        shadowOffset: { width: 0, height: scaleSize(10) },
        elevation: 6,
    },

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: scaleSize(16),
    },
    title: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(18), color: PRIMARY_TEXT },

    list: { marginHorizontal: -scaleSize(18) },
    listContent: { paddingBottom: 0 },

    itemCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "transparent",
        width: "100%",
        alignSelf: "stretch",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: CARD_BORDER,
    },
    itemCardFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: CARD_BORDER },
    itemBody: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(8),
        paddingHorizontal: scaleSize(14),
        width: "100%",
        flex: 1,
        backgroundColor: CARD_BG,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: CARD_BORDER,
        borderRadius: scaleSize(10),
    },
    trophyBadge: {
        width: scaleSize(28),
        height: scaleSize(28),
        borderRadius: scaleSize(14),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: TROPHY_RING,
        marginRight: scaleSize(10),
    },
    itemContent: { flex: 1, marginRight: scaleSize(8), minWidth: 0 },
    itemTitle: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: scaleSize(13.5),
        color: CARD_TEXT_PRIMARY,
        letterSpacing: 0.2,
    },
    itemMetaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: scaleSize(8) },
    itemPill: {
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(3),
        borderRadius: scaleSize(999),
        borderWidth: StyleSheet.hairlineWidth,
        marginRight: scaleSize(6),
        marginBottom: scaleSize(6),
    },
    itemPillPrimary: {
        backgroundColor: CARD_PILL_PRIMARY_BG,
        borderColor: CARD_PILL_PRIMARY_BORDER,
    },
    itemPillMuted: {
        backgroundColor: CARD_PILL_MUTED_BG,
        borderColor: CARD_PILL_MUTED_BORDER,
    },
    itemPillText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(10.5),
        color: CARD_PILL_PRIMARY_TEXT,
        letterSpacing: 0.2,
    },
    itemPillTextMuted: { color: CARD_PILL_MUTED_TEXT },
    swipeActions: {
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        paddingRight: scaleSize(6),
        height: "100%",
    },
    swipeDelete: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(18),
        minWidth: scaleSize(110),
        height: "100%",
        backgroundColor: "rgba(255,92,99,0.12)",
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderLeftColor: "rgba(255, 120, 126, 0.32)",
    },
    swipeDeleteText: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(12.5), color: DELETE_RED, letterSpacing: 0.2 },

    emptyBox: { alignItems: "center", paddingVertical: scaleSize(24) },
    emptyText: { fontFamily: "Outfit_700Bold", color: PRIMARY_TEXT },
    emptySub: { fontFamily: "Outfit_400Regular", color: SECONDARY_TEXT, marginTop: scaleSize(6), textAlign: "center" },

    footerRow: { marginTop: scaleSize(6) },
    addRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(12),
        width: "100%",
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: CARD_BORDER,
        borderRadius: scaleSize(12),
        backgroundColor: theme.primary,
        marginTop: scaleSize(12),
    },
    addRowText: {
        fontFamily: "Outfit_700Bold",
        color: ACTION_PRIMARY_TEXT,
        fontSize: scaleSize(13),
        letterSpacing: 0.4,
    },

    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(22),
        paddingVertical: scaleSize(12),
        minHeight: scaleSize(44),
        borderRadius: scaleSize(18),
        backgroundColor: ACTION_PRIMARY,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: scaleSize(14),
        shadowOffset: { width: 0, height: scaleSize(6) },
        elevation: 3,
        flexShrink: 0,
    },
    saveText: { fontFamily: "Outfit_700Bold", color: ACTION_PRIMARY_TEXT, fontSize: scaleSize(14.5) },

    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(12),
        borderBottomColor: TILE_BORDER,
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginTop: scaleSize(10),
    },
    label: { fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(13), color: PRIMARY_TEXT },
    value: { fontFamily: "Outfit_500Medium", fontSize: scaleSize(14), color: PRIMARY_TEXT },

    metricRow: { marginTop: scaleSize(14) },
    metricPills: { flexDirection: "row", marginTop: scaleSize(10) },
    pill: {
        borderRadius: scaleSize(999),
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(8),
        backgroundColor: MONOGRAM_BG,
        marginRight: scaleSize(8),
    },
    pillActive: {
        backgroundColor: PILL_ACTIVE_BG,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: PILL_ACTIVE_BORDER,
    },
    pillText: { fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(13), color: SECONDARY_TEXT },
    pillTextActive: { color: PILL_ACTIVE_TEXT },

    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(14),
        borderBottomColor: TILE_BORDER,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    subtle: { fontFamily: "Outfit_400Regular", fontSize: scaleSize(12), color: SECONDARY_TEXT },
});
