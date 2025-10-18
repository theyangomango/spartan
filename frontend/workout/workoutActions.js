import useWorkoutStore, { WORKOUT_SHEET_STATES } from "../state/workoutStore";

const getStore = () => {
    try {
        return useWorkoutStore.getState();
    } catch {
        return null;
    }
};

const ensureVisibleFlag = () => {
    const store = getStore();
    if (!store) return;
    try {
        const setVisible = store.sheetHandlers?.setIsVisible;
        if (typeof setVisible === "function") {
            setVisible(true);
        }
    } catch {
        // ignore
    }
};

export const openActiveWorkout = () => {
    const store = getStore();
    if (!store) return;
    try {
        store.setSheetState?.(WORKOUT_SHEET_STATES.EXPANDED);
    } catch {
        // ignore missing setters
    }
    ensureVisibleFlag();
    try {
        const openFn = global?.openWorkoutModal;
        if (typeof openFn === "function") {
            openFn();
        }
    } catch {
        // ignore
    }
};

export const startFreshWorkout = (template = null, options = {}) => {
    const store = getStore();
    const start =
        store?.sheetHandlers?.startWorkout ||
        (() => {
            try {
                return global?.__startEmptyWorkout;
            } catch {
                return null;
            }
        })();
    if (typeof start !== "function") return false;

    const normalizedOptions = {
        forceFresh: true,
        skipUI: false,
        ...(options || {}),
    };

    try {
        start(template, normalizedOptions);
        return true;
    } catch {
        return false;
    } finally {
        openActiveWorkout();
    }
};

export const joinWorkoutFromPayload = (payload) => {
    const join = (() => {
        try {
            return global?.__joinExternalWorkoutDirect;
        } catch {
            return null;
        }
    })();

    if (typeof join !== "function") return false;
    try {
        const result = join(payload);
        if (result && typeof result.then === "function") {
            result.catch?.(() => {});
        }
        openActiveWorkout();
        return true;
    } catch {
        return false;
    }
};

export const ensureWorkoutSheetVisible = () => {
    const store = getStore();
    if (!store) return;
    try {
        store.setSheetState?.(WORKOUT_SHEET_STATES.EXPANDED);
    } catch {
        // ignore
    }
    ensureVisibleFlag();
};

export default {
    openActiveWorkout,
    startFreshWorkout,
    joinWorkoutFromPayload,
    ensureWorkoutSheetVisible,
};
