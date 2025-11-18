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
    collapsed,
    toggleMeal,
    onAddPress,
    onDelete,
    COLORS,
    PlusIcon,
    dayKey,
    compact = false,
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
                    dayKey={dayKey}
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
                    <React.Fragment key={m.name}>
                        <MealCard
                            item={m}
                            PlusIcon={PlusIcon}
                            COLORS={COLORS}
                            onAddPress={onAddPress}
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
                            compact={compact}
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
                    </React.Fragment>
                );
            })}
        </View>
    );
}

const propsEqual = (prev, next) => {
    return (
        prev.meals === next.meals &&
        prev.collapsed === next.collapsed &&
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
        // Full-width list like MyFitnessPal: no outer horizontal padding,
        // each row handles its own left/right padding.
        underMealList: { paddingHorizontal: 0, marginTop: 0, marginBottom: 0 },
        underMealCard: {
            borderWidth: 0,
            borderRadius: 0,
            paddingVertical: scaleSize(10),
            paddingHorizontal: scaleSize(26),
            marginVertical: 0,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: COLORS.hairline,
            shadowOpacity: 0,
            elevation: 0,
            backgroundColor: COLORS.card,
        },
        addFoodRow: {
            paddingVertical: scaleSize(13),
            paddingHorizontal: scaleSize(26),
            backgroundColor: COLORS.card,
            borderBottomWidth: StyleSheet.hairlineWidth,
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
