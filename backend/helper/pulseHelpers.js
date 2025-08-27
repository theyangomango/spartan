// backend/helper/pulseHelpers.js
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
} from "firebase/firestore";
import { db } from "../../firebase.config";

// Write one pulse
export async function emitPulse(uid, pulse) {
    if (!uid || !pulse) return;
    const ts = pulse.ts ?? Date.now();
    await addDoc(collection(db, "users", uid, "pulse"), { ...pulse, ts });
}

// Seed a few demo pulses for followed users that have none
export async function seedDemoPulses(currentUid, following = []) {
    if (!currentUid || !Array.isArray(following) || following.length === 0) return;

    const choices = [
        { type: "prs", detail: "3 PRs" },
        { type: "1rm", detail: "new 1RM" },
        { type: "streak", detail: "12 days" },
        { type: "milestone", detail: "Bench 225×1" },
        { type: "macro", detail: "Hit macros" },
    ];

    const ids = following.slice(0, 8);
    await Promise.all(
        ids.map(async (uid, i) => {
            try {
                // Skip if they already have a pulse
                const q = query(
                    collection(db, "users", uid, "pulse"),
                    orderBy("ts", "desc"),
                    limit(1)
                );
                const snap = await getDocs(q);
                if (!snap.empty) return;

                let basics = { name: "", handle: "", pfpVersion: 0 };
                const u = await getDoc(doc(db, "users", uid));
                if (u.exists()) {
                    const d = u.data();
                    basics = {
                        name: d?.name ?? "",
                        handle: d?.handle ?? "",
                        pfpVersion: d?.pfpVersion ?? 0,
                    };
                }

                const pick = choices[i % choices.length];
                await emitPulse(uid, {
                    ...basics,
                    ...pick,
                    ts: Date.now() - (i + 1) * 1000 * 60 * 17, // staggered for nice sorting
                });
            } catch { }
        })
    );
}
