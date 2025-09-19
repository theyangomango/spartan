import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, Pressable, Dimensions } from 'react-native';
import scaleSize from "../../../helper/scaleSize";
import { FontAwesome5 } from '@expo/vector-icons';
import SwipeableItem, { OpenDirection, useSwipeableItemParams } from 'react-native-swipeable-item';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import TemplateEditableStat from './TemplateEditableStat';
import theme from "../../../theme/mfpDark";
import SetTypePanel from "../NewWorkout/Tracking/SetTypePanel";

const { height: screenHeight } = Dimensions.get('window');
const scaledSize = (size) => scaleSize(size);

export default function TemplateSetRow({ set, updateSet, index, handleDelete }) {
    const weight = set.weight;
    const reps = set.reps;

    const itemRefs = useRef(new Map());
    const [isTypePanelVisible, setIsTypePanelVisible] = useState(false);
    const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });

    const renderUnderlayLeft = () => (
        <UnderlayLeft handleDelete={handleDelete} />
    );

    const openTypePanel = (event) => {
        const y = event?.nativeEvent?.pageY || 0;
        setPanelPosition({ top: scaleSize(y + scaledSize(8)), left: scaleSize(scaledSize(20)) });
        setIsTypePanelVisible(true);
    };

    const handleSelectType = (type) => {
        const nextType = set?.type === type ? null : type;
        updateSet(index, { ...set, type: nextType });
    };

    return (
        <View style={styles.container}>
            <SwipeableItem
                key={index}
                item={set}
                ref={(ref) => {
                    if (ref && !itemRefs.current.get(index)) {
                        itemRefs.current.set(index, ref);
                    }
                }}
                onChange={({ openDirection }) => {
                    if (openDirection !== OpenDirection.NONE) {
                        [...itemRefs.current.entries()].forEach(([key, ref]) => {
                            if (key !== index && ref) ref.close();
                        });
                    }
                }}
                overSwipe={40}
                renderUnderlayLeft={renderUnderlayLeft}
                snapPointsLeft={[scaledSize(60)]}
                onSwipeableLeftOpen={() => handleDelete(index)}
            >
                <View style={[styles.stat_row]} key={index}>
                    <Pressable
                        onPress={openTypePanel}
                        style={[styles.set_ctnr, set?.type && [styles.set_ctnr_typed, typePillBg(set?.type)]]}
                    >
                        <Text style={[styles.set_number_text, set?.type && [styles.set_letter_text, typePillText(set?.type)]]}>
                            {set?.type ? typeLetter(set?.type) : (index + 1)}
                        </Text>
                    </Pressable>
                    <View style={styles.previous_ctnr}>
                        <Text style={[styles.previous_stat_text]}>{'N/A'}</Text>
                        {/* <Text style={[styles.previous_stat_text]}>{set.previous ? set.previous : 'N/A'}</Text> */}
                    </View>
                    <View style={styles.weight_unit_ctnr}>
                        <TemplateEditableStat
                            value={weight.toString()}
                            setValue={(value) => updateSet(index, { ...set, weight: value })}
                        />
                    </View>
                    <View style={styles.reps_ctnr}>
                        <TemplateEditableStat
                            value={reps.toString()}
                            setValue={(value) => updateSet(index, { ...set, reps: value })}
                        />
                    </View>
                    <View style={styles.done_ctnr}>
                        <Pressable disabled style={styles.checkmark_ctnr}>
                            <FontAwesome5 name="check" size={scaledSize(14)} style={styles.checkmark} color={theme.textSecondary} />
                        </Pressable>
                    </View>
                </View>
            </SwipeableItem>
            <SetTypePanel
                visible={isTypePanelVisible}
                onClose={() => setIsTypePanelVisible(false)}
                position={panelPosition}
                current={set?.type || null}
                onSelect={handleSelectType}
            />
        </View>
    );
}

const UnderlayLeft = ({ handleDelete }) => {
    const { percentOpen } = useSwipeableItemParams();
    const animStyle = useAnimatedStyle(
        () => ({
            backgroundColor: `rgba(255, 0, 0, ${percentOpen.value / 1.5})`,
            width: `${percentOpen.value * 16}%`,
        }),
        [percentOpen]
    );

    return (
        <Animated.View style={[styles.underlayLeft, animStyle]}>
            <Pressable onPressOut={handleDelete} style={styles.trashButton}>
                <FontAwesome5 name="trash" size={scaledSize(19)} color="#fff" />
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    stat_row: { flexDirection: 'row', paddingVertical: scaleSize(scaledSize(9)), alignItems: 'center', position: 'relative', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.16)' },
    set_ctnr: { marginLeft: '5%', width: '8%', height: scaleSize(scaledSize(24)), borderRadius: scaleSize(scaledSize(8)), backgroundColor: theme.field, borderWidth: scaleSize(1), borderColor: 'rgba(255,255,255,0.30)', alignItems: 'center', justifyContent: 'center' },
    set_ctnr_typed: { backgroundColor: theme.field },
    set_letter_text: { fontFamily: 'Outfit_700Bold', fontSize: scaleSize(14.8) },
    previous_ctnr: {
        width: '38%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    weight_unit_ctnr: {
        width: '18%',
        alignItems: 'center',
    },
    reps_ctnr: {
        width: '18%',
        alignItems: 'center',
    },
    set_number_text: { fontFamily: 'Poppins_700Bold', fontSize: scaleSize(14), color: theme.textPrimary },
    previous_stat_text: { fontFamily: 'Poppins_700Bold', fontSize: scaleSize(15), color: theme.textSecondary },
    done_ctnr: {
        width: '10.5%',
        height: scaleSize(scaledSize(22)),
        alignItems: 'center',
    },
    checkmark_ctnr: { paddingHorizontal: scaleSize(scaledSize(10)), height: '100%', borderRadius: scaleSize(scaledSize(7)), backgroundColor: theme.field, justifyContent: 'center', opacity: 0.5 },
    underlayLeft: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginVertical: scaleSize(scaledSize(2)),
        paddingRight: scaleSize(scaledSize(20)),
    },
    trashButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
