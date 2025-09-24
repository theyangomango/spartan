import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles, COLORS, scaledSize } from './UserStatsStyles';
import {
    estimate1RM,
    computeVolume,
    computeTotalReps,
    bestTopSet,
    fmtK,
} from './userStatsUtils';

export default function UserStatsExerciseCard({ name, exercise, isFirst, onPress }) {
    const oneRM = estimate1RM(exercise);
    const volume = computeVolume(exercise);
    const setsCount = Array.isArray(exercise?.sets) ? exercise.sets.length : 0;
    const totalReps = computeTotalReps(exercise);
    const top = bestTopSet(exercise);

    return (
        <Pressable
            style={({ pressed }) => [
                styles.exerciseCard,
                isFirst && styles.exerciseCardFirst,
                { position: 'relative' },
                pressed && styles.exerciseCardPressed,
            ]}
            onPress={onPress}
        >
            <View style={styles.cardRow}>
                <View style={styles.cardContentColumn}>
                    <View style={styles.cardHeaderRow}>
                        <Text numberOfLines={2} style={styles.exerciseName}>{name}</Text>
                        {!!oneRM && oneRM > 0 && (
                            <View style={styles.oneRMRow}>
                                <Text style={styles.oneRMLabel}>1RM (Adj)</Text>
                                <Text style={styles.oneRMValue}>{oneRM}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaCell}>
                            <Text style={styles.metaLabel}>Sets</Text>
                            <Text style={styles.metaValue} numberOfLines={1}>{setsCount}</Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaCell}>
                            <Text style={styles.metaLabel}>Reps</Text>
                            <Text style={styles.metaValue} numberOfLines={1}>{fmtK(totalReps)}</Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaCell}>
                            <Text style={styles.metaLabel}>Volume</Text>
                            <Text style={styles.metaValue} numberOfLines={1}>{fmtK(volume)}</Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.metaCell}>
                            <Text style={styles.metaLabel}>Top Set</Text>
                            <Text style={styles.metaValue} numberOfLines={1}>{top ? `${top.weight} x ${top.reps}` : '-'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cardChevronColumn}>
                    <MaterialCommunityIcons name="chevron-right" size={scaledSize(22)} color={COLORS.subtext} />
                </View>
            </View>
        </Pressable>
    );
}
