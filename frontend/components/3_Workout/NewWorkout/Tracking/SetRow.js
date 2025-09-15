import React, { memo, useEffect, useState } from "react";
import { View, StyleSheet, Text, Pressable, Dimensions, LayoutAnimation, Platform, UIManager, Keyboard } from "react-native";
import scaleSize from "../../../../helper/scaleSize";
import EditableStat from "./EditableStat";
import SetTypePanel from "./SetTypePanel";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import SwipeableItem, { OpenDirection, useSwipeableItemParams } from "react-native-swipeable-item";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import theme from "../../../../theme/mfpDark";

const { height: screenHeight } = Dimensions.get("window");
const scaledSize = (size) => scaleSize(size);
const ENABLE_LAYOUT_ANIM = false;

// Enable LayoutAnimation on Android once
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch {}
}

function SetRow({
    previousSet,
    set,
    sid,
    updateSet,
    onUpdateSetById,
    index,
    handleDelete,
    onDeleteSetById,
    isDone,
    onToggleIsDoneById,
    readOnly = false,
    itemKey,
    onFocusInput, // optional: notify parent when an input is focused
}) {
    const weight = set?.weight ?? 0;
    const reps = set?.reps ?? 0;
    const [doneLocal, setDoneLocal] = useState(!!isDone);
    useEffect(() => { setDoneLocal(!!isDone); }, [isDone, sid]);

    const renderUnderlayLeft = (swipeRef) => (
        <UnderlayLeft
            onDelete={() => {
                try { swipeRef?.current?.close?.(); } catch {}
                if (ENABLE_LAYOUT_ANIM) { try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch {} }
                onDeleteSetById ? onDeleteSetById(sid) : handleDelete(index);
            }}
        />
    );

    const [typePanelOpen, setTypePanelOpen] = useState(false);
    const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
    const openTypePanel = (e) => {
        if (readOnly) return;
        const y = e?.nativeEvent?.pageY || 0;
        setPanelPos({ top: y + scaledSize(8), left: scaledSize(20) });
        setTypePanelOpen(true);
    };
    const onSelectType = (type) => {
        const nextType = set?.type === type ? null : type;
        if (onUpdateSetById && sid) onUpdateSetById(sid, { ...set, type: nextType });
        else updateSet(index, { ...set, type: nextType });
    };

    return (
        <View style={styles.container}>
            <SwipeableItem
                item={set}
                itemKey={itemKey || (set && (set.id || String(index))) }
                overSwipe={scaledSize(36)}
                // Lower threshold so a light horizontal swipe wins over vertical scroll
                activationThreshold={8}
                renderUnderlayLeft={readOnly ? undefined : (params) => renderUnderlayLeft(params?.ref)}
                // Open a bit wider so the trash hit target is generous
                snapPointsLeft={readOnly ? [] : [scaledSize(96)]}
                onSwipeableLeftOpen={undefined} // never auto-delete via swipe threshold; explicit tap only
            >
                <View style={[styles.stat_row, doneLocal && styles.done]}>
                    <Pressable onPress={openTypePanel} style={[
                        styles.set_ctnr,
                        set?.type && [styles.set_ctnr_typed, typePillBg(set?.type)],
                    ]}>
                        <Text style={[styles.set_number_text, set?.type && [styles.set_letter_text, typePillText(set?.type)]]}>
                            {set?.type ? typeLetter(set?.type) : (index + 1)}
                        </Text>
                    </Pressable>

                    <View style={styles.previous_ctnr}>
                        <Text style={[styles.previous_stat_text, doneLocal && { color: "#afafaf" }]}>
                            {previousSet ? `${previousSet.reps} x ${previousSet.weight}lbs` : "—"}
                        </Text>
                    </View>

                    {/* Keep grey visuals, just block focus when read-only */}
                    <View style={styles.weight_unit_ctnr} pointerEvents={readOnly ? "none" : "auto"}>
                        <EditableStat
                            isFinished={doneLocal}                          // ← do NOT tie visuals to readOnly
                            value={String(weight)}
                            setValue={(value) => (onUpdateSetById ? onUpdateSetById(sid, { ...set, weight: value }) : updateSet(index, { ...set, weight: value }))}
                            onFocus={() => { try { onFocusInput?.(index); } catch {} }}
                        />
                    </View>

                    <View style={styles.reps_ctnr} pointerEvents={readOnly ? "none" : "auto"}>
                        <EditableStat
                            isFinished={doneLocal}                          // ← same here
                            value={String(reps)}
                            setValue={(value) => (onUpdateSetById ? onUpdateSetById(sid, { ...set, reps: value }) : updateSet(index, { ...set, reps: value }))}
                            onFocus={() => { try { onFocusInput?.(index); } catch {} }}
                        />
                    </View>

                    <View style={styles.done_ctnr}>
                        <Pressable
                            style={doneLocal ? styles.checkmark_ctnr_selected : styles.checkmark_ctnr}
                            onPress={() => {
                                if (readOnly) return;
                                // Optimistic local toggle for immediate UI feedback
                                setDoneLocal((d) => !d);
                                // Then trigger upstream state update
                                try { if (onToggleIsDoneById && sid) onToggleIsDoneById(sid); } catch {}
                                // Then dismiss keyboard; doing it second avoids missing the press
                                try { Keyboard.dismiss(); } catch {}
                            }}
                            disabled={readOnly}
                        >
                            {/* Brighter primary tint when unfinished for visibility */}
                            <MaterialCommunityIcons name="check-bold" size={scaledSize(16)} color={doneLocal ? "#fff" : theme.primary} />
                        </Pressable>
                    </View>
                </View>
            </SwipeableItem>

            <SetTypePanel
                visible={typePanelOpen}
                onClose={() => setTypePanelOpen(false)}
                position={panelPos}
                current={set?.type || null}
                onSelect={onSelectType}
            />
        </View>
    );
}

