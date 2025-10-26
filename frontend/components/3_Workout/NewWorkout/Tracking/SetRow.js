import React, { memo, useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Text, Pressable, Dimensions, LayoutAnimation, Platform, UIManager, Keyboard } from "react-native";
import * as Haptics from "expo-haptics";
import scaleSize from "../../../../helper/scaleSize";
import EditableStat from "./EditableStat";
import SetTypePanel from "./SetTypePanel";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import SwipeableItem, { useSwipeableItemParams } from "react-native-swipeable-item";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import theme from "../../../../theme/mfpDark";
import workoutTypography from "../../shared/workoutTypography";
import { formatSetLabel, normalizeSetType } from "../../shared/setTypeUtils";

const { height: screenHeight } = Dimensions.get("window");
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
    displayNumber,
}) {
    const rawWeight = set?.weight ?? "";
    const rawReps = set?.reps ?? "";
    const [doneLocal, setDoneLocal] = useState(!!isDone);
    useEffect(() => { setDoneLocal(!!isDone); }, [isDone, sid]);

    const displayWeight = (!doneLocal && (rawWeight === 0 || rawWeight === "0")) ? "" : rawWeight;
    const displayReps = (!doneLocal && (rawReps === 0 || rawReps === "0")) ? "" : rawReps;

    const handleDeleteSwipe = useCallback(() => {
        if (readOnly) return;
        if (ENABLE_LAYOUT_ANIM) { try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch {} }
        if (onDeleteSetById && sid) onDeleteSetById(sid);
        else handleDelete(index);
        try { Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }, [readOnly, onDeleteSetById, sid, handleDelete, index]);

    const renderUnderlayLeft = useCallback((swipeRef) => (
        <UnderlayLeft
            onDelete={() => {
                try { swipeRef?.current?.close?.(); } catch {}
                handleDeleteSwipe();
            }}
        />
    ), [handleDeleteSwipe]);

    const [typePanelOpen, setTypePanelOpen] = useState(false);
    const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
    const openTypePanel = (e) => {
        if (readOnly) return;
        const y = e?.nativeEvent?.pageY || 0;
        setPanelPos({ top: y + scaleSize(8), left: scaleSize(20) });
        setTypePanelOpen(true);
    };
    const onSelectType = (type) => {
        const nextType = set?.type === type ? null : type;
        if (onUpdateSetById && sid) onUpdateSetById(sid, { ...set, type: nextType });
        else updateSet(index, { ...set, type: nextType });
    };

    const normalizedType = normalizeSetType(set?.type);
    const hasType = !!normalizedType;
    const label = formatSetLabel(displayNumber ?? (index + 1), normalizedType);

    return (
        <View style={styles.container}>
            <SwipeableItem
                item={set}
                itemKey={itemKey || (set && (set.id || String(index))) }
                overSwipe={scaleSize(36)}
                // Lower threshold so a light horizontal swipe wins over vertical scroll
                activationThreshold={8}
                renderUnderlayLeft={readOnly ? undefined : (params) => renderUnderlayLeft(params?.ref)}
                // Open a bit wider so the trash hit target is generous
                snapPointsLeft={readOnly ? [] : [scaleSize(96)]}
                onSwipeableLeftOpen={readOnly ? undefined : handleDeleteSwipe}
            >
                <View style={[styles.stat_row, doneLocal && styles.done]}>
                    <Pressable
                        onPress={openTypePanel}
                        style={[
                            styles.set_ctnr,
                            hasType && [styles.set_ctnr_typed, typePillBg(normalizedType)],
                        ]}
                    >
                        <Text style={[workoutTypography.setNumber, hasType && [workoutTypography.setLetter, typePillText(normalizedType)]]}>
                            {label}
                        </Text>
                    </Pressable>

                    <View style={styles.previous_ctnr}>
                        <Text style={[workoutTypography.previousStat, doneLocal && { color: "#afafaf" }]}>
                            {previousSet ? `${previousSet.reps} x ${previousSet.weight}lbs` : "—"}
                        </Text>
                    </View>

                    {/* Keep grey visuals, just block focus when read-only */}
                    <View style={styles.weight_unit_ctnr} pointerEvents={readOnly ? "none" : "auto"}>
                        <EditableStat
                            isFinished={doneLocal}                          // ← do NOT tie visuals to readOnly
                            value={displayWeight == null ? "" : String(displayWeight)}
                            setValue={(value) => (onUpdateSetById ? onUpdateSetById(sid, { ...set, weight: value }) : updateSet(index, { ...set, weight: value }))}
                            onFocus={() => { try { onFocusInput?.(index); } catch {} }}
                            previousValue={previousSet ? previousSet.weight : null}
                        />
                    </View>

                    <View style={styles.reps_ctnr} pointerEvents={readOnly ? "none" : "auto"}>
                        <EditableStat
                            isFinished={doneLocal}                          // ← same here
                            value={displayReps == null ? "" : String(displayReps)}
                            setValue={(value) => (onUpdateSetById ? onUpdateSetById(sid, { ...set, reps: value }) : updateSet(index, { ...set, reps: value }))}
                            onFocus={() => { try { onFocusInput?.(index); } catch {} }}
                            previousValue={previousSet ? previousSet.reps : null}
                        />
                    </View>

                    <View style={styles.done_ctnr}>
                        <Pressable
                            style={doneLocal ? styles.checkmark_ctnr_selected : styles.checkmark_ctnr}
                            onPress={() => {
                                if (readOnly) return;
                                // Optimistic local toggle for immediate UI feedback
                                const nextState = !doneLocal;
                                setDoneLocal(nextState);
                                // Then trigger upstream state update
                                try { if (onToggleIsDoneById && sid) onToggleIsDoneById(sid, nextState); } catch {}
                                // Then dismiss keyboard; doing it second avoids missing the press
                                try { Keyboard.dismiss(); } catch {}
                            }}
                            disabled={readOnly}
                        >
                            {/* Brighter primary tint when unfinished for visibility */}
                    <MaterialCommunityIcons name="check-bold" size={scaleSize(16)} color={doneLocal ? "#fff" : "#8A94A7"} />
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
    if ((prev.displayNumber ?? null) !== (next.displayNumber ?? null)) return false;
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
                    <Ionicons name="trash-outline" size={scaleSize(20)} color="#fff" />
                </Pressable>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    stat_row: { flexDirection: "row", paddingVertical: scaleSize(9), alignItems: "center", borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.16)' },
    done: { backgroundColor: theme.successRowBg },
    set_ctnr: {
        marginLeft: "5%",
        width: "8%",
        height: scaleSize(24),
        borderRadius: scaleSize(8),
        backgroundColor: theme.field,
        borderWidth: scaleSize(1),
        borderColor: 'rgba(255,255,255,0.30)',
        alignItems: "center",
        justifyContent: "center",
    },
    previous_ctnr: { width: "38%", alignItems: "center", justifyContent: "center" },
    weight_unit_ctnr: { width: "18%", alignItems: "center" },
    reps_ctnr: { width: "18%", alignItems: "center" },
    set_ctnr_typed: { backgroundColor: theme.field },
    done_ctnr: { width: "10.5%", height: scaleSize(22), alignItems: "center" },
    checkmark_ctnr: {
        paddingHorizontal: scaleSize(10),
        height: "100%",
        borderRadius: scaleSize(7),
        backgroundColor: theme.surface,
        borderWidth: 0,
        justifyContent: "center",
    },
    checkmark_ctnr_selected: {
        paddingHorizontal: scaleSize(8),
        height: "100%",
        borderRadius: scaleSize(7),
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
        marginVertical: scaleSize(2),
        paddingRight: scaleSize(12),
    },
    deletePillWrap: { height: "86%", justifyContent: "center", alignItems: "center" },
    deletePill: {
        width: scaleSize(70),
        height: "100%",
        minHeight: scaleSize(28),
        borderRadius: scaleSize(12),
        backgroundColor: "#e65252",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: scaleSize(10),
    },
});

function typePillBg(type) {
    switch (normalizeSetType(type)) {
        case "warmup":
            return { backgroundColor: "rgba(251,146,60,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(251,146,60,0.7)" };
        case "dropset":
            return { backgroundColor: "rgba(168,85,247,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(168,85,247,0.7)" };
        case "failure":
            return { backgroundColor: "rgba(244,63,94,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(244,63,94,0.7)" };
        case "left":
            return { backgroundColor: "rgba(14,165,233,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(14,165,233,0.7)" };
        case "right":
            return { backgroundColor: "rgba(52,211,153,0.45)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(52,211,153,0.7)" };
        default:
            return { backgroundColor: theme.field };
    }
}

function typePillText(type) {
    switch (normalizeSetType(type)) {
        case "warmup":
        case "dropset":
        case "failure":
        case "left":
        case "right":
            return { color: "#FFFFFF" };
        default:
            return { color: theme.textPrimary };
    }
}
