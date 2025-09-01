// helper/leaveSharedWorkout.js
import { doc, getDoc, updateDoc, deleteDoc, arrayRemove } from "firebase/firestore";
import { db } from "../../firebase.config";

/**
 * Remove a user from a shared workout and clear their presence.
 * Safe to call even if the workout/user is already gone.
 */
export async function leaveSharedWorkout(wid, uid) {
    try {
        const widStr = String(wid || "");
        const uidStr = String(uid || "");
        if (!widStr || !uidStr) return;

        // 1) Remove from members[]
        try {
            await updateDoc(doc(db, "workouts", widStr), { members: arrayRemove(uidStr) });
        } catch { /* ignore */ }

        // 2) Remove presence doc
        try {
            await deleteDoc(doc(db, "workouts", widStr, "live", uidStr));
        } catch { /* ignore */ }

        // 3) If no members left, mark inactive (best-effort)
        try {
            const snap = await getDoc(doc(db, "workouts", widStr));
            const data = snap.exists() ? snap.data() : {};
            const members = Array.isArray(data?.members) ? data.members : [];
            if (!members.length) {
                try { await updateDoc(doc(db, "workouts", widStr), { active: false }); } catch { /* ignore */ }
            }
        } catch { /* ignore */ }
    } catch { /* ignore */ }
}
