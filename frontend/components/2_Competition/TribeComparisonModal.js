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

// palette tweaks
const BLUE_BG = "#F1F6FF";         // kept for pills in editor
const BLUE_ICON_BG = "#E3EDFF";    // kept for editor accents
const BLUE_TEXT = "#5794fde3";     // kept for editor accents
const BLUE_PRIMARY = "rgba(105, 180, 242, 1)";    // save button
const GOLD = "#f6b00060";
const GOLD_TEXT = "#EAEAEA";

// neutral card palette (hooked to theme)
const CARD_BG = require("../../theme/mfpDark").default.surface;            // neutral cards
const CARD_BORDER = "rgba(255,255,255,0.10)";
const ICON_BG_NEUTRAL = require("../../theme/mfpDark").default.field;
const SUBTEXT = "#AEB5C0";

// soft accents per exercise (deterministic by name)
const ACCENTS = ["#2D9EFF", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#06B6D4"];
const pickAccent = (name = "") => {
    const str = String(name);
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return ACCENTS[h % ACCENTS.length];
};

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
                                    <Ionicons name="close" size={20} color="#EAEAEA" />
                                </Pressable>
                            </View>

                            <FlatList
                                data={items}
                                keyExtractor={(_, i) => `cmp-${i}`}
                                renderItem={({ item, index }) => {
                                    const ACC = pickAccent(item?.exercise);
                                    return (
                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            onPress={() => startEdit(index)}
                                            style={styles.itemCard}
                                        >
                                            {/* Accent bar */}
                                            <View style={[styles.itemAccent, { backgroundColor: ACC }]} />
                                            <View style={[styles.itemIconPill, { backgroundColor: ICON_BG_NEUTRAL }]}>
                                                <Ionicons name="trophy" size={18} color={ACC} />
                                            </View>
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
                                            <TouchableOpacity onPress={() => deleteItem(index)} hitSlop={10} style={{ padding: scaleSize(6) }}>
                                                <Ionicons name="trash-outline" size={18} color="#B00020" />
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
                                    <Ionicons name="add" size={18} color={GOLD_TEXT} style={{ marginRight: scaleSize(6) }} />
                                    <Text style={styles.addText}>Add Comparison</Text>
                                </RNBounceable>

                                <RNBounceable style={styles.saveButton} activeOpacity={0.9} onPress={handleSave}>
                                    <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: scaleSize(8) }} />
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
                                        <Ionicons name="close" size={20} color="#EAEAEA" />
                                    </Pressable>
                                </View>

                                {editing && (
                                    <>
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            style={styles.inputRow}
                                            onPress={() => setExercisePickerOpen(true)}
                                        >
                                            <Ionicons name="barbell" size={18} color="#EAEAEA" style={{ marginRight: scaleSize(10) }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.label}>Exercise</Text>
                                                <Text style={styles.value} numberOfLines={1}>{editing.exercise}</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color="#AEB5C0" />
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
                                                color={editing.normalizeByBodyweight ? BLUE_TEXT : "#AEB5C0"}
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
                                    <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: scaleSize(8) }} />
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
        borderRadius: scaleSize(18),
        backgroundColor: CARD_BG,
        padding: scaleSize(16),
    },
    editorCard: {
        width: scaleSize(Math.min(width - 32, 480)),
        borderRadius: scaleSize(18),
        backgroundColor: CARD_BG,
        padding: scaleSize(16),
    },

    // extra spacing below the header/title
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: scaleSize(14), // was 4
    },
    title: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(18), color: "#EAEAEA" },

    // modern neutral cards
    itemCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(12),
        paddingHorizontal: scaleSize(10),
        backgroundColor: CARD_BG,
        borderRadius: scaleSize(14),
        marginBottom: scaleSize(8),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: CARD_BORDER,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: scaleSize(6),
        shadowOffset: { width: 0, height: scaleSize(2) },
        elevation: 1,
        position: "relative",
    },
    itemAccent: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: scaleSize(3),
        borderTopLeftRadius: scaleSize(14),
        borderBottomLeftRadius: scaleSize(14),
    },
    itemIconPill: {
        width: scaleSize(30),
        height: scaleSize(30),
        borderRadius: scaleSize(15),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ICON_BG_NEUTRAL,
        marginRight: scaleSize(10),
    },
    itemTitle: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(14), color: "#EAEAEA" },
    itemMeta: { fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(12.5), color: SUBTEXT, marginTop: scaleSize(2) },

    emptyBox: { alignItems: "center", paddingVertical: scaleSize(20) },
    emptyText: { fontFamily: "Outfit_700Bold", color: "#EAEAEA" },
    emptySub: { fontFamily: "Outfit_400Regular", color: "#AEB5C0", marginTop: scaleSize(6) },

    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: scaleSize(12),
    },

    // gold add button
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: GOLD,
        borderRadius: scaleSize(14),
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(12),
        minHeight: scaleSize(44),
        flexShrink: 0,
    },
    addText: { fontFamily: "Outfit_700Bold", color: GOLD_TEXT, fontSize: scaleSize(13) },

    // lighter blue save button
    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: BLUE_PRIMARY,
        borderRadius: scaleSize(16),
        paddingHorizontal: scaleSize(20),
        paddingVertical: scaleSize(10),
        minHeight: scaleSize(44),
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(3) },
        elevation: 2,
        flexShrink: 0,
        marginLeft: scaleSize(10),
    },
    saveText: { fontFamily: "Outfit_700Bold", color: "#fff", fontSize: scaleSize(14.5) },

    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(10),
        borderBottomColor: CARD_BORDER,
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginTop: scaleSize(8),
    },
    label: { fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(13), color: "#EAEAEA" },
    value: { fontFamily: "Outfit_500Medium", fontSize: scaleSize(14), color: "#EAEAEA" },

    metricRow: { marginTop: scaleSize(12) },
    metricPills: { flexDirection: "row", marginTop: scaleSize(8) },
    pill: {
        borderRadius: scaleSize(999),
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(8),
        backgroundColor: "#1E232C",
        marginRight: scaleSize(8),
    },
    pillActive: { backgroundColor: BLUE_BG, borderWidth: scaleSize(1), borderColor: "#DBE9FF" },
    pillText: { fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(13), color: "#EAEAEA" },
    pillTextActive: { color: BLUE_TEXT },

    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: scaleSize(12),
        borderBottomColor: CARD_BORDER,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    subtle: { fontFamily: "Outfit_400Regular", fontSize: scaleSize(12), color: SUBTEXT },
});
