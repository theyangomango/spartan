import { arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.config";

/**
 * Accept a workout invite by adding the user to the workout, marking the invite, and returning the latest workout seed.
 */
export async function acceptWorkoutInvite({ inviteId, wid, toUid }) {
    const inviteDocId = String(inviteId || "");
    const widStr = String(wid || "");
    const me = String(toUid || "");
    if (!inviteDocId || !widStr || !me) {
        return { seedWorkout: null };
    }

    const inviteRef = doc(db, "workoutInvites", inviteDocId);
    const workoutRef = doc(db, "workouts", widStr);

    try {
        await updateDoc(workoutRef, {
            members: arrayUnion(me),
            updatedAt: serverTimestamp(),
            active: true,
        });
    } catch (err) {
        try {
            await setDoc(
                workoutRef,
                {
                    members: arrayUnion(me),
                    updatedAt: serverTimestamp(),
                    active: true,
                },
                { merge: true }
            );
        } catch {
            // swallow; accept should still proceed to mark invite
        }
    }

    try {
        await updateDoc(inviteRef, { status: "accepted", actedAt: serverTimestamp() });
    } catch (err) {
        try { await setDoc(inviteRef, { status: "accepted", actedAt: serverTimestamp() }, { merge: true }); } catch {}
    }

    let seedWorkout = null;
    try {
        const snap = await getDoc(workoutRef);
        seedWorkout = snap.exists() ? (snap.data() || null) : null;
    } catch {}

    return { seedWorkout };
}

export default acceptWorkoutInvite;
