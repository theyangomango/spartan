import { createWithEqualityFn } from 'zustand/traditional';

export const WORKOUT_SHEET_STATES = Object.freeze({
  HIDDEN: 'hidden',
  COLLAPSED: 'collapsed',
  EXPANDED: 'expanded',
});

const noop = () => {};

// Centralized workout editing store to avoid re-rendering the parent screen.
// Components can subscribe to just the slices they need.
const useWorkoutStore = createWithEqualityFn((set) => ({
  workout: null,
  sheetState: WORKOUT_SHEET_STATES.HIDDEN,
  timer: '',
  sheetHandlers: {
    startWorkout: null,
    cancelWorkout: noop,
    updateWorkout: noop,
    finishWorkout: noop,
    showGroupModal: noop,
    registerInviteHandler: noop,
    setIsVisible: noop,
    getUserWorkoutStats: () => ({}),
    timerRef: null,
  },
  sheetSharedAnimatedIndex: null,

  setWorkout: (workout) =>
    set((state) => ({
      workout,
      sheetState: workout ? state.sheetState : WORKOUT_SHEET_STATES.HIDDEN,
    })),

  setSheetState: (sheetState) =>
    set((state) => (state.sheetState === sheetState ? state : { sheetState: sheetState ?? WORKOUT_SHEET_STATES.HIDDEN })),

  setTimer: (value) => {
    const normalized = typeof value === 'string' ? value : String(value || '');
    set((state) => (state.timer === normalized ? state : { timer: normalized }));
  },

  setSheetHandlers: (handlers = {}) =>
    set((state) => ({ sheetHandlers: { ...state.sheetHandlers, ...handlers } })),

  setSheetSharedAnimatedIndex: (value) =>
    set((state) => (state.sheetSharedAnimatedIndex === value ? state : { sheetSharedAnimatedIndex: value })),
}));

export default useWorkoutStore;
