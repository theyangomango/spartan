import { create } from 'zustand';

// Centralized workout editing store to avoid re-rendering the parent screen.
// Components can subscribe to just the slices they need.

export const useWorkoutStore = create((set, get) => ({
  workout: null,
  setWorkout: (w) => set({ workout: w }),
  patchWorkout: (updater) =>
    set((state) => {
      const curr = state.workout;
      if (!curr) return { workout: curr };
      const next = typeof updater === 'function' ? updater(curr) : { ...curr, ...updater };
      return { workout: next };
    }),
}));

export default useWorkoutStore;

