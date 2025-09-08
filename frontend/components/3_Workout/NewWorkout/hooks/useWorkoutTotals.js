// hooks/useWorkoutTotals.js
import { useMemo } from "react";
import calculate1RM from "../../../../helper/calculate1RM";

export default function useWorkoutTotals({ baseWorkout, activeStats }) {
  const totals = useMemo(() => {
    const w = baseWorkout;
    if (!w?.exercises) return { reps: 0, volume: 0, PBs: 0 };
    let reps = 0,
      volume = 0,
      PBs = 0;

    (w.exercises || []).forEach((exercise) => {
      let hitPB = false;
      (exercise.sets || []).forEach((set) => {
        if (!set?.isDone) return;
        const r = Number(set?.reps) || 0;
        const wt = Number(set?.weight) || 0;
        reps += r;
        volume += r * wt;
        const prevMax = activeStats?.[exercise?.name]?.["1RM"] || 0;
        const maxNow = calculate1RM(wt, r);
        if (!hitPB && maxNow > prevMax) {
          hitPB = true;
          PBs += 1;
        }
      });
    });
    return { reps, volume, PBs };
  }, [baseWorkout, activeStats]);

  return totals;
}
