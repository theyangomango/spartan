// Duration label of a feed post's workout; for a live post it is re-computed every second from the workout's start time.

import { useEffect, useRef, useState } from "react";

import { formatDuration } from "../workoutDisplay";
import { getMillis } from "./feedPostUtils";

const useLiveWorkoutDuration = (isLivePost, workout) => {
    const liveDurationRef = useRef(0);
    const [, setLiveDurationTick] = useState(0);

    useEffect(() => {
        if (!isLivePost) return undefined;
        const startedAt = getMillis(workout?.startedAt ?? workout?.createdAt ?? workout?.created);
        if (!startedAt) return undefined;

        const DRIFT_MS = 500; // keep feed timer in sync with ActiveWorkoutModal
        const update = () => {
            const elapsed = Math.max(0, Date.now() - startedAt - DRIFT_MS);
            liveDurationRef.current = elapsed;
            setLiveDurationTick(Date.now());
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [isLivePost, workout?.startedAt, workout?.createdAt, workout?.created]);

    const durationLabel = (() => {
        if (!isLivePost) return formatDuration(workout?.duration);
        const base = Math.max(0, Number(workout?.duration) || 0);
        const elapsed = Math.max(base, liveDurationRef.current || 0);
        return formatDuration(elapsed);
    })();

    return durationLabel;
};

export default useLiveWorkoutDuration;
