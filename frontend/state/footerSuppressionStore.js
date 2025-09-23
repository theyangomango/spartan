import { createWithEqualityFn } from 'zustand/traditional';

const useFooterSuppressionStore = createWithEqualityFn((set) => ({
    activeKeys: new Set(),
    isSuppressed: false,
    setSuppressed: (key, suppressed) => set((state) => {
        if (!key) return state;
        const hasKey = state.activeKeys.has(key);
        if (suppressed) {
            if (hasKey) {
                return state.isSuppressed ? state : { isSuppressed: true };
            }
            const nextKeys = new Set(state.activeKeys);
            nextKeys.add(key);
            return { activeKeys: nextKeys, isSuppressed: true };
        }
        if (!hasKey) {
            return state;
        }
        const nextKeys = new Set(state.activeKeys);
        nextKeys.delete(key);
        return { activeKeys: nextKeys, isSuppressed: nextKeys.size > 0 };
    }),
    reset: () => set({ activeKeys: new Set(), isSuppressed: false }),
}));

export const setFooterSuppressed = (key, suppressed) => {
    try {
        useFooterSuppressionStore.getState().setSuppressed(key, suppressed);
    } catch {}
};

export const clearFooterSuppression = () => {
    try {
        useFooterSuppressionStore.getState().reset();
    } catch {}
};

export default useFooterSuppressionStore;
