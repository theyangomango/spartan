import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import MacroBar from './MacroBar';

import scaleSize from "../../helper/scaleSize";

const RING_SIZE = 135;
const RING_STROKE_WIDTH = 11;
const RING_PADDING = 4;

export default function NutritionSummaryCard({ totals, goals, COLORS }) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
    const progress = Math.min(100, (Math.max(0, totals.calories) / Math.max(1, goals.calories)) * 100);
    return (
        <View style={styles.card}>
            <View style={styles.row}>
                <View style={styles.progressContainer}>
                    <AnimatedCircularProgress
                        size={RING_SIZE + RING_PADDING}
                        width={RING_STROKE_WIDTH}
                        padding={RING_PADDING}
                        fill={progress}
                        tintColor={'#2D9EFF'}
                        backgroundColor={'#bbdbff4f'}
                        lineCap="round"
                        arcSweepAngle={360}
                        rotation={0}
                        duration={0}
                    >
                        {() => (
                            <View style={styles.center}>
                                <Text style={styles.value}>{Math.max(0, totals.calories)}</Text>
                                <Text style={styles.subtitle}>/ {goals.calories} kcal</Text>
                            </View>
                        )}
                    </AnimatedCircularProgress>
                </View>

                <View style={styles.macroSummary}>
                    <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color={COLORS.protein} textPrimary={COLORS.text} textSecondary={COLORS.subtext} trackColor={COLORS.ringTrack || COLORS.ringBg} />
                    <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} color={COLORS.carbs} textPrimary={COLORS.text} textSecondary={COLORS.subtext} trackColor={COLORS.ringTrack || COLORS.ringBg} />
                    <MacroBar label="Fat" value={totals.fat} goal={goals.fat} color={COLORS.fat} textPrimary={COLORS.text} textSecondary={COLORS.subtext} trackColor={COLORS.ringTrack || COLORS.ringBg} />
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
            paddingTop: scaleSize(10),
            paddingBottom: scaleSize(10),
            paddingLeft: scaleSize(24),
            paddingRight: scaleSize(26),
            marginBottom: scaleSize(8),
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: COLORS.hairline,
            shadowOpacity: 0,
            elevation: 0,
        },
        row: { flexDirection: 'row', gap: scaleSize(18), alignItems: 'center' },
        // Center the ring vertically alongside the macro bars
        progressContainer: { marginRight: scaleSize(0), justifyContent: 'center', alignItems: 'center' },
        center: { alignItems: 'center', justifyContent: 'center', marginTop: scaleSize(2) },
        value: { fontSize: scaleSize(25), color: COLORS.text, fontFamily: 'Outfit_800ExtraBold', marginBottom: 0 },
        subtitle: { fontSize: scaleSize(12), color: COLORS.subtext, fontFamily: 'Outfit_700Bold', marginBottom: scaleSize(4) },
        macroSummary: { flex: 1, paddingTop: scaleSize(2) },
    });
