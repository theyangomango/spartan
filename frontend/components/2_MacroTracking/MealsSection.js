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
            {mealsMeta.map((m) => (
                <React.Fragment key={m.name}>
                    <MealCard
                        item={m}
                        PlusIcon={PlusIcon}
                        COLORS={COLORS}
                        onAddPress={onAddPress}
                        onToggle={() => toggleMeal(m.name)}
                        collapsed={collapsed[m.name]}
                    />
                    {!collapsed[m.name] && (
                        <UnderMealList
                            items={meals[m.name] ?? []}
                            COLORS={COLORS}
                            listStyle={styles.underMealList}
                            cardStyle={styles.underMealCard}
                            renderSummary={(entry) => summarizeFood(entry.desc, entry.brand, entry.quantity ?? 1)}
                            onDelete={(entry) => onDelete(m.name, entry)}
                        />
                    )}
                </React.Fragment>
            ))}
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
        sectionTitle: { fontSize: 17, marginLeft: 18, color: COLORS.text, fontFamily: 'Nunito_800ExtraBold' },
        underMealList: { paddingHorizontal: 18, marginTop: 0, marginBottom: 8 },
        underMealCard: {
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 22,
            marginVertical: 4,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: COLORS.hairline,
            shadowOpacity: 0.03,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
            backgroundColor: COLORS.card,
        },
    });
