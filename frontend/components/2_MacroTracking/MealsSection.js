import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MealCard from './MealCard';
import UnderMealList from '../UnderMealList';
import { summarizeFood } from '../../utils/nutrition';
import { useNavigation } from '@react-navigation/native';

import scaleSize from "../../helper/scaleSize";
import { strong as haptic } from '../../utils/haptics';
import MacroStreakBadge from './MacroStreakBadge';

function MealsSection({
    title = 'Daily meals',
    mealsMeta,
    meals,
    onAddPress,
    onDelete,
    COLORS,
    PlusIcon,
    dayKey,
    caloriesBurned = 0,
    calorieOffsetEnabled = false,
    onToggleCalorieOffset,
}) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
    const navigation = useNavigation();
    return (
        <View>
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <MacroStreakBadge
                    caloriesBurned={caloriesBurned}
                    COLORS={COLORS}
                    offsetEnabled={calorieOffsetEnabled}
                    onToggleOffset={onToggleCalorieOffset}
                />
            </View>
            {mealsMeta.map((m) => {
                const list = meals[m.name] ?? [];
                const mealCalories = Math.round(list.reduce((s, e) => s + (e?.macros?.calories || 0), 0));
                return (
                    <View key={m.name} style={styles.mealGroup}>
                        <MealCard
                            item={m}
                            COLORS={COLORS}
                            totalCalories={mealCalories}
                        />
                        <UnderMealList
                            items={list}
                            COLORS={COLORS}
                            listStyle={styles.underMealList}
                            cardStyle={styles.underMealCard}
                            showCaloriesRight
                            onItemPress={(entry) => navigation.navigate('FoodDetail', { entry, mealName: m.name, dayKey })}
                            renderSummary={(entry) => summarizeFood(entry.desc, entry.brand, (entry.quantity ?? entry.qty ?? 1))}
                            onDelete={(entry) => onDelete(m.name, entry)}
                        />
                        <TouchableOpacity
                            activeOpacity={0.7}
                            style={styles.addFoodRow}
                            onPress={() => { try { haptic(); } catch {} onAddPress?.(m); }}
                        >
                            {PlusIcon ? (
                                <PlusIcon
                                    size={18}
                                    strokeWidth={2.4}
                                    color={COLORS.ringTint || COLORS.accent || '#2D9EFF'}
                                />
                            ) : null}
                            <Text style={styles.addFoodText}>Add Food</Text>
                        </TouchableOpacity>
                    </View>
                );
            })}
        </View>
    );
}

const propsEqual = (prev, next) => {
    return (
        prev.meals === next.meals &&
        prev.mealsMeta === next.mealsMeta &&
        prev.COLORS === next.COLORS &&
        prev.title === next.title &&
        prev.dayKey === next.dayKey &&
        prev.caloriesBurned === next.caloriesBurned &&
        prev.calorieOffsetEnabled === next.calorieOffsetEnabled
    );
};

export default memo(MealsSection, propsEqual);

const makeStyles = (COLORS) =>
    StyleSheet.create({
        sectionHeaderRow: {
            marginTop: scaleSize(24),
            paddingHorizontal: scaleSize(18),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        sectionTitle: { fontSize: scaleSize(16), color: COLORS.text, fontFamily: 'Nunito_800ExtraBold' },
        // Each meal is one inset rounded card; its rows handle their own padding.
        mealGroup: {
            marginHorizontal: scaleSize(14),
            marginTop: scaleSize(12),
            borderRadius: scaleSize(20),
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.07)',
            backgroundColor: COLORS.card,
            overflow: 'hidden',
        },
        underMealList: { paddingHorizontal: 0, marginTop: 0, marginBottom: 0 },
        underMealCard: {
            borderWidth: 0,
            borderRadius: 0,
            paddingVertical: scaleSize(10),
            paddingHorizontal: scaleSize(18),
            marginVertical: 0,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: COLORS.hairline,
            shadowOpacity: 0,
            elevation: 0,
            backgroundColor: COLORS.card,
        },
        addFoodRow: {
            paddingVertical: scaleSize(13),
            paddingHorizontal: scaleSize(18),
            backgroundColor: COLORS.card,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: COLORS.hairline,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
        },
        addFoodText: {
            color: 'rgba(102, 176, 255, 1)',
            fontFamily: 'Outfit_700Bold',
            fontSize: scaleSize(12.5),
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            textAlign: 'right',
            marginLeft: scaleSize(8),
        },
    });
