// Save handler of the PastWorkout screen's editor: writes the edited workout, then syncs the screen, global.userData and the feed cache.

import { useCallback } from "react";
import { Alert } from "react-native";

import updateCompletedWorkout from "../../../backend/workouts/updateCompletedWorkout";
import { emitHexagonUpdate } from "../../utils/hexagonEvents";
import { emitUserDataUpdate } from "../../utils/userDataEvents";
import { invalidateFeedCacheForUser } from "../../helper/feedCache";
import { toMillis } from "./pastWorkoutUtils";

const useSaveEditedWorkout = ({ canEditWorkout, viewerUid, workout, workoutIdentifier, setWorkout }) => {
    const handleSaveEditedWorkout = useCallback(async (updatedWorkout) => {
        if (!canEditWorkout || !updatedWorkout) return;
        const uid = viewerUid;
        if (!uid) throw new Error("missing-uid");

        try {
            const payload = {
                ...(workout || {}),
                ...(updatedWorkout || {}),
            };

            const result = await updateCompletedWorkout(uid, workoutIdentifier, payload);

            if (!result?.ok) {
                console.warn("[PastWorkoutScreen] updateCompletedWorkout returned non-ok result", result);
                throw new Error(result?.error || "update-failed");
            }

            const nextWorkouts = Array.isArray(result.completedWorkouts) ? result.completedWorkouts : [];

            const updatedEntry = (() => {
                const targetWid = payload?.wid ?? payload?.id ?? payload?.workoutId ?? payload?.pid ?? null;
                const targetCreated = payload?.created ?? payload?.createdAt ?? payload?.finishedAt ?? payload?.completedAt ?? null;
                return nextWorkouts.find((item) => {
                    if (!item || typeof item !== "object") return false;
                    const wid = item?.wid ?? item?.id ?? item?.workoutId ?? item?.pid ?? null;
                    if (targetWid && wid != null && String(wid) === String(targetWid)) return true;
                    if (targetCreated) {
                        const created = item?.created ?? item?.createdAt ?? item?.finishedAt ?? item?.completedAt ?? null;
                        if (created && Math.abs(toMillis(created) - toMillis(targetCreated)) < 2000) return true;
                    }
                    return false;
                }) || payload;
            })();

            setWorkout(updatedEntry);
            invalidateFeedCacheForUser(uid);

            try {
                if (global?.userData) {
                    global.userData.completedWorkouts = nextWorkouts;
                    if (result.statsExercises) global.userData.statsExercises = result.statsExercises;
                    if (result.statsHexagon) global.userData.statsHexagon = result.statsHexagon;
                    if (result.statsHexagonMeta) global.userData.statsHexagonMeta = result.statsHexagonMeta;
                    if (Number.isFinite(result.statsTotalVolume)) global.userData.statsTotalVolume = result.statsTotalVolume;
                    if (Number.isFinite(result.statsTotalHours)) global.userData.statsTotalHours = result.statsTotalHours;
                    if (Number.isFinite(result.statsTotalWorkouts)) global.userData.statsTotalWorkouts = result.statsTotalWorkouts;
                    if (result.workoutsByDate) global.userData.workoutsByDate = result.workoutsByDate;
                    if (Object.prototype.hasOwnProperty.call(result, "currentRank")) {
                        global.userData.currentRank = result.currentRank;
                    }
                    if (Object.prototype.hasOwnProperty.call(result, "rankTier")) {
                        global.userData.rankTier = result.rankTier;
                    }
                    if (Object.prototype.hasOwnProperty.call(result, "rankLabel")) {
                        global.userData.rankLabel = result.rankLabel;
                    }
                    if (Object.prototype.hasOwnProperty.call(result, "rankLevel")) {
                        global.userData.rankLevel = result.rankLevel;
                    }
                    emitHexagonUpdate();
                    emitUserDataUpdate();
                }
            } catch (syncError) {
                console.warn("[PastWorkoutScreen] Failed to sync global user data after update", syncError);
            }

            return result;
        } catch (error) {
            console.error("[PastWorkoutScreen] updateCompletedWorkout failed", {
                error,
                identifier: workoutIdentifier,
            });
            Alert.alert("Save failed", "Please try again.");
            throw error;
        }
    }, [canEditWorkout, viewerUid, workout, workoutIdentifier]);

    return handleSaveEditedWorkout;
};

export default useSaveEditedWorkout;
