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

const METRICS = ["1RM", "Volume", "Reps"];
const metricLabel = (m) => (m === '1RM' ? '1RM (Adj)' : m);
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
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                {/* line 1: exercise */}
                                                <Text style={styles.itemTitle} numberOfLines={1}>
                                                    {item.exercise}
                                                </Text>
                                                {/* line 2: metric + per-lb */}
                                                <Text style={styles.itemMeta} numberOfLines={1}>
                                                    {metricLabel(item.metric)}{item.normalizeByBodyweight ? " • per lb" : ""}
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => deleteItem(index)} hitSlop={10} style={{ padding: 6 }}>
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
                                contentContainerStyle={{ paddingBottom: 8 }}
                            />

                            <View style={styles.footerRow}>
                                <RNBounceable style={styles.addBtn} activeOpacity={0.9} onPress={startAdd}>
                                    <Ionicons name="add" size={18} color={GOLD_TEXT} style={{ marginRight: 6 }} />
                                    <Text style={styles.addText}>Add Comparison</Text>
                                </RNBounceable>

                                <RNBounceable style={styles.saveButton} activeOpacity={0.9} onPress={handleSave}>
                                    <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
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
                                            <Ionicons name="barbell" size={18} color="#EAEAEA" style={{ marginRight: 10 }} />
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
                                                style={{ marginRight: 10 }}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.label}>Normalize by Bodyweight</Text>
                                                <Text style={styles.subtle}>Rank by (metric ÷ bodyweight)</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </>
                                )}

                                <TouchableOpacity style={styles.saveButton} activeOpacity={0.9} onPress={() => setEditingIndex(-1)}>
                                    <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 8 }} />
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
        paddingHorizontal: 18,
    },
    card: {
        width: "100%",
        borderRadius: 18,
        backgroundColor: CARD_BG,
        padding: 16,
    },
    editorCard: {
        width: Math.min(width - 32, 480),
        borderRadius: 18,
        backgroundColor: CARD_BG,
        padding: 16,
    },

    // extra spacing below the header/title
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14, // was 4
    },
    title: { fontFamily: "Outfit_700Bold", fontSize: 18, color: "#EAEAEA" },

    // modern neutral cards
    itemCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 10,
        backgroundColor: CARD_BG,
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: CARD_BORDER,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
        position: "relative",
    },
    itemAccent: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        borderTopLeftRadius: 14,
        borderBottomLeftRadius: 14,
    },
    itemIconPill: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ICON_BG_NEUTRAL,
        marginRight: 10,
    },
    itemTitle: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#EAEAEA" },
    itemMeta: { fontFamily: "Outfit_600SemiBold", fontSize: 12.5, color: SUBTEXT, marginTop: 2 },

    emptyBox: { alignItems: "center", paddingVertical: 20 },
    emptyText: { fontFamily: "Outfit_700Bold", color: "#EAEAEA" },
    emptySub: { fontFamily: "Outfit_400Regular", color: "#AEB5C0", marginTop: 6 },

    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 12,
    },

    // gold add button
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: GOLD,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 44,
        flexShrink: 0,
    },
    addText: { fontFamily: "Outfit_700Bold", color: GOLD_TEXT, fontSize: 13 },

    // lighter blue save button
    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: BLUE_PRIMARY,
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        minHeight: 44,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
        flexShrink: 0,
        marginLeft: 10,
    },
    saveText: { fontFamily: "Outfit_700Bold", color: "#fff", fontSize: 14.5 },

    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomColor: CARD_BORDER,
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginTop: 8,
    },
    label: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "#EAEAEA" },
    value: { fontFamily: "Outfit_500Medium", fontSize: 14, color: "#EAEAEA" },

    metricRow: { marginTop: 12 },
    metricPills: { flexDirection: "row", marginTop: 8 },
    pill: {
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: "#1E232C",
        marginRight: 8,
    },
    pillActive: { backgroundColor: BLUE_BG, borderWidth: 1, borderColor: "#DBE9FF" },
    pillText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "#EAEAEA" },
    pillTextActive: { color: BLUE_TEXT },

    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomColor: CARD_BORDER,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    subtle: { fontFamily: "Outfit_400Regular", fontSize: 12, color: SUBTEXT },
});
