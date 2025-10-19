import React, { useCallback, useEffect, useRef, useState } from "react";
import GroupModalBottomSheet from "./NewWorkout/Group/GroupModalBottomSheet";
import UserStatsAfterWorkoutSheet from "../2_Competition/UserStats/UserStatsAfterWorkoutSheet";
import useWorkoutManager from "../../logic/useWorkoutManager";
import useWorkoutStore, { WORKOUT_SHEET_STATES } from "../../state/workoutStore";
import millisToHoursMinutesSeconds from "../../helper/millisToHoursMinutesSeconds";
import { navigationRef, jumpToTab } from "../../../navigationRef";

const noop = () => {};

const resetHandlers = Object.freeze({
    startWorkout: null,
    cancelWorkout: noop,
    updateWorkout: noop,
    finishWorkout: noop,
    showGroupModal: noop,
    registerInviteHandler: noop,
    timerRef: null,
    setIsVisible: noop,
    getUserWorkoutStats: () => ({}),
    persistWorkout: noop,
});

const ensureSheetExpanded = () => {
    try {
        const store = useWorkoutStore.getState();
        store?.setSheetState?.(WORKOUT_SHEET_STATES.EXPANDED);
        const setVisible = store?.sheetHandlers?.setIsVisible;
        if (typeof setVisible === "function") {
            setVisible(true);
        }
    } catch {
        // ignore best-effort expansion errors
    }
};

export default function WorkoutExperiencePortal({ uid, enabled }) {
    const navigation = navigationRef.current;

    const {
        timerRef,
        isNewWorkoutVisible,
        setIsNewWorkoutVisible,
        isSummaryModalVisible,
        setIsSummaryModalVisible,
        startNewWorkoutFromTemplate,
        updateNewWorkout,
        cancelWorkout,
        finishWorkout,
        joinExternalWorkout,
        persistCurrentWorkout,
    } = useWorkoutManager({
        uid,
        navigation,
        millisToHMS: millisToHoursMinutesSeconds,
    });

    const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
    const inviteHandlerRef = useRef(null);
    const [hexSnapshot, setHexSnapshot] = useState({ from: null, to: null });

    const showGroupModalCb = useCallback(() => setInviteSheetOpen(true), []);
    const registerInviteHandlerCb = useCallback((fn) => {
        inviteHandlerRef.current = typeof fn === "function" ? fn : null;
    }, []);
    const closeGroupModalCb = useCallback(() => setInviteSheetOpen(false), []);
    const onInviteCb = useCallback((users) => {
        const handler = inviteHandlerRef.current;
        if (typeof handler === "function") {
            try {
                handler(users);
            } catch {
                // swallow invite handler errors
            }
        }
        setInviteSheetOpen(false);
    }, []);

    const setSheetHandlers = useWorkoutStore((state) => state.setSheetHandlers);

    useEffect(() => {
        if (!enabled || !setSheetHandlers) return;

        setSheetHandlers({
            startWorkout: startNewWorkoutFromTemplate,
            cancelWorkout,
            updateWorkout: updateNewWorkout,
            finishWorkout,
            showGroupModal: showGroupModalCb,
            registerInviteHandler: registerInviteHandlerCb,
            timerRef,
            setIsVisible: setIsNewWorkoutVisible,
            getUserWorkoutStats: () => {
                try {
                    return global?.userData?.statsExercises || {};
                } catch {
                    return {};
                }
            },
            persistWorkout: persistCurrentWorkout,
        });

        return () => {
            setSheetHandlers(resetHandlers);
        };
    }, [
        enabled,
        setSheetHandlers,
        startNewWorkoutFromTemplate,
        cancelWorkout,
        updateNewWorkout,
        finishWorkout,
        showGroupModalCb,
        registerInviteHandlerCb,
        timerRef,
        setIsNewWorkoutVisible,
        persistCurrentWorkout,
    ]);

    useEffect(() => {
        if (!enabled) return;
        try {
            global.__startEmptyWorkout = startNewWorkoutFromTemplate;
        } catch {
            // ignore
        }
        return () => {
            try {
                if (global.__startEmptyWorkout === startNewWorkoutFromTemplate) {
                    global.__startEmptyWorkout = null;
                }
            } catch {
                // ignore
            }
        };
    }, [enabled, startNewWorkoutFromTemplate]);

    useEffect(() => {
        if (!enabled) return;
        const openFn = () => {
            ensureSheetExpanded();
            try {
                setIsNewWorkoutVisible(true);
            } catch {
                // ignore
            }
        };

        try {
            global.openWorkoutModal = openFn;
        } catch {
            // ignore
        }

        return () => {
            try {
                if (global.openWorkoutModal === openFn) {
                    global.openWorkoutModal = null;
                }
            } catch {
                // ignore
            }
        };
    }, [enabled, setIsNewWorkoutVisible]);

    useEffect(() => {
        if (!enabled) return;
        try {
            global.__joinExternalWorkoutDirect = joinExternalWorkout;
        } catch {
            // ignore
        }
        return () => {
            try {
                if (global.__joinExternalWorkoutDirect === joinExternalWorkout) {
                    global.__joinExternalWorkoutDirect = null;
                }
            } catch {
                // ignore
            }
        };
    }, [enabled, joinExternalWorkout]);

    useEffect(() => {
        if (!enabled) return;
        try {
            global.__openActiveWorkout = ensureSheetExpanded;
        } catch {
            // ignore
        }
        return () => {
            try {
                if (global.__openActiveWorkout === ensureSheetExpanded) {
                    global.__openActiveWorkout = null;
                }
            } catch {
                // ignore
            }
        };
    }, [enabled]);

    const handleSummaryClose = useCallback(() => {
        setIsSummaryModalVisible(false);
    }, [setIsSummaryModalVisible]);

    useEffect(() => {
        if (!enabled || !isSummaryModalVisible) return;

        const captureHex = () => {
            try {
                const fromHex = global?.__hexChangeFrom || null;
                const toHex = global?.__hexChangeTo || null;
                setHexSnapshot({ from: fromHex, to: toHex });
            } catch {
                setHexSnapshot({ from: null, to: null });
            }
        };

        captureHex();

        const params = { scrollToTop: true, _t: Date.now() };
        const navigated = jumpToTab("Feed", params);
        if (!navigated) {
            try {
                navigation?.navigate?.("Tabs", { screen: "Feed", params });
            } catch {
                try {
                    navigationRef.navigate("Tabs", { screen: "Feed", params });
                } catch {
                    // ignore navigation fallback errors
                }
            }
        }
        try {
            global.scrollFeedToTop?.();
        } catch {
            // ignore best-effort scroll errors
        }
    }, [enabled, isSummaryModalVisible, navigation]);

    if (!enabled) {
        return null;
    }

    return (
        <>
            <GroupModalBottomSheet
                groupModalExpandFlag={inviteSheetOpen}
                closeGroupModal={closeGroupModalCb}
                onInvite={onInviteCb}
            />
            <UserStatsAfterWorkoutSheet
                visible={isSummaryModalVisible}
                onClose={handleSummaryClose}
                user={global?.userData || null}
                fromHexagon={hexSnapshot.from}
                toHexagon={hexSnapshot.to}
            />
        </>
    );
}