const rowEqual = (prev, next) => {
    if (prev.sid !== next.sid) return false;
    if (prev.index !== next.index) return false;
    const ps = prev.set || {}; const ns = next.set || {};
    if (ps.weight !== ns.weight) return false;
    if (ps.reps !== ns.reps) return false;
    if (!!ps.isDone !== !!ns.isDone) return false;
    if ((ps.type || null) !== (ns.type || null)) return false;
    // Re-render when previousSet changes (weight/reps), so initial N/A updates correctly
    const pp = prev.previousSet || {}; const np = next.previousSet || {};
    if ((pp.weight || 0) !== (np.weight || 0)) return false;
    if ((pp.reps || 0) !== (np.reps || 0)) return false;
    if (!!prev.readOnly !== !!next.readOnly) return false;
    return true;
};

export default memo(SetRow, rowEqual);

const UnderlayLeft = ({ onDelete }) => {
    const { percentOpen } = useSwipeableItemParams();
    const animWrap = useAnimatedStyle(
        () => ({
            transform: [{ scale: 0.92 + 0.08 * percentOpen.value }],
            opacity: Math.min(1, 0.2 + percentOpen.value),
        }),
        [percentOpen]
    );
    return (
        <View style={styles.underlayLeft}>
            <Animated.View style={[styles.deletePillWrap, animWrap]}>
                <Pressable onPress={onDelete} style={styles.deletePill} hitSlop={16}>
                    <Ionicons name="trash-outline" size={scaledSize(20)} color="#fff" />
                </Pressable>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    stat_row: { flexDirection: "row", paddingVertical: scaledSize(9), alignItems: "center", borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.16)' },
    done: { backgroundColor: theme.successRowBg },
    set_ctnr: {
        marginLeft: "5%",
        width: "8%",
        height: scaledSize(24),
        borderRadius: scaledSize(8),
        backgroundColor: theme.field,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.30)',
        alignItems: "center",
        justifyContent: "center",
    },
    previous_ctnr: { width: "38%", alignItems: "center", justifyContent: "center" },
    weight_unit_ctnr: { width: "18%", alignItems: "center" },
    reps_ctnr: { width: "18%", alignItems: "center" },
    set_number_text: { fontFamily: "Poppins_700Bold", fontSize: scaledSize(14), color: theme.textPrimary },
    set_ctnr_typed: { backgroundColor: theme.field },
    set_letter_text: { fontFamily: "Outfit_700Bold", fontSize: scaledSize(14.8) },
    // Make previous-set text more legible
    previous_stat_text: { fontFamily: "Poppins_700Bold", fontSize: scaledSize(15), color: theme.textPrimary },
    done_ctnr: { width: "10.5%", height: scaledSize(22), alignItems: "center" },
    checkmark_ctnr: {
        paddingHorizontal: scaledSize(10),
        height: "100%",
        borderRadius: scaledSize(7),
        backgroundColor: theme.restPillBg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.primaryHairline,
        justifyContent: "center",
    },
    checkmark_ctnr_selected: {
        paddingHorizontal: scaledSize(8),
        height: "100%",
        borderRadius: scaledSize(7),
        justifyContent: "center",
        backgroundColor: theme.success,
        borderWidth: 0,
    },
    underlayLeft: {
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "flex-end",
        marginVertical: scaledSize(2),
        paddingRight: scaledSize(12),
    },
    deletePillWrap: { height: "86%", justifyContent: "center", alignItems: "center" },
    deletePill: {
        width: scaledSize(70),
        height: "100%",
        minHeight: scaledSize(28),
        borderRadius: scaledSize(12),
        backgroundColor: "#e65252",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaledSize(10),
    },
});

function typePillBg(type) {
    switch (type) {
        case "warmup":
            return { backgroundColor: "rgba(251,146,60,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(251,146,60,0.7)" };
        case "dropset":
            return { backgroundColor: "rgba(168,85,247,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(168,85,247,0.7)" };
        case "failure":
            return { backgroundColor: "rgba(244,63,94,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(244,63,94,0.7)" };
        default:
            return { backgroundColor: theme.field };
    }
}
function typeLetter(type) {
    switch (type) {
        case "warmup": return "W";
        case "dropset": return "D";
        case "failure": return "F";
        default: return "";
    }
}

function typePillText(type) {
    switch (type) {
        case "warmup": return { color: "#FFFFFF" };
        case "dropset": return { color: "#FFFFFF" };
        case "failure": return { color: "#FFFFFF" };
        default: return { color: theme.textPrimary };
    }
}
