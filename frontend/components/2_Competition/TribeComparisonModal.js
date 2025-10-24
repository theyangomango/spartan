import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Pressable,
    FlatList,
    TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import SelectExerciseModal from "../2_Competition/SelectExercise/SelectExerciseModal";
import RNBounceable from "@freakycoder/react-native-bounceable";

import scaleSize from "../../helper/scaleSize";
import { withStrongPress } from "../../utils/haptics";

const METRICS = ["1RM", "Volume", "Reps"];
const metricLabel = (m) => (m === '1RM' ? '1RM (Adj)' : m);

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
const CARD_BG = theme.surface
const CARD_BORDER = theme.hairline;
const CARD_TEXT_PRIMARY = theme.textPrimary;
const TROPHY_ACCENT = theme.accentGold || "#F2C663";
const TROPHY_RING = "rgba(242, 198, 99, 0.18)";
const LIST_PILL_BG = "rgba(255, 239, 208, 0.88)";
const LIST_PILL_BORDER = "rgba(255, 224, 178, 0.92)";
const LIST_PILL_TEXT = "#4A341C";
const LIST_PILL_SECONDARY_BG = "rgba(135, 122, 188, 0.32)";
const LIST_PILL_SECONDARY_BORDER = "rgba(186, 174, 233, 0.55)";
const LIST_PILL_SECONDARY_TEXT = "#EADFFF";

