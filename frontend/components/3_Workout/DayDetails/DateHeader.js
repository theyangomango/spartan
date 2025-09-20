// components/3_Workout/DayDetails/DateHeader.js
import React from 'react';
import { View, StyleSheet, Pressable, Animated, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';

export default function DateHeader({
  title,
  onPrev,
  onNext,
  onPressTitle,
  titleScale,
  onLayout,
}) {
  return (
    <View style={styles.headerContainer} onLayout={onLayout}>
      <View style={styles.dateHeaderRow}>
        <Pressable onPress={onPrev} hitSlop={8} style={styles.dateNavBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </Pressable>
        <Pressable onPress={onPressTitle} hitSlop={8} style={styles.titlePress}>
          <Animated.Text style={[styles.title, titleScale ? { transform: [{ scale: titleScale }] } : null]}>
            {title}
          </Animated.Text>
        </Pressable>
        <Pressable onPress={onNext} hitSlop={8} style={styles.dateNavBtn}>
          <Ionicons name="chevron-forward" size={22} color={theme.textPrimary} />
        </Pressable>
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
  dateHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titlePress: { flex: 1 },
  title: { flex: 1, fontFamily: 'Nunito_800ExtraBold', fontSize: scaleSize(16), color: theme.textPrimary, textAlign: 'center', marginTop: scaleSize(2) },
  dateNavBtn: { width: scaleSize(36), height: scaleSize(36), alignItems: 'center', justifyContent: 'center' },
});

