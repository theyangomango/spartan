import React, { useMemo, useState } from "react";
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

const METRICS = ["1RM", "Volume", "Reps"];
const { width } = Dimensions.get("window");

export default function TribeComparisonModal({ visible, onClose, initialList = [], onSaveList }) {
    const [items, setItems] = useState(() => sanitize(initialList));
    const [editingIndex, setEditingIndex] = useState(-1);
    const [exercisePickerOpen, setExercisePickerOpen] = useState(false);

    // ensure state sync when re-opened
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
            {/* Tap outside to close main list modal */}
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop}>
                    {/* Stop propagation inside the card */}
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <View style={styles.card}>
                            <View style={styles.headerRow}>
                                <Text style={styles.title}>Manage Tribe Comparisons</Text>
                                <Pressable hitSlop={12} onPress={onClose}>
                                    <Ionicons name="close" size={20} color="#111" />
                                </Pressable>
                            </View>

                            <FlatList
                                data={items}
                                keyExtractor={(_, i) => `cmp-${i}`}
                                renderItem={({ item, index }) => (
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={() => startEdit(index)}
                                        style={styles.itemRow}
                                    >
                                        <Ionicons name="trophy" size={18} color="#abababff" style={{ marginRight: 10 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.itemTitle} numberOfLines={1}>
                                                {item.exercise} • {item.metric}{item.normalizeByBodyweight ? " • per lb" : ""}
                                            </Text>
                                            <Text style={styles.itemSub}>Tap to edit</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => deleteItem(index)} hitSlop={10} style={{ padding: 6 }}>
                                            <Ionicons name="trash-outline" size={18} color="#B00020" />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <View style={styles.emptyBox}>
                                        <Text style={styles.emptyText}>No comparisons yet</Text>
                                        <Text style={styles.emptySub}>Add targets for exercises, metrics, and per-lb normalization.</Text>
                                    </View>
                                }
                                contentContainerStyle={{ paddingBottom: 8 }}
                            />

                            {/* Footer buttons — one line */}
                            <View style={styles.footerRow}>
                                <TouchableOpacity style={styles.addBtn} activeOpacity={0.9} onPress={startAdd}>
                                    <Ionicons name="add" size={18} color="#4C3A00" style={{ marginRight: 6 }} />
                                    <Text style={styles.addText}>Add Comparison</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.saveButton} activeOpacity={0.9} onPress={handleSave}>
                                    <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.saveText}>Save</Text>
                                </TouchableOpacity>
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
                {/* Tap outside to close editor */}
                <TouchableWithoutFeedback onPress={() => setEditingIndex(-1)}>
                    <View style={styles.backdrop}>
                        {/* Stop propagation inside editor card */}
                        <TouchableWithoutFeedback onPress={() => { }}>
                            <View style={styles.editorCard}>
                                <View style={styles.headerRow}>
                                    <Text style={styles.title}>Edit Comparison</Text>
                                    <Pressable hitSlop={12} onPress={() => setEditingIndex(-1)}>
                                        <Ionicons name="close" size={20} color="#111" />
                                    </Pressable>
                                </View>

                                {editing && (
                                    <>
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            style={styles.inputRow}
                                            onPress={() => setExercisePickerOpen(true)}
                                        >
                                            <Ionicons name="barbell" size={18} color="#333" style={{ marginRight: 10 }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.label}>Exercise</Text>
                                                <Text style={styles.value} numberOfLines={1}>{editing.exercise}</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color="#444" />
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
                                                            <Text style={[styles.pillText, active && styles.pillTextActive]}>{m}</Text>
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
                                                color={editing.normalizeByBodyweight ? "#2A65D9" : "#555"}
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
        backgroundColor: "#fff",
        padding: 16,
    },
    editorCard: {
        width: Math.min(width - 32, 480),
        borderRadius: 18,
        backgroundColor: "#fff",
        padding: 16,
    },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    title: { fontFamily: "Outfit_700Bold", fontSize: 18, color: "#111" },

    itemRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#eee",
    },
    itemTitle: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#59AAEE" },
    itemSub: { fontFamily: "Outfit_500Medium", fontSize: 12, color: "#6a6a6a" },

    emptyBox: { alignItems: "center", paddingVertical: 20 },
    emptyText: { fontFamily: "Outfit_700Bold", color: "#333" },
    emptySub: { fontFamily: "Outfit_400Regular", color: "#777", marginTop: 6 },

    /* Footer: keep on one line and prevent wrapping */
    footerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 12,
    },

    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fde492ff", // golden (matches tribe banner)
        borderColor: "#E6BF52",
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minHeight: 44,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
        flexShrink: 0,
    },
    addText: { fontFamily: "Outfit_700Bold", color: "#4C3A00" },

    /* Primary save (blue) */
    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#59AAEE",   // Spartan blue
        borderRadius: 16,
        paddingHorizontal: 20,        // extra horizontal padding
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
        borderBottomColor: "#eee",
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginTop: 8,
    },
    label: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "#333" },
    value: { fontFamily: "Outfit_500Medium", fontSize: 14, color: "#111" },

    metricRow: { marginTop: 12 },
    metricPills: { flexDirection: "row", marginTop: 8 },
    pill: {
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: "#F2F4F8",
        marginRight: 8,
    },
    pillActive: { backgroundColor: "#E8F0FF", borderWidth: 1, borderColor: "#CFE0FF" },
    pillText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "#333" },
    pillTextActive: { color: "#2A65D9" },

    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomColor: "#eee",
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    subtle: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#666" },
});