export default function TribeComparisonModal({ visible, onClose, initialList = [], onSaveList }) {
    const [items, setItems] = useState(() => sanitize(initialList));
    const [editingIndex, setEditingIndex] = useState(-1);
    const [draft, setDraft] = useState(null);
    const [exercisePickerOpen, setExercisePickerOpen] = useState(false);

    const sanitizedInitial = React.useMemo(() => sanitize(initialList), [initialList]);

    const closeEditor = React.useCallback(() => {
        setEditingIndex(-1);
        setDraft(null);
        setExercisePickerOpen(false);
    }, []);

    React.useEffect(() => {
        if (!visible) return;
        setItems((prev) => {
            if (listsEqual(prev, sanitizedInitial)) return prev;
            closeEditor();
            return sanitizedInitial;
        });
    }, [visible, sanitizedInitial, closeEditor]);

    const persistList = React.useCallback(
        (nextList, options) => {
            const normalized = sanitize(nextList);
            setItems(normalized);
            onSaveList?.(normalized, { finalize: false, ...options });
        },
        [onSaveList]
    );

    const startAdd = () => {
        setDraft({ exercise: "Bench Press (Barbell)", metric: "1RM", normalizeByBodyweight: false });
        setEditingIndex(items.length);
    };

    const startEdit = (index) => {
        const base = items[index];
        setDraft(base ? sanitize([base])[0] : { exercise: "Bench Press (Barbell)", metric: "1RM", normalizeByBodyweight: false });
        setEditingIndex(index);
    };

    const deleteItem = (index) => {
        const next = items.filter((_, i) => i !== index);
        persistList(next);
        if (editingIndex === index) closeEditor();
    };

    const updateDraft = (patch) => {
        setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    };

    const handleSaveDraft = () => {
        if (!draft) {
            closeEditor();
            return;
        }
        const normalizedDraft = sanitize([draft])[0];
        let next;
        if (editingIndex >= items.length || editingIndex < 0) {
            next = [...items, normalizedDraft];
        } else {
            next = items.map((it, i) => (i === editingIndex ? normalizedDraft : it));
        }
        persistList(next);
        closeEditor();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={withStrongPress(onClose)}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <View style={styles.card}>
                            <View style={styles.headerRow}>
                                <View style={{ flex: 1, paddingRight: scaleSize(12) }}>
                                    <Text style={styles.title}>Manage Tribe Comparisons</Text>
                                    <Text style={styles.subtitle}>Choose the lifts and metrics shown for your tribe leaderboard</Text>
                                </View>
                                <Pressable hitSlop={12} onPress={withStrongPress(onClose)}>
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
                                                        onPress={withStrongPress(() => deleteItem(index))}
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
                                                onPress={withStrongPress(() => startEdit(index))}
                                                style={[styles.itemCard, isFirst && styles.itemCardFirst]}
                                            >
                                                <View style={styles.itemBody}>
                                                    <View style={styles.trophyBadge}>
                                                        <Ionicons
                                                            name="trophy"
                                                            size={scaleSize(15)}
                                                            color={TROPHY_ACCENT}
                                                            style={styles.trophyBadgeIcon}
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
                                <RNBounceable style={styles.addRow} activeOpacity={0.9} onPress={withStrongPress(startAdd)}>
                                    <Ionicons
                                        name="add"
                                        size={scaleSize(16)}
                                        color={ACTION_PRIMARY_TEXT}
                                        style={styles.addRowIcon}
                                    />
                                    <Text style={styles.addRowText}>Add Comparison</Text>
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
                onRequestClose={closeEditor}
            >
                <TouchableWithoutFeedback onPress={withStrongPress(closeEditor)}>
                    <View style={styles.backdrop}>
                        <TouchableWithoutFeedback onPress={() => { }}>
                            <View style={styles.editorCard}>
                                <View style={styles.headerRow}>
                                    <View style={{ flex: 1, paddingRight: scaleSize(12) }}>
                                        <Text style={styles.title}>Edit Comparison</Text>
                                        <Text style={styles.subtitle}>Choose the exercise and metric your tribe will compete in.</Text>
                                    </View>
                                    <Pressable hitSlop={12} onPress={withStrongPress(closeEditor)}>
                                        <Ionicons name="close" size={20} color={PRIMARY_TEXT} />
                                    </Pressable>
                                </View>

                                {draft && (
                                    <>
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            style={styles.inputRow}
                                            onPress={withStrongPress(() => setExercisePickerOpen(true))}
                                        >
                                            <Ionicons name="barbell" size={18} color={PRIMARY_TEXT} style={{ marginRight: scaleSize(10) }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.label}>Exercise</Text>
                                                <Text style={styles.value} numberOfLines={1}>{draft.exercise}</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color={SECONDARY_TEXT} />
                                        </TouchableOpacity>

                                        <View style={styles.metricRow}>
                                            <Text style={styles.label}>Metric</Text>
                                            <View style={styles.metricPills}>
                                                {METRICS.map((m) => {
                                                    const active = m === draft.metric;
                                                    return (
                                                        <TouchableOpacity
                                                            key={m}
                                                            onPress={withStrongPress(() => updateDraft({ metric: m }))}
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
                                            onPress={withStrongPress(() => updateDraft({ normalizeByBodyweight: !draft.normalizeByBodyweight }))}
                                        >
                                            <Ionicons
                                                name={draft.normalizeByBodyweight ? "checkbox" : "square-outline"}
                                                size={20}
                                                color={draft.normalizeByBodyweight ? CHECKBOX_ACTIVE : SECONDARY_TEXT}
                                                style={{ marginRight: scaleSize(10) }}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.label}>Normalize by Bodyweight</Text>
                                                <Text style={styles.subtle}>Rank by (metric ÷ bodyweight)</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </>
                                )}

                                <TouchableOpacity
                                    style={styles.saveButton}
                                    activeOpacity={0.9}
                                    onPress={withStrongPress(handleSaveDraft)}
                                >
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
                    animationType="none"
                    presentationStyle="overFullScreen"
                    statusBarTranslucent
                    onRequestClose={() => setExercisePickerOpen(false)}
                >
                    <SelectExerciseModal
                        closeModal={() => setExercisePickerOpen(false)}
                        setComparedExercise={(ex) => {
                            updateDraft({ exercise: ex });
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
        maxHeight: "80%",
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
        width: "100%",
        maxWidth: scaleSize(420),
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
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: scaleSize(14),
    },
    title: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(18), color: PRIMARY_TEXT, letterSpacing: 0.2 },
    subtitle: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(11.5),
        color: "rgba(230, 235, 250, 0.72)",
        letterSpacing: 0.2,
        marginTop: scaleSize(8),
        maxWidth: scaleSize(280),
    },

    list: { marginHorizontal: -scaleSize(18) },
    listContent: { paddingBottom: 0 },

    itemCard: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        alignSelf: "stretch",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: CARD_BORDER,
    },
    itemCardFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: CARD_BORDER },
    itemBody: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: scaleSize(10),
        paddingBottom: scaleSize(6),
        paddingHorizontal: scaleSize(18),
        width: "100%",
        flex: 1,
        backgroundColor: CARD_BG,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: CARD_BORDER,
        borderRadius: 0,
    },
    trophyBadge: {
        width: scaleSize(36),
        height: scaleSize(36),
        borderRadius: scaleSize(20),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: TROPHY_RING,
        marginRight: scaleSize(16),
    },
    trophyBadgeIcon: { marginTop: scaleSize(1) },
    itemContent: { flex: 1, minWidth: 0 },
    itemTitle: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
        color: CARD_TEXT_PRIMARY,
        letterSpacing: 0.2,
        lineHeight: scaleSize(16),
    },
    itemMetaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: scaleSize(5),
    },
    itemPill: {
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(3),
        borderRadius: scaleSize(999),
        borderWidth: scaleSize(1),
        marginRight: scaleSize(6),
        marginBottom: scaleSize(6),
    },
    itemPillPrimary: {
        backgroundColor: LIST_PILL_BG,
        borderColor: LIST_PILL_BORDER,
    },
    itemPillMuted: {
        backgroundColor: LIST_PILL_SECONDARY_BG,
        borderColor: LIST_PILL_SECONDARY_BORDER,
    },
    itemPillText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(9),
        color: LIST_PILL_TEXT,
        letterSpacing: 0.4,
        textTransform: "uppercase",
    },
    itemPillTextMuted: { color: LIST_PILL_SECONDARY_TEXT },
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
        borderRadius: scaleSize(16),
        width: "100%",
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: CARD_BORDER,
        marginTop: scaleSize(12),
        backgroundColor: theme.primary,
    },
    addRowText: {
        fontFamily: "Outfit_700Bold",
        color: ACTION_PRIMARY_TEXT,
        fontSize: scaleSize(13),
        letterSpacing: 0.4,
    },
    addRowIcon: {
        marginRight: scaleSize(6),
    },

    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(22),
        paddingVertical: scaleSize(12),
        minHeight: scaleSize(44),
        borderRadius: scaleSize(18),
        backgroundColor: ACTION_PRIMARY,
        shadowColors: "#000",
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
