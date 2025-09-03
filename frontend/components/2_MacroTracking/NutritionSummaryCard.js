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
                        size={138}
                        width={12}
                        fill={progress}
                        tintColor={COLORS.ringTint}
                        backgroundColor={COLORS.ringBg}
                        lineCap="round"
                        arcSweepAngle={360}
                        rotation={0}
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
        card: {
            backgroundColor: COLORS.card,
            borderRadius: 24,
            paddingTop: 16,
            paddingBottom: 16,
            paddingLeft: 18,
            paddingRight: 18,
            marginBottom: 18,
            marginHorizontal: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 2,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: COLORS.hairline,
        },
        row: { flexDirection: 'row', gap: 18 },
        progressContainer: { paddingRight: 6 },
        center: { alignItems: 'center', justifyContent: 'center', marginTop: 2 },
        value: { fontSize: 26, color: COLORS.text, fontFamily: 'Outfit_700Bold', marginBottom: -2.5 },
        subtitle: { fontSize: 12.5, color: COLORS.subtext, fontFamily: 'Outfit_500Medium', marginBottom: 4 },
        macroSummary: { flex: 1, paddingTop: 2 },
    });

