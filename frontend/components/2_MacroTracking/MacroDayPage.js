import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import NutritionSummaryCard from './NutritionSummaryCard';
import MealsSection from './MealsSection';
import { toDayKey } from '../../utils/date';
import scaleSize from "../../helper/scaleSize";
import theme from '../../theme/mfpDark'

function MacroDayPage({
  screenWidth,
  COLORS,
  macroGoals,
  meals,
  totals,
  collapsed,
  toggleMeal,
  openGoalsSheet,
  openSearchForMeal,
  deleteFood,
  PlusIcon,
  date,
  isFocused,
  mealsMeta,
  streakCount = 0,
}) {
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <ScrollView
      style={{ width: screenWidth }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: scaleSize(14), paddingBottom: scaleSize(120) }}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
      directionalLockEnabled
      nestedScrollEnabled
    >
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, styles.sectionTitleNoMargin]}>Nutrition</Text>
        <Pressable
          style={styles.editGoalsPill}
          onPress={openGoalsSheet}
          hitSlop={8}
          android_ripple={{ color: 'rgba(255,255,255,0.08)', borderless: false }}
        >
          <Ionicons name="settings-outline" size={15} color={COLORS.text} />
          <Text style={styles.editGoalsText}>Edit Goals</Text>
        </Pressable>
      </View>

      <NutritionSummaryCard totals={totals} goals={macroGoals} COLORS={COLORS} />

      <MealsSection
        mealsMeta={mealsMeta}
        meals={meals}
        collapsed={collapsed}
        toggleMeal={toggleMeal}
        onAddPress={openSearchForMeal}
        onDelete={deleteFood}
        COLORS={COLORS}
        PlusIcon={PlusIcon}
        dayKey={toDayKey(date)}
        streakCount={streakCount}
        // compact={!isFocused}
      />
    </ScrollView>
  );
}

const propsEqual = (prev, next) => (
  prev.screenWidth === next.screenWidth &&
  prev.macroGoals === next.macroGoals &&
  prev.collapsed === next.collapsed &&
  prev.meals === next.meals &&
  prev.totals === next.totals &&
  toDayKey(prev.date) === toDayKey(next.date) &&
  prev.isFocused === next.isFocused &&
  prev.mealsMeta === next.mealsMeta &&
  prev.streakCount === next.streakCount
);

export default React.memo(MacroDayPage, propsEqual);

const makeStyles = (COLORS) => StyleSheet.create({
  sectionHeaderRow: {
    paddingLeft: scaleSize(18),
    paddingRight: scaleSize(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleSize(6),
  },
  sectionTitleNoMargin: { marginLeft: 0 },
  sectionTitle: {
    fontSize: scaleSize(16),
    marginLeft: scaleSize(18),
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
  },
  editGoalsPill: {
    flexDirection: 'row',
    gap: scaleSize(6),
    alignItems: 'center',
    backgroundColor: COLORS.fieldBg,
    paddingHorizontal: scaleSize(12),
    paddingVertical: scaleSize(7),
    borderRadius: scaleSize(999),
    borderWidth: scaleSize(1),
    borderColor: COLORS.hairline,
  },
  editGoalsText: { fontFamily: 'Outfit_700Bold', color: COLORS.text, fontSize: scaleSize(12), letterSpacing: 0.15 },
});
