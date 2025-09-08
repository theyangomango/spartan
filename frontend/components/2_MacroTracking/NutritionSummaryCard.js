import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import MacroBar from './MacroBar';

export default function NutritionSummaryCard({ totals, goals, COLORS }) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
    const progress = Math.min(100, (Math.max(0, totals.calories) / Math.max(1, goals.calories)) * 100);
    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <View style={styles.progressContainer}>
                    <AnimatedCircularProgress
                        size={132}
                        width={11}
                        fill={progress}
                        tintColor={COLORS.ringTint}
                        backgroundColor={COLORS.ringBg}
                        lineCap="round"
                        arcSweepAngle={360}
                        rotation={0}
                        duration={0}
                    >
                        {() => (
                            <View style={styles.center}>
                                <Text style={styles.value}>{Math.max(0, totals.calories).toLocaleString()}</Text>
                                <Text style={styles.subtitle}>/{goals.calories.toLocaleString()} kcal</Text>
                            </View>
                        )}
                    </AnimatedCircularProgress>
                </View>

                <View style={styles.macroSummary}>
                    <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color={COLORS.protein} textPrimary={COLORS.text} textSecondary={COLORS.subtext} />
                    <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} color={COLORS.carbs} textPrimary={COLORS.text} textSecondary={COLORS.subtext} />
                    <MacroBar label="Fat" value={totals.fat} goal={goals.fat} color={COLORS.fat} textPrimary={COLORS.text} textSecondary={COLORS.subtext} />
                </View>
            </View>
        </View>
    );
}

const makeStyles = (COLORS) =>
    StyleSheet.create({
        // Full-width row style to match meals
        card: {
            backgroundColor: COLORS.card,
            borderRadius: 0,
            paddingTop: 18,
            paddingBottom: 10,
            paddingLeft: 26,
            paddingRight: 26,
            marginHorizontal: 0,
            marginBottom: 8,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: COLORS.hairline,
            shadowOpacity: 0,
            elevation: 0,
        },
        row: { flexDirection: 'row', gap: 18 },
        progressContainer: { paddingRight: 6 },
        center: { alignItems: 'center', justifyContent: 'center', marginTop: 2 },
        value: { fontSize: 23, color: COLORS.text, fontFamily: 'Nunito_800ExtraBold', marginBottom: -1.5 },
        subtitle: { fontSize: 12, color: COLORS.subtext, fontFamily: 'Nunito_700Bold', marginBottom: 4 },
        macroSummary: { flex: 1, paddingTop: 2 },
    });
