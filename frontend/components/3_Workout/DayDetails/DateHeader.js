// components/3_Workout/DayDetails/DateHeader.js
import React from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';
import { strong as haptic } from '../../../utils/haptics';

export default function DateHeader({
  title,
  onPrev,
  onNext,
  onPressTitle,
  titleScale,
  onLayout,
  onOpenCalendar,
}) {
  return (
    <View style={styles.headerContainer} onLayout={onLayout}>
      <View style={styles.dateHeaderRow}>
        <View style={styles.leadingGroup}>
          <Pressable onPress={() => { try { haptic(); } catch {} onPrev?.(); }} hitSlop={8} style={styles.dateNavBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
          </Pressable>
        </View>
        <Pressable onPress={() => { try { haptic(); } catch {} onPressTitle?.(); }} hitSlop={8} style={styles.titlePress}>
          <Animated.Text style={[styles.title, titleScale ? { transform: [{ scale: titleScale }] } : null]}>
            {title}
          </Animated.Text>
        </Pressable>
        <View style={styles.trailingGroup}>
          <Pressable
            onPress={() => { try { haptic(); } catch {} onOpenCalendar?.(); }}
            hitSlop={8}
            style={[styles.dateNavBtn, styles.calendarBtn]}
            accessibilityRole="button"
            accessibilityLabel="Open calendar"
          >
            <Ionicons name="calendar-outline" size={20} color={theme.textPrimary} />
          </Pressable>
          <Pressable onPress={() => { try { haptic(); } catch {} onNext?.(); }} hitSlop={8} style={styles.dateNavBtn}>
            <Ionicons name="chevron-forward" size={22} color={theme.textPrimary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: scaleSize(16),
    paddingBottom: scaleSize(6),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.hairline,
  },
  dateHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', },
  leadingGroup: { width: scaleSize(74), alignItems: 'flex-start', justifyContent: 'center' },
  titlePress: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: scaleSize(36) },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: scaleSize(16), color: theme.textPrimary, textAlign: 'center' },
  dateNavBtn: { width: scaleSize(36), height: scaleSize(36), alignItems: 'center', justifyContent: 'center' },
  trailingGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', width: scaleSize(74) },
  calendarBtn: { marginRight: scaleSize(4) },
});
