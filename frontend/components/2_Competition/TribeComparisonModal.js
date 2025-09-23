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
        setItems((prev) => [...prev, { exercise: "Bench Press (Barbell)", metric: "1RM", normalizeByBodyweight: false }]);
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
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <View style={styles.card}>
                            <View style={styles.headerRow}>
                                <Text style={styles.title}>Manage Tribe Comparisons</Text>
                                <Pressable hitSlop={12} onPress={onClose}>
                                    <Ionicons name="close" size={20} color={PRIMARY_TEXT} />
                                </Pressable>
                            </View>

                            <FlatList
                                data={items}
                                keyExtractor={(_, i) => `cmp-${i}`}
                                renderItem={({ item, index }) => {
                                    return (
                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            onPress={() => startEdit(index)}
                                            style={styles.itemCard}
                                        >
                                            <View style={{ flex: 1, marginRight: scaleSize(8) }}>
                                                {/* line 1: exercise */}
                                                <Text style={styles.itemTitle} numberOfLines={1}>
                                                    {item.exercise}
                                                </Text>
                                                {/* line 2: metric + per-lb */}
                                                <Text style={styles.itemMeta} numberOfLines={1}>
                                                    {metricLabel(item.metric)}{item.normalizeByBodyweight ? " • per lb" : ""}
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => deleteItem(index)} hitSlop={10} style={styles.deleteBtn}>
                                                <Ionicons name="trash-outline" size={18} color={DELETE_RED} />
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={
                                    <View style={styles.emptyBox}>
                                        <Text style={styles.emptyText}>No comparisons yet</Text>
                                        <Text style={styles.emptySub}>Add targets for exercises, metrics, and per-lb normalization.</Text>
                                    </View>
                                }
                                contentContainerStyle={{ paddingBottom: scaleSize(8) }}
                            />

                            <View style={styles.footerRow}>
                                <RNBounceable style={styles.addBtn} activeOpacity={0.9} onPress={startAdd}>
                                    <Ionicons name="add" size={18} color={ACTION_GHOST_TEXT} style={{ marginRight: scaleSize(6) }} />
                                    <Text style={styles.addText}>Add Comparison</Text>
                                </RNBounceable>

                                <RNBounceable style={styles.saveButton} activeOpacity={0.9} onPress={handleSave}>
                                    <Ionicons name="save-outline" size={18} color={ACTION_PRIMARY_TEXT} style={{ marginRight: scaleSize(8) }} />
                                    <Text style={styles.saveText}>Save</Text>
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

    itemCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(14),
        paddingHorizontal: scaleSize(18),
        backgroundColor: TILE_BG,
        borderRadius: scaleSize(18),
        marginBottom: scaleSize(10),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: TILE_BORDER,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: scaleSize(12),
        shadowOffset: { width: 0, height: scaleSize(6) },
        elevation: 2,
    },
    deleteBtn: {
        padding: scaleSize(6),
        borderRadius: scaleSize(12),
        backgroundColor: "rgba(255,92,99,0.14)",
        marginLeft: scaleSize(4),
    },
    itemTitle: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(14), color: PRIMARY_TEXT },
    itemMeta: { fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(12.5), color: SECONDARY_TEXT, marginTop: scaleSize(2) },

    emptyBox: { alignItems: "center", paddingVertical: scaleSize(24) },
    emptyText: { fontFamily: "Outfit_700Bold", color: PRIMARY_TEXT },
    emptySub: { fontFamily: "Outfit_400Regular", color: SECONDARY_TEXT, marginTop: scaleSize(6), textAlign: "center" },

    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: scaleSize(16),
    },

    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(12),
        minHeight: scaleSize(44),
        borderRadius: scaleSize(18),
        backgroundColor: ACTION_GHOST_BG,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: ACTION_GHOST_BORDER,
        flexShrink: 0,
    },
    addText: { fontFamily: "Outfit_700Bold", color: ACTION_GHOST_TEXT, fontSize: scaleSize(13.5) },

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