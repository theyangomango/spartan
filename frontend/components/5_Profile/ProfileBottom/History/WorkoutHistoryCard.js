import React from 'react';
import theme from '../../../../theme/mfpDark';
import WorkoutPanelCard from '../../../3_Workout/ui/WorkoutPanelCard';

import scaleSize from "../../../../helper/scaleSize";
import { buildExerciseSummaries } from "../../../../utils/workoutSummary";
import { resolvePhotoURL } from "../../../../utils/profilePhoto";

const toNumber = (n) => (Number(n || 0) || 0);

const toMillis = (value) => {
  if (!value && value !== 0) return undefined;
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : undefined;
};

const bestTimestamp = (workout) => Math.max(
  toMillis(workout?.finishedAt) ?? 0,
  toMillis(workout?.completedAt) ?? 0,
  toMillis(workout?.startedAt) ?? 0,
  toMillis(workout?.createdAt) ?? 0,
  toMillis(workout?.created) ?? 0,
);

const formatWorkoutDateTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  let timePart = '';
  try {
    timePart = d
      .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
      .toLowerCase()
      .replace(/[\s.]/g, '');
  } catch {
    timePart = '';
  }
  let datePart = '';
  try {
    const nowYear = new Date().getFullYear();
    const opts = d.getFullYear() === nowYear
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: '2-digit' };
    datePart = d.toLocaleDateString(undefined, opts);
  } catch {
    datePart = '';
  }
  if (timePart && datePart) return `${timePart}, ${datePart}`;
  return timePart || datePart;
};

const firstName = (name = '') => {
  const str = String(name).trim();
  if (!str) return '';
  const raw = (str.split(/\s+/)[0] || str).replace(/[.,;:]+$/, '');
  return raw;
};

const initials = (name = '') => {
  const parts = String(name).trim().split(/\s+/);
  const a = (parts[0] || '').charAt(0);
  const b = (parts[1] || '').charAt(0);
  return (a + b).toUpperCase() || 'Y';
};

const ensureHandle = (workout) => {
  const fallbackHandle = global?.userData?.handle ?? workout?.handle ?? workout?.username ?? '';
  const fromName = firstName(workout?.name ?? global?.userData?.name ?? '')?.toLowerCase();
  const base = fallbackHandle || fromName;
  if (!base) return '@you';
  const normalized = String(base).trim();
  if (!normalized) return '@you';
  return normalized.startsWith('@') ? normalized : `@${normalized}`;
};

export default function WorkoutHistoryCard({ workout, style }) {
  const pbs = Number(workout?.PBs ?? workout?.pbs ?? 0);
  const title = workout?.templateName || workout?.template?.name || workout?.name || 'Workout';
  const hasTemplate = (workout && workout.tid != null);

  const ts = bestTimestamp(workout);
  const metaParts = [ensureHandle(workout)];
  const dateTime = formatWorkoutDateTime(ts);
  if (dateTime) metaParts.push(dateTime);
  const fallbackName = workout?.name ?? global?.userData?.name ?? 'You';
  const viewerFallbackPfp = resolvePhotoURL(global?.userData, "");
  const pfpUri = resolvePhotoURL(workout, viewerFallbackPfp) || viewerFallbackPfp;
  const durationMs = Number.isFinite(Number(workout?.duration)) && Number(workout?.duration) > 0
    ? Number(workout?.duration)
    : Math.max(0, (Date.now() - Number(workout?.created || 0)));
  const durationSeconds = Math.max(0, Math.round(durationMs / 1000));

  return (
    <WorkoutPanelCard
      title={title}
      titleStyle={hasTemplate ? { color: theme.primary } : null}
      metaParts={metaParts}
      uid={workout?.uid}
      pfpVersion={workout?.pfpVersion || 0}
      pbs={pbs}
      durationSeconds={durationSeconds}
      volume={toNumber(workout?.volume)}
      reps={toNumber(workout?.reps)}
      exerciseSummaries={buildExerciseSummaries(workout)}
      pfpUri={pfpUri}
      fallbackLabel={initials(fallbackName)}
      style={[{ marginHorizontal: scaleSize(16), marginBottom: scaleSize(14) }, style]}
    />
  );
}
