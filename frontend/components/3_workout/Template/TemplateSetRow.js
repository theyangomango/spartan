import React, { useRef } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import SwipeableItem, { OpenDirection, useSwipeableItemParams } from 'react-native-swipeable-item';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import TemplateEditableStat from './TemplateEditableStat';

export default function TemplateSetRow({ set, updateSet, index, handleDelete }) {
    const weight = set.weight;
    const reps = set.reps;

    const itemRefs = useRef(new Map());

    const renderUnderlayLeft = () => (
        <UnderlayLeft handleDelete={handleDelete} />
    );

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
                snapPointsLeft={[60]}
                onSwipeableLeftOpen={() => handleDelete(index)}
            >
                <View style={[styles.stat_row]} key={index}>
                    <View style={[styles.set_ctnr]}>
                        <Text style={styles.set_number_text}>{index + 1}</Text>
                    </View>
                    <View style={styles.previous_ctnr}>
                        <Text style={[styles.previous_stat_text]}>{set.previous ? set.previous : 'N/A'}</Text>
                    </View>
                    <View style={styles.weight_unit_ctnr}>
                        <TemplateEditableStat
                            value={weight.toString()}
                            setValue={(value) => updateSet(index, { ...set, weight: parseInt(value, 10) })}
                        />
                    </View>
                    <View style={styles.reps_ctnr}>
                        <TemplateEditableStat
                            value={reps.toString()}
                            setValue={(value) => updateSet(index, { ...set, reps: parseInt(value, 10) })}
                        />
                    </View>
                    <View style={styles.done_ctnr}>
                        <Pressable disabled style={styles.checkmark_ctnr}>
                            <FontAwesome5 name="check" size={14} style={styles.checkmark} color={'#444'} />
                        </Pressable>
                    </View>
                </View>
            </SwipeableItem>
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
                <FontAwesome5 name="trash" size={19} color="#fff" />
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    stat_row: {
        flexDirection: 'row',
        paddingVertical: 8,
        alignItems: 'center',
        position: 'relative',
    },
    done: {
        backgroundColor: '#DCFFDA'
    },
    set_ctnr: {
        marginLeft: '5%',
        width: '8%',
        height: 21,
        borderRadius: 6,
        backgroundColor: '#eaeaea',
        alignItems: 'center',
        justifyContent: 'center',
    },
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
    set_number_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
    },
    previous_stat_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 15,
        color: '#ccc'
    },
    done_ctnr: {
        width: '10.5%',
        height: 22,
        alignItems: 'center',
    },
    checkmark_ctnr: {
        paddingHorizontal: 10,
        height: '100%',
        borderRadius: 7,
        backgroundColor: '#eee',
        justifyContent: 'center',
        opacity: 0.5
    },
    underlayLeft: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginVertical: 2,
        paddingRight: 20,
    },
    trashButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    text: {
        fontWeight: "bold",
        color: "white",
        fontSize: 32,
    },
});
