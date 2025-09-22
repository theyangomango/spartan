import { create } from 'zustand';

export const WORKOUT_SHEET_STATES = Object.freeze({
  HIDDEN: 'hidden',
  COLLAPSED: 'collapsed',
  EXPANDED: 'expanded',
});

const noop = () => {};

// Centralized workout editing store to avoid re-rendering the parent screen.
// Components can subscribe to just the slices they need.
export const useWorkoutStore = create((set, get) => ({
  workout: null,
  sheetState: WORKOUT_SHEET_STATES.HIDDEN,
  timer: '',
  sheetHandlers: {
    cancelWorkout: noop,
    updateWorkout: noop,
    finishWorkout: noop,
    showGroupModal: noop,
    registerInviteHandler: noop,
    setIsVisible: noop,
    getUserWorkoutStats: () => ({}),
    timerRef: null,
  },

  setWorkout: (workout) =>
    set((state) => ({
      workout,
      sheetState: workout ? state.sheetState : WORKOUT_SHEET_STATES.HIDDEN,
    })),

  patchWorkout: (updater) =>
    set((state) => {
      const curr = state.workout;
      if (!curr) return { workout: curr };
      const next = typeof updater === 'function' ? updater(curr) : { ...curr, ...updater };
      return { workout: next };
    }),

  setSheetState: (sheetState) =>
    set((state) => (state.sheetState === sheetState ? state : { sheetState: sheetState ?? WORKOUT_SHEET_STATES.HIDDEN })),

  setTimer: (value) => {
    const normalized = typeof value === 'string' ? value : String(value || '');
    set((state) => (state.timer === normalized ? state : { timer: normalized }));
  },

  setSheetHandlers: (handlers = {}) =>
    set((state) => ({ sheetHandlers: { ...state.sheetHandlers, ...handlers } })),
}));

export default useWorkoutStore;

