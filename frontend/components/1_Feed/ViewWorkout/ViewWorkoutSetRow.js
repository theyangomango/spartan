import React from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // Scaling factor based on iPhone 13 height

const scaledSize = (size) => Math.round(size * scale);

export default function ViewWorkoutSetRow({ previousSet, set, index, isDone }) {
    const weight = set.weight;
    const reps = set.reps;

    return (
        <View style={[styles.stat_row, isDone && styles.done]} key={index}>
            <View style={[styles.set_ctnr, isDone && { backgroundColor: '#DCFFDA' }]}>
                <Text style={styles.set_number_text}>{index + 1}</Text>
            </View>
            <View style={styles.previous_ctnr}>
                <Text style={[styles.previous_stat_text, isDone && { color: '#afafaf' }]}>
                    {previousSet ? `${previousSet.reps} x ${previousSet.weight}lbs` : 'N/A'}
                </Text>
            </View>
            <View style={styles.weight_unit_ctnr}>
                <Text style={styles.stat_text}>{weight}</Text>
            </View>
            <View style={styles.reps_ctnr}>
                <Text style={styles.stat_text}>{reps}</Text>
            </View>
            <View style={styles.done_ctnr}>
                <FontAwesome5 name="check" size={scaledSize(14)} style={styles.checkmark} color="#58DD6F" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    stat_row: {
        flexDirection: 'row',
        paddingVertical: scaledSize(8),
        alignItems: 'center',
    },
    done: {
        backgroundColor: '#DCFFDA',
    },
    set_ctnr: {
        marginLeft: '5%',
        width: '8%',
        height: scaledSize(21),
        borderRadius: scaledSize(6),
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
        fontSize: scaledSize(14),
    },
    previous_stat_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaledSize(15),
        color: '#ccc',
    },
    stat_text: {
        fontFamily: 'Poppins_700Bold',
        fontSize: scaledSize(15),
        color: '#000',
    },
    done_ctnr: {
        width: '10.5%',
        height: scaledSize(22),
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: {
        paddingHorizontal: scaledSize(8),
    },
});
