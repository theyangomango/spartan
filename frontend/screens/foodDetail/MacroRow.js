// Calorie ring with the carbs / fat / protein stats of a food.
import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import styles, { COLORS } from './foodDetailStyles';

export default function MacroRow({ m }) {
    const calories = Math.max(0, Math.round(m?.calories || 0));
    const p = Math.max(0, Number(m?.protein || 0));
    const c = Math.max(0, Number(m?.carbs || 0));
    const f = Math.max(0, Number(m?.fat || 0));

    // Truncate macro grams for ring rendering only
    const pInt = Math.floor(p);
    const cInt = Math.floor(c);
    const fInt = Math.floor(f);

    const pCal = pInt * 4;
    const cCal = cInt * 4;
    const fCal = fInt * 9;
    const totalFromMacros = pCal + cCal + fCal;

    // Always fill the ring using macro proportions only, but only when > 0.
    // Zero-gram groups do not render; if total is zero, show empty track.
    const ringDenom = totalFromMacros > 0 ? totalFromMacros : 1; // avoid divide-by-zero
    const fracP = totalFromMacros > 0 ? (pCal / ringDenom) : 0;
    const fracC = totalFromMacros > 0 ? (cCal / ringDenom) : 0;
    const fracF = totalFromMacros > 0 ? (fCal / ringDenom) : 0;

    const size = 120; // fixed ring size per design
    const stroke = Math.max(10, Math.round(size * 0.12));
    const r = Math.max(1, (size - stroke) / 2);
    const cx = size / 2;
    const cy = size / 2;
    const circ = 2 * Math.PI * r;

    // Segment lengths. We'll compute from fractions then push rounding
    // remainder into the last non-zero segment so the ring fully covers.
    let dashP = pInt > 0 ? Math.max(0, fracP * circ) : 0;
    let dashC = cInt > 0 ? Math.max(0, fracC * circ) : 0;
    let dashF = fInt > 0 ? Math.max(0, fracF * circ) : 0;

    if (totalFromMacros > 0) {
        const current = dashP + dashC + dashF;
        const remainder = Math.max(0, circ - current);
        if (fInt > 0) dashF += remainder; // prefer last in order
        else if (cInt > 0) dashC += remainder;
        else if (pInt > 0) dashP += remainder;
    } else {
        dashP = 0; dashC = 0; dashF = 0; // empty ring when all zero
    }

    // Start ring at 12 o'clock by rotating -90deg
    const baseOffset = 0;
    const offP = baseOffset;
    const offC = baseOffset - dashP;
    const offF = baseOffset - (dashP + dashC);

    return (
        <View style={styles.macroFourRow}>
            {/* Calories ring (no card) */}
            <View style={styles.ringBoxFour}>
                <View style={{ width: size, height: size }}>
                    <Svg width={size} height={size}>
                        {/* Track */}
                        <Circle
                            cx={cx}
                            cy={cy}
                            r={r}
                            stroke={COLORS.hairline}
                            strokeOpacity={0.28}
                            strokeWidth={stroke}
                            fill="none"
                        />

                        {/* Carbs */}
                        {cInt > 0 && dashC > 0 && (
                            <Circle
                                cx={cx}
                                cy={cy}
                                r={r}
                                stroke={COLORS.carbs}
                                strokeWidth={stroke}
                                fill="none"
                                strokeDasharray={`${dashC}, ${circ}`}
                                strokeDashoffset={offC}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${cx} ${cy})`}
                            />
                        )}
                        {/* Fat */}
                        {fInt > 0 && dashF > 0 && (
                            <Circle
                                cx={cx}
                                cy={cy}
                                r={r}
                                stroke={COLORS.fat}
                                strokeWidth={stroke}
                                fill="none"
                                strokeDasharray={`${dashF}, ${circ}`}
                                strokeDashoffset={offF}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${cx} ${cy})`}
                            />
                        )}
                        {/* Protein */}
                        {pInt > 0 && dashP > 0 && (
                            <Circle
                                cx={cx}
                                cy={cy}
                                r={r}
                                stroke={COLORS.protein}
                                strokeWidth={stroke}
                                fill="none"
                                strokeDasharray={`${dashP}, ${circ}`}
                                strokeDashoffset={offP}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${cx} ${cy})`}
                            />
                        )}
                    </Svg>
                    <View style={styles.centerLabel} pointerEvents="none">
                        <Text style={styles.centerCal}>{Math.round(calories || 0)}</Text>
                        <Text style={styles.centerSub}>cal</Text>
                    </View>
                </View>
            </View>
            <MacroStat width={68} color={COLORS.carbs} label="Carbs" grams={c} />
            <MacroStat width={60} color={COLORS.fat} label="Fat" grams={f} />
            <MacroStat width={70} color={COLORS.protein} label="Protein" grams={p} />
        </View>
    );
}

function MacroStat({ color, label, grams, width }) {
    return (
        <View style={[styles.macroStat, { width }]}>
            <View style={[styles.macroStatDot, { backgroundColor: color }]} />
            <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.macroStatLabel}>{label}</Text>
                <Text numberOfLines={1} style={styles.macroStatValue}>
                    {Math.round(grams || 0)} <Text style={styles.badgeSuffix}>g</Text>
                </Text>
            </View>
        </View>
    );
}
