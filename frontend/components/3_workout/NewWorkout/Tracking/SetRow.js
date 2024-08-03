import React, { useState, useRef } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import EditableStat from "./EditableStat";
import { FontAwesome5 } from '@expo/vector-icons';
import SwipeableItem, { OpenDirection, useSwipeableItemParams } from 'react-native-swipeable-item';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function SetRow({ set, updateSet, index, handleDelete }) {
    const [isDone, setIsDone] = useState(false);
    const [weight, setWeight] = useState(set.weight);
    const [reps, setReps] = useState(set.reps);
    const itemRefs = useRef(new Map());

    function toggleDone() {
        if (!isDone) {
            updateSet(index, { previous: '405 lb x 12', weight: weight, reps: reps });
        }
        setIsDone(!isDone);
    }

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
                    console.log(openDirection);
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
                <View style={[styles.stat_row, isDone && styles.done]} key={index}>
                    <View style={[styles.set_ctnr, isDone && { backgroundColor: '#DCFFDA' }]}>
                        <Text style={styles.set_number_text}>{index + 1}</Text>
                    </View>
                    <View style={styles.previous_ctnr}>
                        <Text style={[styles.previous_stat_text, isDone && { color: '#afafaf' }]}>{set.previous}</Text>
                    </View>
                    <View style={styles.weight_unit_ctnr}>
                        <EditableStat isFinished={isDone} value={weight} setValue={(value) => setWeight(parseInt(value))} />
                    </View>
                    <View style={styles.reps_ctnr}>
                        <EditableStat isFinished={isDone} value={reps} setValue={(value) => setReps(parseInt(value))} />
                    </View>
                    <View style={styles.done_ctnr}>
                        <Pressable style={isDone ? styles.checkmark_ctnr_selected : styles.checkmark_ctnr} onPress={toggleDone}>
                            <FontAwesome5 name="check" size={14} style={styles.checkmark} color={isDone ? '#fff' : '#444'} />
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
        justifyContent: 'center'
    },
    checkmark_ctnr_selected: {
        paddingHorizontal: 8,
        height: '100%',
        borderRadius: 7,
        justifyContent: 'center',
        backgroundColor: '#58DD6F',
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
        // marginRight: 15,
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
