import React, { memo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';
import FastImage from 'react-native-fast-image';
import { Clock } from 'iconsax-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';
import { strong as haptic } from '../../../utils/haptics';
import { usePfp } from '../../../helper/usePFPs';

const { height: screenHeight } = Dimensions.get('window');
const scale = screenHeight / 844;
const s = (n) => Math.round(n * scale);

const COLORS = {
    bg: theme.bg,
    card: theme.surface,
    text: theme.textPrimary,
    subtext: '#b2b2b2ff',
    hairline: theme.hairline,
};

const formatTimer = (value) => {
    if (value == null) return '00:00';
    const sec = Number(value) || 0;
    const safeSec = Math.max(0, Math.round(sec));
    const h = Math.floor(safeSec / 3600);
    const m = Math.floor((safeSec % 3600) / 60);
    const seconds = safeSec % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const formatNumber = (value) => {
    if (value === undefined || value === null) return '0';
    try {
        return Number(value).toLocaleString();
    } catch (err) {
        return String(value);
    }
};

const joinMeta = (parts) => parts.filter(Boolean).map((part) => String(part).trim()).filter(Boolean).join(' · ');

const initialsFrom = (value = '') => {
    const parts = String(value).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'W';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const WorkoutPanelCard = ({
  onPress,
  highlight = false,
  uid,
  pfpVersion = 0,
  pfpUri,
  fallbackLabel,
  title = 'Workout',
  titleStyle,
  metaParts = [],
  isLive = false,
  liveDurationSeconds = 0,
  durationSeconds = 0,
  volume = 0,
  reps = 0,
  pbs = 0,
  style,
  exerciseSummaries = [],
}) => {
  const cachedPfp = usePfp(uid, pfpVersion);
  const resolvedPfp = cachedPfp || pfpUri || null;

  const isPressable = typeof onPress === 'function';
  const Container = isPressable ? RNBounceable : View;
  const containerProps = isPressable
    ? {
        onPress: () => {
          try { haptic(); } catch {}
          onPress();
        },
        activeScale: 0.965,
      }
    : {};

  const metaLine = joinMeta(metaParts);
  const durationLabel = formatTimer(isLive ? liveDurationSeconds : durationSeconds);
  const fallbackText = fallbackLabel || initialsFrom(title);
  const hasSummary = Array.isArray(exerciseSummaries) && exerciseSummaries.length > 0;
 
  return (
    <Container
      style={[
        styles.panel,
        highlight && styles.highlight,
        style,
      ]}
      {...containerProps}
    >
      <View style={styles.headerRow}>
        {resolvedPfp ? (
          <FastImage
            source={{
              uri: resolvedPfp,
              priority: FastImage.priority.normal,
              cache: FastImage.cacheControl.immutable,
            }}
            style={styles.pfp}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={[styles.pfp, styles.pfpFallback]}>
            <Text style={styles.pfpInitials}>{fallbackText}</Text>
          </View>
        )}

        <View style={styles.headerTextCol}>
          <Text style={[styles.templateTitle, titleStyle]} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
          {!!metaLine && (
            <Text style={styles.handleText} numberOfLines={2} ellipsizeMode="tail">
              {metaLine}
            </Text>
          )}
        </View>

        <View style={styles.rightAccessories}>
          {isLive ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Clock color={COLORS.text} size={s(14)} variant="Bold" />
              <Text style={styles.liveText}>{formatTimer(liveDurationSeconds)}</Text>
            </View>
          ) : (
            Number(pbs) > 0 && (
              <View style={styles.prPill}>
                <MaterialCommunityIcons name="trophy" size={s(12)} color="#FACC15" />
                <Text style={styles.prText}>{Number(pbs)} PR{Number(pbs) === 1 ? '' : 's'}</Text>
              </View>
            )
          )}
        </View>
      </View>

      {hasSummary ? (
        <>
          <View style={styles.divider} />
          <View style={styles.summarySection}>
            <View style={styles.summaryHeaderRow}>
              <Text style={[styles.summaryHeaderText, styles.summaryHeaderExercise]}>Exercise</Text>
              <Text style={[styles.summaryHeaderText, styles.summaryHeaderBest]}>Best Set</Text>
            </View>
            {exerciseSummaries.map((row, idx) => (
              <View style={styles.summaryRow} key={`${row.exercise || 'exercise'}-${idx}`}>
                <Text style={styles.summaryExercise} numberOfLines={1}>{row.exercise || 'Exercise'}</Text>
                <Text style={styles.summaryBest} numberOfLines={1}>{row.bestSet || '--'}</Text>
              </View>
            ))}
          </View>
          <View style={styles.summaryBottomDivider} />
        </>
      ) : (
        <View style={styles.divider} />
      )}

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { flex: 1.25 }]}>
          <View style={styles.statInnerRow}>
            <View style={[styles.statIconWrap, styles.statIconTight]}>
              <Clock color={theme.textSecondary} size={s(15)} variant="Bold" />
            </View>
            <View style={styles.statTextCol}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue} numberOfLines={1}>{durationLabel}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.statCard, { flex: 1.35 }]}>
          <View style={styles.statInnerRow}>
            <View style={[styles.statIconWrap, styles.statIconTight]}>
              <MaterialCommunityIcons name="weight-lifter" size={s(15)} color={theme.textSecondary} />
            </View>
            <View style={styles.statTextCol}>
              <Text style={styles.statLabel}>Volume</Text>
              <Text style={styles.statValue} numberOfLines={1}>{formatNumber(volume)} lb</Text>
            </View>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statInnerRow}>
            <View style={[styles.statIconWrap, styles.statIconTight]}>
              <MaterialCommunityIcons name="arm-flex" size={s(15)} color={theme.textSecondary} />
            </View>
            <View style={styles.statTextCol}>
              <Text style={styles.statLabel}>Reps</Text>
              <Text style={styles.statValue} numberOfLines={1}>{formatNumber(reps)}</Text>
            </View>
          </View>
        </View>
      </View>

    </Container>
  );
};

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: scaleSize(s(16)),
    paddingVertical: scaleSize(s(12)),
    borderRadius: scaleSize(s(20)),
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleSize(s(6)) },
    shadowOpacity: 0.07,
    shadowRadius: scaleSize(s(12)),
    elevation: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
  },
  highlight: {
    borderColor: 'rgba(45,158,255,0.55)',
    shadowColor: '#2D9EFF',
    shadowOpacity: 0.18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(s(6)),
    gap: scaleSize(s(10)),
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  rightAccessories: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSize(s(10)),
  },
  pfp: {
    width: scaleSize(s(38)),
    height: scaleSize(s(38)),
    borderRadius: scaleSize(s(19)),
    backgroundColor: '#E2E8F0',
  },
  pfpFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pfpInitials: {
    fontFamily: 'Outfit_700Bold',
    fontSize: scaleSize(s(12)),
    color: COLORS.text,
    opacity: 0.9,
  },
  templateTitle: {
    fontSize: scaleSize(s(12.5)),
    fontFamily: 'Outfit_700Bold',
    color: COLORS.text,
  },
  handleText: {
    marginTop: scaleSize(s(2)),
    fontSize: scaleSize(s(12)),
    fontFamily: 'Outfit_500Medium',
    color: COLORS.subtext,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSize(s(6)),
    backgroundColor: 'rgba(45,158,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(45,158,255,0.35)',
    paddingVertical: scaleSize(s(6)),
    paddingHorizontal: scaleSize(s(9)),
    borderRadius: scaleSize(s(999)),
  },
  liveDot: {
    width: scaleSize(s(8)),
    height: scaleSize(s(8)),
    borderRadius: scaleSize(s(4)),
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: scaleSize(s(11.5)),
    color: COLORS.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.hairline,
    marginVertical: scaleSize(s(6)),
  },
  summarySection: {
    gap: scaleSize(s(6)),
    paddingHorizontal: scaleSize(s(6)),
    paddingVertical: scaleSize(s(3))
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryHeaderText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: scaleSize(s(11.5)),
    color: COLORS.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryHeaderExercise: {
    flex: 0.58,
    minWidth: 0,
  },
  summaryHeaderBest: {
    flex: 0.41,
    textAlign: 'left',
    paddingLeft: scaleSize(s(4)),
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSize(s(8)),
  },
  summaryExercise: {
    flex: 0.58,
    minWidth: 0,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: scaleSize(s(12.5)),
    color: COLORS.text,
  },
  summaryBest: {
    flex: 0.42,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: scaleSize(s(12.5)),
    color: COLORS.text,
    textAlign: 'left',
    paddingLeft: scaleSize(s(4)),
  },
  summaryBottomDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.hairline,
    marginTop: scaleSize(s(6)),
    marginBottom: scaleSize(s(6)),
  },
  statsRow: {
    flexDirection: 'row',
    gap: scaleSize(s(6)),
  },
  statCard: {
    flex: 1,
    paddingVertical: scaleSize(s(6)),
  },
  statInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconWrap: {
    width: scaleSize(s(30)),
    height: scaleSize(s(30)),
    borderRadius: scaleSize(s(20)),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff2e',
    marginBottom: scaleSize(s(6)),
  },
  statIconTight: {
    marginBottom: 0,
    marginRight: scaleSize(s(8)),
  },
  statTextCol: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: scaleSize(s(11)),
    color: theme.textSecondary,
  },
  statValue: {
    marginTop: scaleSize(s(1)),
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: scaleSize(s(13)),
    color: COLORS.text,
  },
  prPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSize(s(6)),
    backgroundColor: 'rgba(250, 204, 21, 0.24)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(250, 204, 21, 0.60)',
    paddingVertical: scaleSize(s(5)),
    paddingHorizontal: scaleSize(s(8)),
    borderRadius: scaleSize(s(999)),
  },
  prText: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: scaleSize(s(12)),
    color: '#FACC15',
  },
});

export default memo(WorkoutPanelCard);
