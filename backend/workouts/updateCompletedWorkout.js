import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.config";
import updateDoc from "../helper/firebase/updateDoc.js";
import { estimateWorkoutCalories } from "../../frontend/helper/estimateWorkoutCalories.js";
import { resolveUserBodyweight } from "../../frontend/utils/bodyweight.js";
import { buildRankFields } from "./buildRankFields.js";
import { rebuildStatsFromWorkouts } from "./updateCompletedWorkoutStats.js";
import { normalizeIdentifier, findWorkoutInList, ensureExercisesAreArrays, deriveWorkoutMetrics } from "./updateCompletedWorkoutUtils.js";

export default async function updateCompletedWorkout(uid, identifierInput, updatedWorkoutInput) {
    const normalizedUid = typeof uid === "string" ? uid.trim() : "";
    if (!normalizedUid) throw new Error("updateCompletedWorkout: missing uid");
    if (!updatedWorkoutInput || typeof updatedWorkoutInput !== "object") {
        throw new Error("updateCompletedWorkout: missing updated workout");
    }

    const identifier = normalizeIdentifier(identifierInput) || normalizeIdentifier(updatedWorkoutInput);
    if (!identifier) throw new Error("updateCompletedWorkout: missing identifier");

    const preparedWorkout = ensureExercisesAreArrays(updatedWorkoutInput);
    const userRef = doc(db, "users", normalizedUid);
    const publicRef = doc(db, "usersPublic", normalizedUid);
    const privateRef = doc(db, "usersPrivate", normalizedUid);

    const result = await runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found");

        const publicSnap = await tx.get(publicRef);
        const privateSnap = await tx.get(privateRef);
        const data = userSnap.data() || {};
        const workouts = Array.isArray(data?.completedWorkouts) ? data.completedWorkouts : [];
        const { index, workout: existingWorkout } = findWorkoutInList(workouts, identifier);
        if (index < 0 || !existingWorkout) {
            throw new Error("Workout not found");
        }

        const workoutsBeforeCurrent = [
            ...workouts.slice(0, index),
            ...workouts.slice(index + 1),
        ];

        const statsBeforeEdit = workoutsBeforeCurrent.length
            ? (rebuildStatsFromWorkouts(workoutsBeforeCurrent)?.statsExercises || {})
            : {};

        const mergedWorkout = {
            ...existingWorkout,
            ...preparedWorkout,
        };

        const metrics = deriveWorkoutMetrics(mergedWorkout, statsBeforeEdit);
        mergedWorkout.volume = metrics.volume;
        mergedWorkout.reps = metrics.reps;
        mergedWorkout.PBs = metrics.PBs;
        const exercisesForCalories = Array.isArray(mergedWorkout?.exercises)
            ? mergedWorkout.exercises
                .map((exercise) => ({
                    ...exercise,
                    sets: Array.isArray(exercise?.sets) ? exercise.sets.filter((set) => !!set?.isDone) : [],
                }))
                .filter((exercise) => Array.isArray(exercise.sets) && exercise.sets.length > 0)
            : [];
        const calorieWorkout = { ...mergedWorkout, exercises: exercisesForCalories };
        let weightContext = null;
        try {
            const globalUser = global?.userData || null;
            if (globalUser && String(globalUser?.uid || globalUser?.id || globalUser?.userUid) === normalizedUid) {
                weightContext = globalUser;
            }
        } catch {
            weightContext = null;
        }
        if (!weightContext) {
            const publicData = publicSnap.exists() ? publicSnap.data() : {};
            const privateData = privateSnap.exists() ? privateSnap.data() : {};
            weightContext = {
                ...(data || {}),
                ...(publicData || {}),
                privateData: privateData || (data?.privateData ?? null),
            };
        }
        try {
            const weightLb = resolveUserBodyweight(weightContext, null, { measurementsOnly: true });
            const estimate = estimateWorkoutCalories(calorieWorkout, { weightLb, user: weightContext });
            if (Number.isFinite(estimate?.calories)) {
                mergedWorkout.calories = estimate.calories;
            } else if (estimate?.calories === null) {
                mergedWorkout.calories = null;
            }
        } catch {
            mergedWorkout.calories = mergedWorkout?.calories ?? null;
        }

        const updatedTimestamp = Date.now();

        const updatedForFirestore = {
            ...mergedWorkout,
            updatedAt: updatedTimestamp,
        };

        const updatedForClient = {
            ...ensureExercisesAreArrays(mergedWorkout),
            updatedAt: updatedTimestamp,
        };

        const nextWorkoutsForFirestore = [...workouts];
        nextWorkoutsForFirestore[index] = updatedForFirestore;

        const nextWorkoutsForClient = [...workouts];
        nextWorkoutsForClient[index] = updatedForClient;

        const rebuilt = rebuildStatsFromWorkouts(nextWorkoutsForClient);
        const rankFields = buildRankFields(nextWorkoutsForClient, rebuilt.statsHexagon);

        const userUpdatePayload = {
            completedWorkouts: nextWorkoutsForFirestore,
            statsExercises: rebuilt.statsExercises,
            statsHexagon: rebuilt.statsHexagon,
            statsHexagonMeta: {
                lastTrainedByGroup: rebuilt.lastTrainedByGroup,
                updatedAt: serverTimestamp(),
            },
            statsTotalVolume: rebuilt.statsTotalVolume,
            statsTotalHours: rebuilt.statsTotalHours,
            statsTotalWorkouts: rebuilt.statsTotalWorkouts,
            workoutsByDate: rebuilt.workoutsByDate,
            ...rankFields,
        };

        const publicUpdatePayload = {
            completedWorkouts: nextWorkoutsForClient,
            statsExercises: rebuilt.statsExercises,
            statsHexagon: rebuilt.statsHexagon,
            statsHexagonMeta: {
                lastTrainedByGroup: rebuilt.lastTrainedByGroup,
                updatedAt: serverTimestamp(),
            },
            statsTotalVolume: rebuilt.statsTotalVolume,
            statsTotalHours: rebuilt.statsTotalHours,
            statsTotalWorkouts: rebuilt.statsTotalWorkouts,
            workoutsByDate: rebuilt.workoutsByDate,
            ...rankFields,
        };

        const privateUpdatePayload = {
            completedWorkouts: nextWorkoutsForClient,
            statsExercises: rebuilt.statsExercises,
            statsHexagon: rebuilt.statsHexagon,
            statsHexagonMeta: {
                lastTrainedByGroup: rebuilt.lastTrainedByGroup,
                updatedAt: serverTimestamp(),
            },
            statsTotalVolume: rebuilt.statsTotalVolume,
            statsTotalHours: rebuilt.statsTotalHours,
            statsTotalWorkouts: rebuilt.statsTotalWorkouts,
            workoutsByDate: rebuilt.workoutsByDate,
            ...rankFields,
        };

        tx.update(userRef, userUpdatePayload);
        if (publicSnap.exists()) {
            tx.update(publicRef, publicUpdatePayload);
        } else {
            tx.set(publicRef, publicUpdatePayload, { merge: true });
        }
        if (privateSnap.exists()) {
            tx.update(privateRef, privateUpdatePayload);
        } else {
            tx.set(privateRef, privateUpdatePayload, { merge: true });
        }

        const postPidInsideTx = mergedWorkout?.postPid ?? existingWorkout?.postPid ?? existingWorkout?.pid ?? null;

        return {
            updatedWorkout: updatedForClient,
            completedWorkouts: nextWorkoutsForClient,
            statsExercises: rebuilt.statsExercises,
            statsHexagon: rebuilt.statsHexagon,
            statsHexagonMeta: {
                lastTrainedByGroup: rebuilt.lastTrainedByGroup,
                updatedAt: Date.now(),
            },
            statsTotalVolume: rebuilt.statsTotalVolume,
            statsTotalHours: rebuilt.statsTotalHours,
            statsTotalWorkouts: rebuilt.statsTotalWorkouts,
            workoutsByDate: rebuilt.workoutsByDate,
            ...rankFields,
            postPid: postPidInsideTx,
        };
    });

    const { updatedWorkout, postPid, ...rest } = result || {};

    if (postPid && updatedWorkout) {
        try {
            await updateDoc("posts", postPid, {
                workout: updatedWorkout,
                updatedAt: Date.now(),
            });
        } catch (error) {
            if (error?.code === "permission-denied" || error?.code === "not-found") {
                console.warn("updateCompletedWorkout: linked post unreachable", {
                    postPid,
                    code: error?.code,
                });
            } else {
                console.warn("updateCompletedWorkout: failed to update linked post", {
                    postPid,
                    error,
                });
            }
        }
    }

    return { ok: true, updatedWorkout, ...rest };
}
