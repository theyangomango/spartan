// Central accent used by the collapsed active workout sheet; tweak once to update all usages.
const ACTIVE_WORKOUT_HIGHLIGHT_RGB = '45, 157, 255';

export const activeWorkoutHighlight = (alpha = 1) => `rgba(${ACTIVE_WORKOUT_HIGHLIGHT_RGB}, ${alpha})`;
