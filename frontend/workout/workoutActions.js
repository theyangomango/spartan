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
        // ignore
    }
    ensureVisibleFlag();
    const trigger = () => {
        try {
            const expandFn = global?.__openActiveWorkout;
            if (typeof expandFn === "function") {
                expandFn();
            }
        } catch {
            // ignore
        }
        try {
            const openFn = global?.openWorkoutModal;
            if (typeof openFn === "function") {
                openFn();
            }
        } catch {
            // ignore
        }
    };
    if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(trigger);
    } else {
        setTimeout(trigger, 0);
    }
};

export const startFreshWorkout = (template = null, options = {}) => {
    const findStarter = () => {
        const store = getStore();
        const handler = store?.sheetHandlers?.startWorkout;
        if (typeof handler === "function") return handler;
        try {
            return typeof global?.__startEmptyWorkout === "function"
                ? global.__startEmptyWorkout
                : null;
        } catch {
            return null;
        }
    };

    const start = findStarter();
    if (typeof start !== "function") {
        openActiveWorkout();
        return false;
    }

    const normalizedOptions = {
        forceFresh: true,
        skipUI: false,
        ...(options || {}),
    };

    try {
        const result = start(template, normalizedOptions);
        if (result && typeof result.then === "function") {
            result.catch?.(() => {});
        }
    } catch {
        // swallow start errors; caller will handle via sheet state
    }
    openActiveWorkout();
    return true;
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
