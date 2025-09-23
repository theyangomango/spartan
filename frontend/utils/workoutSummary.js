const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const cleaned = parseFloat(value.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(cleaned) ? cleaned : 0;
  }
  return 0;
};

const formatCount = (value) => {
  if (!value || !Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, '');
};

const resolveUnit = (exercise, set) => {
  const candidates = [
    set?.unit,
    set?.units,
    set?.weightUnit,
    exercise?.unit,
    exercise?.units,
  ];
  for (const candidate of candidates) {
    if (candidate) return String(candidate);
  }
  if (set?.kg != null || exercise?.metric === 'kg') return 'kg';
  if (set?.lbs != null) return 'lb';
  return 'lb';
};

const unitLabel = (unit) => {
  const normalized = String(unit || '').toLowerCase();
  if (!normalized) return '';
  if (['lb', 'lbs', 'pound', 'pounds'].includes(normalized)) return 'lb';
  if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(normalized)) return 'kg';
  if (['bodyweight', 'bw', 'body-weight'].includes(normalized)) return 'Bodyweight';
  return unit;
};

const formatBestSet = (setInfo) => {
  if (!setInfo) return '--';
  const { weight, reps, unit } = setInfo;
  const hasWeight = weight > 0;
  const hasReps = reps > 0;

  const unitText = unitLabel(unit);
  if (!hasWeight && !hasReps) {
    return unitText && unitText !== 'Bodyweight' ? unitText : '--';
  }

  if (!hasWeight) {
    let baseLabel = 'Bodyweight';
    if (unitText && unitText !== 'lb') {
      baseLabel = unitText === 'Bodyweight' ? 'Bodyweight' : unitText;
    }
    return hasReps ? `${baseLabel} x ${formatCount(reps)}` : baseLabel;
  }

  const weightText = `${formatCount(weight)}${unitText ? ` ${unitText}` : ''}`.trim();
  if (!hasReps) return weightText || '--';
  return `${weightText} x ${formatCount(reps)}`;
};

const bestSetForExercise = (exercise) => {
  const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
  let best = null;
  let bestScore = -Infinity;
  let meaningfulCount = 0;

  sets.forEach((set) => {
    if (!set || typeof set !== 'object') return;
    const weight = toNumber(set.weight ?? set.lbs ?? set.kg ?? set.load ?? set.value?.weight ?? set.data?.weight ?? set.w);
    const reps = toNumber(set.reps ?? set.rep ?? set.r ?? set.value?.reps ?? set.data?.reps);

    const hasData = weight > 0 || reps > 0;
    if (!hasData) return;

    const unit = resolveUnit(exercise, set);
    const score = (weight > 0 ? weight * 1000 : 0) + reps;
    meaningfulCount += 1;
    if (!best || score > bestScore) {
      best = { weight, reps, unit };
      bestScore = score;
    }
  });

  return { best, meaningfulCount, totalSets: sets.length };
};

export const buildExerciseSummaries = (workout, limit = 3) => {
  if (!workout) return [];
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  if (!exercises.length) return [];

  const summaries = [];
  for (const exercise of exercises) {
    if (!exercise) continue;
    const { best, meaningfulCount, totalSets } = bestSetForExercise(exercise);
    const setCount = meaningfulCount || totalSets;
    if (!setCount) continue;
    const name = exercise?.name || 'Exercise';
    const label = `${setCount} x ${name}`;
    const bestSetText = formatBestSet(best);

    summaries.push({
      exercise: label,
      bestSet: bestSetText,
    });
    if (summaries.length >= limit) break;
  }

  return summaries;
};

export default buildExerciseSummaries;
