// Tracks a signature of the user's completed workouts so the day pager re-renders when they change.
import { useState, useEffect } from 'react';

import { subscribeUserData } from '../../utils/userDataEvents';
import { computeCompletedWorkoutsSignature } from './macroDayUtils';

export default function useCompletedWorkoutsSignature() {
    const [completedWorkoutsSig, setCompletedWorkoutsSig] = useState(() =>
        computeCompletedWorkoutsSignature(global?.userData?.completedWorkouts)
    );

    useEffect(() => {
        const unsubscribe = subscribeUserData((payload) => {
            const nextSig = computeCompletedWorkoutsSignature(payload?.completedWorkouts);
            setCompletedWorkoutsSig((prev) => (prev === nextSig ? prev : nextSig));
        });
        return () => {
            try { unsubscribe?.(); } catch { }
        };
    }, []);

    return completedWorkoutsSig;
}
