// Default delete flow of a feed post (the post plus the owner's completed workout) and the label of its delete option.

import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import deletePost from "../../../../backend/posts/deletePost";
import deleteCompletedWorkout from "../../../../backend/workouts/deleteCompletedWorkout";
import { emitHexagonUpdate } from "../../../utils/hexagonEvents";
import { emitUserDataUpdate } from "../../../utils/userDataEvents";
import { invalidateFeedCacheForUser } from "../../../helper/feedCache";
import { toMillis } from "./feedPostUtils";

const useFeedPostDelete = ({ workout, isViewerOwner, postPid, postOwnerUid, viewerUid }) => {
    const [pendingDeletePid, setPendingDeletePid] = useState(null);

    const workoutDeleteIdentifier = useMemo(() => {
        if (!workout || typeof workout !== "object") return null;
        const widCandidates = [
            workout?.wid,
            workout?.id,
            workout?.workoutId,
            workout?.pid,
            workout?.postPid,
        ];
        let wid = "";
        for (const value of widCandidates) {
            if (value === undefined || value === null) continue;
            const str = String(value).trim();
            if (str) {
                wid = str;
                break;
            }
        }

        const createdCandidates = [
            workout?.created,
            workout?.createdAt,
            workout?.finishedAt,
            workout?.completedAt,
            workout?.startedAt,
        ];
        let created = 0;
        for (const candidate of createdCandidates) {
            const ms = toMillis(candidate);
            if (ms) {
                created = ms;
                break;
            }
        }

        if (!wid && !created) return null;
        return { wid: wid || null, created: created || 0 };
    }, [workout]);

    const canAutoDeleteWorkout = useMemo(() => Boolean(isViewerOwner && workoutDeleteIdentifier), [isViewerOwner, workoutDeleteIdentifier]);
    const deleteOptionLabel = canAutoDeleteWorkout ? "Delete Post & Workout" : "Delete Post";
    const deleteConfirmTitle = canAutoDeleteWorkout ? "Delete post & workout?" : "Delete post?";
    const deleteConfirmMessage = canAutoDeleteWorkout
        ? "This will delete the post and remove the workout from your history and stats."
        : "This will permanently remove the post and its comments.";

    const runDefaultDelete = useCallback(() => {
        if (!isViewerOwner) return;
        if (!postPid) return;
        if (pendingDeletePid) return;

        const targetUid = postOwnerUid || viewerUid;
        if (!targetUid) return;

        const performDelete = () => {
            if (pendingDeletePid) return;
            setPendingDeletePid(postPid);
            (async () => {
                let postError = null;
                let workoutError = null;

                if (canAutoDeleteWorkout && workoutDeleteIdentifier) {
                    try {
                        const res = await deleteCompletedWorkout(targetUid, workoutDeleteIdentifier);
                        if (res?.ok && global?.userData && String(global.userData.uid) === targetUid) {
                            try {
                                global.userData.completedWorkouts = Array.isArray(res.completedWorkouts) ? res.completedWorkouts : [];
                                global.userData.statsExercises = res.statsExercises || {};
                                global.userData.statsHexagon = res.statsHexagon || {};
                                global.userData.statsHexagonMeta = res.statsHexagonMeta || {};
                                global.userData.statsTotalVolume = res.statsTotalVolume || 0;
                                global.userData.statsTotalHours = res.statsTotalHours || 0;
                                global.userData.statsTotalWorkouts = res.statsTotalWorkouts || 0;
                                global.userData.workoutsByDate = res.workoutsByDate || {};
                                emitHexagonUpdate();
                                emitUserDataUpdate();
                            } catch (error) {
                                console.warn("SimpleFeedPost: failed to update cached workout stats after deletion", error);
                            }
                        }
                        invalidateFeedCacheForUser(targetUid);
                    } catch (error) {
                        workoutError = error;
                        console.error("SimpleFeedPost: deleteCompletedWorkout failed", error);
                    }
                }

                try {
                    await deletePost(postPid, targetUid);
                    invalidateFeedCacheForUser(targetUid);
                    if (targetUid && global?.userData && String(global.userData.uid) === targetUid) {
                        try {
                            if (Array.isArray(global.userData.posts)) {
                                global.userData.posts = global.userData.posts
                                    .map((value) => (value == null ? value : String(value)))
                                    .filter((value) => value && value !== postPid);
                            }
                            if (typeof global.userData.postCount === "number") {
                                global.userData.postCount = Math.max(0, global.userData.postCount - 1);
                            }
                            emitUserDataUpdate();
                        } catch (error) {
                            console.warn("SimpleFeedPost: failed to update cached global.userData posts", error);
                        }
                    }
                } catch (error) {
                    postError = error;
                    console.error("SimpleFeedPost: deletePost failed", error);
                }

                if (postError) {
                    Alert.alert("Unable to delete post", "Please try again in a moment.");
                } else if (workoutError) {
                    Alert.alert(
                        "Workout removal incomplete",
                        "The post was deleted, but the workout is still in your history. Please retry from the workout details screen."
                    );
                }

                setPendingDeletePid((current) => (current === postPid ? null : current));
            })();
        };

        Alert.alert(
            deleteConfirmTitle,
            deleteConfirmMessage,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: canAutoDeleteWorkout ? "Delete Post & Workout" : "Delete",
                    style: "destructive",
                    onPress: () => {
                        if (pendingDeletePid) return;
                        performDelete();
                    },
                },
            ]
        );
    }, [isViewerOwner, postPid, pendingDeletePid, postOwnerUid, viewerUid, canAutoDeleteWorkout, deleteConfirmTitle, deleteConfirmMessage, workoutDeleteIdentifier]);

    return { deleteOptionLabel, runDefaultDelete };
};

export default useFeedPostDelete;
