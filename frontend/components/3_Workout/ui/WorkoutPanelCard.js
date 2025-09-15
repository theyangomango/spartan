import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import theme from '../../../theme/mfpDark';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Clock } from 'iconsax-react-native';

const mins = (ms) => Math.max(0, Math.round(Number(ms || 0) / 60000));
const minutesLabel = (ms) => `${mins(ms)} min`;
const toNumber = (n) => (Number(n || 0) || 0);

const WorkoutPanelCard = ({
  title = 'Workout',
  subtitle = '',
  titleStyle,
  pbs = 0,
  durationMs = 0,
  volume = 0,
  reps = 0,
  onPress,
  showChevron = true,
  style,
}) => {
  const Container = onPress ? Pressable : View;

  return (
    <Container style={[styles.panel, style]} onPress={onPress}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, titleStyle]} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.sub}>{subtitle}</Text>}
        </View>
        <View style={styles.rightAccessories}>
          {Number(pbs) > 0 && (
            <View style={styles.prPill}>
              <MaterialCommunityIcons name="trophy" size={12} color="#FACC15" />
              <Text style={styles.prText}>{pbs} PR{Number(pbs) === 1 ? '' : 's'}</Text>
            </View>
          )}
          {showChevron && <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSecondary} />}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { flex: 1.05 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.statIconWrap, { marginBottom: 0, marginRight: 8 }]}>
              <Clock color={theme.textSecondary} size={15} variant="Bold" />
            </View>
            <View style={styles.statTextCol}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue} numberOfLines={1}>{minutesLabel(durationMs)}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.statCard, { flex: 1.2 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.statIconWrap, { marginBottom: 0, marginRight: 8 }]}>
              <MaterialCommunityIcons name="weight-lifter" size={15} color={theme.textSecondary} />
            </View>
            <View style={styles.statTextCol}>
              <Text style={styles.statLabel}>Volume</Text>
              <Text style={styles.statValue} numberOfLines={1}>{toNumber(volume).toLocaleString()} lb</Text>
            </View>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.statIconWrap, { marginBottom: 0, marginRight: 8 }]}>
              <MaterialCommunityIcons name="arm-flex" size={15} color={theme.textSecondary} />
            </View>
            <View style={styles.statTextCol}>
              <Text style={styles.statLabel}>Reps</Text>
              <Text style={styles.statValue} numberOfLines={1}>{toNumber(reps)}</Text>
            </View>
          </View>
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.hairline,
    marginVertical: 5
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  rightAccessories: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: require('../../../helper/scaleSize').ts(13), fontFamily: 'Outfit_800ExtraBold', color: theme.textPrimary },
  sub: { marginTop: 2, fontSize: require('../../../helper/scaleSize').ts(12.5), fontFamily: 'Outfit_600SemiBold', color: theme.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.hairline, marginVertical: 6 },

  statsRow: { flexDirection: 'row', gap: 6 },
  statCard: { flex: 1, paddingVertical: 6 },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff23',
    marginBottom: 6,
  },
  statLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: require('../../../helper/scaleSize').ts(11), color: theme.textSecondary },
  statValue: { marginTop: 1, fontFamily: 'Outfit_800ExtraBold', fontSize: require('../../../helper/scaleSize').ts(13), color: theme.textPrimary },
  statTextCol: { flex: 1, minWidth: 0 },

  prPill: {
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
  prText: { fontFamily: 'Outfit_800ExtraBold', fontSize: require('../../../helper/scaleSize').ts(12), color: '#FACC15' },
});

export default memo(WorkoutPanelCard);
