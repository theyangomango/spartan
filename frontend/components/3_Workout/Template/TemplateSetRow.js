import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import scaleSize from "../../../helper/scaleSize";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SwipeableItem, { useSwipeableItemParams } from 'react-native-swipeable-item';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import TemplateEditableStat from './TemplateEditableStat';
import theme from "../../../theme/mfpDark";
import SetTypePanel from "../NewWorkout/Tracking/SetTypePanel";
import { withStrongPress } from "../../../utils/haptics";

export default function TemplateSetRow({ set, updateSet, index, handleDelete, readOnly = false }) {
    const weight = Number(set?.weight ?? 0);
    const reps = Number(set?.reps ?? 0);

    const [isTypePanelVisible, setIsTypePanelVisible] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });

    const openTypePanel = (event) => {
        if (readOnly) return;
        const y = event?.nativeEvent?.pageY || 0;
        setPanelPosition({ top: y + scaleSize(8), left: scaleSize(20) });
        setIsTypePanelVisible(true);
    };

    const handleSelectType = (type) => {
        const nextType = set?.type === type ? null : type;
        updateSet(index, { ...set, type: nextType });
    };

    const renderUnderlayLeft = (swipeRef) => (
        <UnderlayLeft
            onDelete={() => {
                try { swipeRef?.current?.close?.(); } catch {}
                try { handleDelete?.(); } catch {}
            }}
        />
    );

    return (
        <View style={styles.container}>
            {readOnly ? (
                <View style={styles.stat_row}>
                    <Pressable
                        disabled
                        style={[styles.set_ctnr, set?.type && [styles.set_ctnr_typed, typePillBg(set?.type)]]}
                    >
                        <Text style={[styles.set_number_text, set?.type && [styles.set_letter_text, typePillText(set?.type)]]}>
                            {set?.type ? typeLetter(set?.type) : (index + 1)}
                        </Text>
                    </Pressable>

                    <View style={styles.previous_ctnr}>
                        <Text style={styles.previous_stat_text}>—</Text>
                    </View>

                    <View style={styles.weight_unit_ctnr}>
                        <TemplateEditableStat
                            value={String(weight)}
                            setValue={(value) => updateSet(index, { ...set, weight: value })}
                            readOnly
                        />
                    </View>

                    <View style={styles.reps_ctnr}>
                        <TemplateEditableStat
                            value={String(reps)}
                            setValue={(value) => updateSet(index, { ...set, reps: value })}
                            readOnly
                        />
                    </View>

                    <View style={styles.done_ctnr}>
                        <View style={styles.checkmark_ctnr}>
                            <MaterialCommunityIcons name="check-bold" size={scaleSize(16)} color={theme.textSecondary} />
                        </View>
                    </View>
                </View>
            ) : (
                <SwipeableItem
                    key={index}
                    item={set}
                    itemKey={(set && (set.id || String(index))) || `tpl-set-${index}`}
                    overSwipe={scaleSize(36)}
                    activationThreshold={8}
                    renderUnderlayLeft={(params) => renderUnderlayLeft(params?.ref)}
                    snapPointsLeft={[scaleSize(96)]}
                    onSwipeableLeftOpen={undefined}
                >
                    <View style={styles.stat_row}>
                        <Pressable
                            onPress={withStrongPress(openTypePanel)}
                            style={[styles.set_ctnr, set?.type && [styles.set_ctnr_typed, typePillBg(set?.type)]]}
                        >
                            <Text style={[styles.set_number_text, set?.type && [styles.set_letter_text, typePillText(set?.type)]]}>
                                {set?.type ? typeLetter(set?.type) : (index + 1)}
                            </Text>
                        </Pressable>

                        <View style={styles.previous_ctnr}>
                            <Text style={styles.previous_stat_text}>—</Text>
                        </View>

                        <View style={styles.weight_unit_ctnr}>
                            <TemplateEditableStat
                                value={String(weight)}
                                setValue={(value) => updateSet(index, { ...set, weight: value })}
                            />
                        </View>

                        <View style={styles.reps_ctnr}>
                            <TemplateEditableStat
                                value={String(reps)}
                                setValue={(value) => updateSet(index, { ...set, reps: value })}
                            />
                        </View>

                        <View style={styles.done_ctnr}>
                            <View style={styles.checkmark_ctnr} pointerEvents="none">
                                <MaterialCommunityIcons name="check-bold" size={scaleSize(16)} color={theme.textSecondary} />
                            </View>
                        </View>
                    </View>
                </SwipeableItem>
            )}

            {!readOnly && (
                <SetTypePanel
                    visible={isTypePanelVisible}
                    onClose={() => setIsTypePanelVisible(false)}
                    position={panelPosition}
                    current={set?.type || null}
                    onSelect={handleSelectType}
                />
            )}
        </View>
    );
}

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
                <Pressable onPress={withStrongPress(onDelete)} style={styles.deletePill} hitSlop={16}>
                    <Ionicons name="trash-outline" size={scaleSize(20)} color="#fff" />
                </Pressable>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    stat_row: { flexDirection: 'row', paddingVertical: scaleSize(9), alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.16)' },
    set_ctnr: {
        marginLeft: '5%',
        width: '8%',
        height: scaleSize(24),
        borderRadius: scaleSize(8),
        backgroundColor: theme.field,
        borderWidth: scaleSize(1),
        borderColor: 'rgba(255,255,255,0.30)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    set_ctnr_typed: { backgroundColor: theme.field },
    set_letter_text: { fontFamily: 'Outfit_700Bold', fontSize: scaleSize(14.8) },
    previous_ctnr: { width: '38%', alignItems: 'center', justifyContent: 'center' },
    weight_unit_ctnr: { width: '18%', alignItems: 'center' },
    reps_ctnr: { width: '18%', alignItems: 'center' },
    set_number_text: { fontFamily: 'Poppins_700Bold', fontSize: scaleSize(14), color: theme.textPrimary },
    previous_stat_text: { fontFamily: 'Poppins_700Bold', fontSize: scaleSize(15), color: theme.textPrimary },
    done_ctnr: { width: '10.5%', height: scaleSize(22), alignItems: 'center' },
    checkmark_ctnr: {
        paddingHorizontal: scaleSize(10),
        height: '100%',
        borderRadius: scaleSize(7),
        backgroundColor: theme.field,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.16)',
        justifyContent: 'center',
    },
    underlayLeft: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginVertical: scaleSize(2),
        paddingRight: scaleSize(12),
    },
    deletePillWrap: { height: '86%', justifyContent: 'center', alignItems: 'center' },
    deletePill: {
        width: scaleSize(70),
        height: '100%',
        minHeight: scaleSize(28),
        borderRadius: scaleSize(12),
        backgroundColor: '#e65252',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaleSize(10),
    },
});

function normalizeType(value) {
    const raw = typeof value === 'string' ? value.toLowerCase() : '';
    return raw === 'warmup' || raw === 'dropset' || raw === 'failure' ? raw : null;
}

function typePillBg(type) {
    switch (normalizeType(type)) {
        case 'warmup':
            return { backgroundColor: 'rgba(251,146,60,0.45)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(251,146,60,0.7)' };
        case 'dropset':
            return { backgroundColor: 'rgba(168,85,247,0.45)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(168,85,247,0.7)' };
        case 'failure':
            return { backgroundColor: 'rgba(244,63,94,0.45)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(244,63,94,0.7)' };
        default:
            return { backgroundColor: theme.field };
    }
}

function typeLetter(type) {
    switch (normalizeType(type)) {
        case 'warmup': return 'W';
        case 'dropset': return 'D';
        case 'failure': return 'F';
        default: return '';
    }
}

function typePillText(type) {
    switch (normalizeType(type)) {
        case 'warmup':
        case 'dropset':
        case 'failure':
            return { color: '#FFFFFF' };
        default:
            return { color: theme.textPrimary };
    }
}
