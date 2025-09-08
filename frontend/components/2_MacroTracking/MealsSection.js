import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MealCard from './MealCard';
import UnderMealList from '../UnderMealList';
import { summarizeFood } from '../../utils/nutrition';

function MealsSection({ title = 'Daily meals', mealsMeta, meals, collapsed, toggleMeal, onAddPress, onDelete, COLORS, PlusIcon }) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
    return (
        <View>
            <Text style={styles.sectionTitle}>{title}</Text>
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
                            renderSummary={(entry) => summarizeFood(entry.desc, entry.brand, entry.quantity ?? 1)}
                            onDelete={(entry) => onDelete(m.name, entry)}
                        />
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
        prev.title === next.title
    );
};

export default memo(MealsSection, propsEqual);

const makeStyles = (COLORS) =>
    StyleSheet.create({
        sectionTitle: { fontSize: 16, marginLeft: 18, color: COLORS.text, fontFamily: 'Nunito_800ExtraBold' },
        // Full-width list like MyFitnessPal: no outer horizontal padding,
        // each row handles its own left/right padding.
        underMealList: { paddingHorizontal: 0, marginTop: 0, marginBottom: 12 },
        underMealCard: {
            borderWidth: 0,
            borderRadius: 0,
            paddingVertical: 12,
            paddingHorizontal: 26,
            marginVertical: 0,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: COLORS.hairline,
            shadowOpacity: 0,
            elevation: 0,
            backgroundColor: COLORS.card,
        },
    });
