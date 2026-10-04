// "Nutrition Facts" list of micronutrients with % daily value.
import React from 'react';
import { View, Text } from 'react-native';

import styles from './foodDetailStyles';

export default function NutritionFacts({ extras }) {
    // Daily Values (FDA 2016 update)
    const DV = {
        added_sugars: 50,
        fiber_g: 28,
        sodium_mg: 2300,
        satFat_g: 20,
        cholesterol_mg: 300,
        potassium_mg: 4700,
        vitamin_d: 20,
    };

    const rows = [
        { key: 'sugar_g', label: 'Sugars', unit: 'g', value: extras?.sugar_g, dv: null },
        { key: 'added_sugars', label: 'Added Sugars', unit: 'g', value: extras?.added_sugars, dv: DV.added_sugars },
        { key: 'fiber_g', label: 'Dietary Fiber', unit: 'g', value: extras?.fiber_g, dv: DV.fiber_g },
        { key: 'sodium_mg', label: 'Sodium', unit: 'mg', value: extras?.sodium_mg, dv: DV.sodium_mg },
        { key: 'potassium_mg', label: 'Potassium', unit: 'mg', value: extras?.potassium_mg, dv: DV.potassium_mg },
        { key: 'satFat_g', label: 'Saturated Fat', unit: 'g', value: extras?.satFat_g, dv: DV.satFat_g },
        { key: 'transFat_g', label: 'Trans Fat', unit: 'g', value: extras?.transFat_g, dv: null },
        { key: 'monoFat_g', label: 'Monounsaturated Fat', unit: 'g', value: extras?.monoFat_g, dv: null },
        { key: 'polyFat_g', label: 'Polyunsaturated Fat', unit: 'g', value: extras?.polyFat_g, dv: null },
        { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg', value: extras?.cholesterol_mg, dv: DV.cholesterol_mg },
        { key: 'vitamin_d', label: 'Vitamin D', unit: 'mcg', value: extras?.vitamin_d, dv: DV.vitamin_d },
        { key: 'calcium', label: 'Calcium', unit: '%', value: extras?.calcium, dv: null },
        { key: 'iron', label: 'Iron', unit: '%', value: extras?.iron, dv: null },
        { key: 'vitamin_a', label: 'Vitamin A', unit: '%', value: extras?.vitamin_a, dv: null },
        { key: 'vitamin_c', label: 'Vitamin C', unit: '%', value: extras?.vitamin_c, dv: null },
    ];

    const anyProvided = rows.some((r) => Number.isFinite(r.value));

    return (
        <View>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Nutrition Facts</Text>
            </View>
            <View style={styles.hairline} />
            <View style={styles.factsWrap}>
                {anyProvided ? (
                    rows.map((r) => {
                        if (!Number.isFinite(r.value)) return null;
                        const val = r.unit === 'mg' ? Math.round(r.value) : Math.round(r.value * 10) / 10;
                        let pct = null;
                        if (r.dv && r.dv > 0) pct = Math.round((val / r.dv) * 100);
                        return (
                            <View key={r.key} style={styles.factRow}>
                                <Text style={styles.factLabel}>{r.label}</Text>
                                <View style={styles.factRight}>
                                    <Text style={styles.factValue}>{val}<Text style={styles.factUnit}> {r.unit}</Text></Text>
                                    {pct != null && (
                                        <Text style={pct >= 80 ? styles.factPercentHigh : styles.factPercentSub}>{`${pct}% DV`}</Text>
                                    )}
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <Text style={styles.factsEmpty}>Loading micronutrient info...</Text>
                )}
            </View>
        </View>
    );
}
