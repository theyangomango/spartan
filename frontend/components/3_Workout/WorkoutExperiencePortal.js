import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import WorkoutSummaryModal from "./WorkoutSummaryModal";
import GroupModalBottomSheet from "./NewWorkout/Group/GroupModalBottomSheet";
import useWorkoutManager from "../../logic/useWorkoutManager";
import useWorkoutStore, { WORKOUT_SHEET_STATES } from "../../state/workoutStore";
import millisToHoursMinutesSeconds from "../../helper/millisToHoursMinutesSeconds";
import updateDoc from "../../../backend/helper/firebase/updateDoc";
import makeID from "../../../backend/helper/makeID";
import { navigationRef } from "../../../navigationRef";

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

const mapSetsFromWorkout = (workout) =>
    (Array.isArray(workout?.exercises) ? workout.exercises : []).map((ex) => ({
        name: ex?.name || "",
        muscle: ex?.muscle || "",
        sets: (Array.isArray(ex?.sets) ? ex.sets : []).map((s) => ({
            weight: Number(s?.weight) || 0,
            reps: Number(s?.reps) || 0,
            type: (() => {
                const raw = typeof s?.type === "string" ? s.type.toLowerCase() : "";
                return raw === "warmup" || raw === "dropset" || raw === "failure" ? raw : null;
            })(),
        })),
    }));

export default function WorkoutExperiencePortal({ uid, enabled }) {
    const navigation = navigationRef.current;

    const {
        timerRef,
        isNewWorkoutVisible,
        setIsNewWorkoutVisible,
        isSummaryModalVisible,
        setIsSummaryModalVisible,
        completedWorkout,
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
    const saveTemplatePendingRef = useRef(false);

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

    const handleSaveSummaryTemplate = useCallback(async () => {
        if (!enabled || saveTemplatePendingRef.current) return;
        const workout = completedWorkout;
        if (!workout) return;

        const hasTemplate =
            workout?.tid != null ||
            workout?.templateId != null ||
            (workout?.template && workout.template.tid != null);

        if (hasTemplate || !uid) {
            handleSummaryClose();
            return;
        }

        saveTemplatePendingRef.current = true;
        try {
            const tid = makeID();
            const exercises = mapSetsFromWorkout(workout);
            const newTemplate = { id: tid, tid, name: "New Template", exercises, lastDate: null };
            const prevTemplates = (() => {
                try {
                    return Array.isArray(global?.userData?.templates)
                        ? [...global.userData.templates]
                        : [];
                } catch {
                    return [];
                }
            })();
            const nextTemplates = [...prevTemplates, newTemplate];

            try {
                await updateDoc("users", uid, { templates: nextTemplates });
            } catch (err) {
                if (Platform.OS !== "web") {
                    console.log("handleSaveSummaryTemplate updateDoc error", err);
                }
            }

            try {
                if (!global.userData || typeof global.userData !== "object") {
                    global.userData = {};
                }
                global.userData.templates = nextTemplates;
                global.__templatesLocalSig = JSON.stringify(nextTemplates || []);
                global.__templatesDirty = true;
            } catch {
                // ignore global sync issues
            }
        } catch (err) {
            if (Platform.OS !== "web") {
                console.log("handleSaveSummaryTemplate error", err);
            }
        } finally {
            saveTemplatePendingRef.current = false;
            handleSummaryClose();
        }
    }, [completedWorkout, enabled, handleSummaryClose, uid]);

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
            {isSummaryModalVisible && (
                <WorkoutSummaryModal
                    isVisible={isSummaryModalVisible}
                    workout={completedWorkout}
                    onClose={handleSummaryClose}
                    onSaveTemplate={handleSaveSummaryTemplate}
                />
            )}
        </>
    );
}
