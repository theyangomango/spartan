// History tab of the ExerciseDetail screen: the most recent sessions with their set tables.
import React from 'react';
import { Text, View } from 'react-native';

import styles from './ExerciseDetail.styles';

const ExerciseHistoryTab = ({ historySessions, displayTitle, weightColumnLabel }) => {
    if (!historySessions.length) {
        return (
            <View style={styles.placeholder}>
                <Text style={styles.placeholderTitle}>No history yet</Text>
                <Text style={styles.placeholderBody}>
                    Log {displayTitle} in your workouts to populate recent sessions and personal records.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.historySection}>
            {historySessions.map((session) => (
                <View key={session.key} style={styles.historyCard}>
                    <View style={styles.historyHeaderRow}>
                        <View style={styles.historyHeaderTextBlock}>
                            <Text style={styles.historyTitle}>{session.title}</Text>
                            {session.meta ? (
                                <Text style={styles.historySubtitle}>{session.meta}</Text>
                            ) : null}
                        </View>
                    </View>

                    <View style={styles.historyTableHeader}>
                        <View style={styles.historySetColumn}>
                            <Text style={styles.historyTableHeaderText}>Set</Text>
                        </View>
                        <View style={styles.historyWeightColumn}>
                            <Text style={styles.historyTableHeaderText}>{weightColumnLabel}</Text>
                        </View>
                        <View style={styles.historyRepsColumn}>
                            <Text style={styles.historyTableHeaderText}>Reps</Text>
                        </View>
                    </View>

                    {session.sets.map((set, index) => {
                        const isLast = index === session.sets.length - 1;
                        const rowStyle = [styles.historyRow];
                        if (isLast) rowStyle.push(styles.historyRowLast);
                        if (set.highlight) rowStyle.push(styles.historyRowWithBadge);
                        return (
                            <View key={set.key} style={rowStyle}>
                                <View
                                    style={[
                                        styles.historySetColumn,
                                        set.highlight && styles.historyCellWithBadge,
                                    ]}
                                >
                                    <Text style={styles.historySetValue}>{set.index}</Text>
                                </View>
                                <View
                                    style={[
                                        styles.historyWeightColumn,
                                        set.highlight && styles.historyWeightColumnWithBadge,
                                    ]}
                                >
                                    <Text style={styles.historyValueText}>{set.weightLabel}</Text>
                                    {set.highlight ? (
                                        <View style={styles.historyBadge}>
                                            <Text style={styles.historyBadgeText}>{set.highlight}</Text>
                                        </View>
                                    ) : null}
                                </View>
                                <View
                                    style={[
                                        styles.historyRepsColumn,
                                        set.highlight && styles.historyCellWithBadge,
                                    ]}
                                >
                                    <Text style={styles.historyValueText}>{set.repsLabel}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            ))}
        </View>
    );
};

export default ExerciseHistoryTab;
