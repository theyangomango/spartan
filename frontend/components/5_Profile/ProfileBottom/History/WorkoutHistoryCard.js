import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Clock } from 'iconsax-react-native';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844; // iPhone 13 baseline
const ss = (n) => Math.round(n * scale);

const toNumber = (n) => (Number(n || 0) || 0);
const minutesLabel = (ms) => `${Math.max(0, Math.round(Number(ms || 0) / 60000))} min`;

export default function WorkoutHistoryCard({ workout }) {
  const exCount = Array.isArray(workout?.exercises) ? workout.exercises.length : 0;
  const setCount = useMemo(
    () => (Array.isArray(workout?.exercises)
      ? workout.exercises.reduce((acc, e) => acc + (e?.sets?.length || 0), 0)
      : 0),
    [workout?.exercises]
  );
  const pbs = Number(workout?.PBs ?? workout?.pbs ?? 0);
  const title = workout?.templateName || workout?.template?.name || 'Workout';
  const subtitle = `${exCount} exercises • ${setCount} sets`;

  return (
    <View style={styles.faPanel}>
      <View style={styles.faHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.faTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.faSub}>{subtitle}</Text>
        </View>
        <View style={styles.faRightAccessories}>
          {pbs > 0 && (
            <View style={styles.faPrPill}>
              <MaterialCommunityIcons name="trophy" size={12} color="#FACC15" />
              <Text style={styles.faPrText}>{pbs} PR{pbs === 1 ? '' : 's'}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.faDivider} />

      <View style={styles.faStatsRow}>
        <View style={styles.faStatCard}>
          <View style={styles.faStatIconWrap}>
            <Clock color="#E5E7EB" size={15} variant="Bold" />
          </View>
          <Text style={styles.faStatLabel}>Duration</Text>
          <Text style={styles.faStatValue}>{minutesLabel(workout?.duration)}</Text>
        </View>

        <View style={styles.faStatCard}>
          <View style={styles.faStatIconWrap}>
            <MaterialCommunityIcons name="weight-lifter" size={15} color="#E5E7EB" />
          </View>
          <Text style={styles.faStatLabel}>Volume</Text>
          <Text style={styles.faStatValue}>{toNumber(workout?.volume).toLocaleString()} lb</Text>
        </View>

        <View style={styles.faStatCard}>
          <View style={styles.faStatIconWrap}>
            <MaterialCommunityIcons name="arm-flex" size={15} color="#E5E7EB" />
          </View>
          <Text style={styles.faStatLabel}>Reps</Text>
          <Text style={styles.faStatValue}>{toNumber(workout?.reps)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Matching the FriendsActivity-style panel used in DayDetailsSheet
  faPanel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: require('../../../../theme/mfpDark').default.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
    marginHorizontal: 16,
  },
  faHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  faRightAccessories: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  faTitle: { fontSize: 13, fontFamily: 'Outfit_800ExtraBold', color: '#EAEFF6' },
  faSub: { marginTop: 2, fontSize: 12.5, fontFamily: 'Outfit_600SemiBold', color: '#C9D2DE' },
  faDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 6 },
  faStatsRow: { flexDirection: 'row', gap: 8 },
  faStatCard: {
    flex: 1,
    backgroundColor: require('../../../../theme/mfpDark').default.field,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  faStatIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: require('../../../../theme/mfpDark').default.field,
    marginBottom: 6,
  },
  faStatLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 11, color: '#D3DAE6' },
  faStatValue: { marginTop: 1, fontFamily: 'Outfit_800ExtraBold', fontSize: 14.5, color: '#F1F5F9' },
  faPrPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(250, 204, 21, 0.24)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(250, 204, 21, 0.60)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  faPrText: { fontFamily: 'Outfit_800ExtraBold', fontSize: 12, color: '#FACC15' },
});
