import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import theme from '../../../../theme/mfpDark';
import WorkoutPanelCard from '../../../3_Workout/ui/WorkoutPanelCard';

import scaleSize from "../../../../helper/scaleSize";

const toNumber = (n) => (Number(n || 0) || 0);

export default function WorkoutHistoryCard({ workout }) {
  const exCount = Array.isArray(workout?.exercises) ? workout.exercises.length : 0;
  const setCount = useMemo(
    () => (Array.isArray(workout?.exercises)
      ? workout.exercises.reduce((acc, e) => acc + (e?.sets?.length || 0), 0)
      : 0),
    [workout?.exercises]
  );
  const pbs = Number(workout?.PBs ?? workout?.pbs ?? 0);
  const title = workout?.templateName || workout?.template?.name || workout?.name || 'Workout';
  const hasTemplate = (workout && workout.tid != null);
  const subtitle = `${exCount} exercises • ${setCount} sets`;

  return (
    <WorkoutPanelCard
      title={title}
      titleStyle={hasTemplate ? { color: theme.primary } : null}
      subtitle={subtitle}
      pbs={pbs}
      durationMs={workout?.duration}
      volume={toNumber(workout?.volume)}
      reps={toNumber(workout?.reps)}
      showChevron={false}
      style={{ marginHorizontal: scaleSize(16) }}
    />
  );
}

const styles = StyleSheet.create({});
