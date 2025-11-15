import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const USERS_BATCH_SIZE = 400;

try {
    initializeApp();
} catch {
    // already initialized
}

const db = getFirestore();

const toUid = (value) => {
    if (value === undefined || value === null) return null;
    try {
        const str = String(value).trim();
        return str ? str : null;
    } catch {
        return null;
    }
};

const rebuildEntries = (entries) => {
    if (!Array.isArray(entries) || entries.length === 0) return [];
    const sanitized = entries
        .map((entry) => {
            const uid = toUid(entry?.uid ?? entry);
            if (!uid) return null;
            return uid;
        })
        .filter(Boolean);
    const count = sanitized.length;
    if (count === 0) return [];
    return sanitized.map((uid) => ({ uid, rank: count }));
};

const rebuildEntriesMap = (map) => {
    if (!map || typeof map !== "object") return null;
    const next = {};
    Object.entries(map).forEach(([key, scope]) => {
        if (!scope || typeof scope !== "object") return;
        const entries = rebuildEntries(scope.entries);
        next[key] = { ...scope, entries };
    });
    return next;
};

const rebuildBranch = (branch) => {
    if (!branch || typeof branch !== "object") return null;
    const next = {};
    if (branch.exercises && typeof branch.exercises === "object") {
        const exercises = rebuildEntriesMap(branch.exercises);
        if (exercises && Object.keys(exercises).length) {
            next.exercises = exercises;
        }
    }
    if (branch.hex && typeof branch.hex === "object") {
        const hex = rebuildEntriesMap(branch.hex);
        if (hex && Object.keys(hex).length) {
            next.hex = hex;
        }
    }
    return Object.keys(next).length ? next : null;
};

const rebuildLastRanks = (lastRanks) => {
    if (!lastRanks || typeof lastRanks !== "object") return null;
    const next = {};
    Object.entries(lastRanks).forEach(([key, value]) => {
        if (key === "tribes") {
            const tribeSnapshots = {};
            Object.entries(value || {}).forEach(([tribeId, tribeData]) => {
                const rebuilt = rebuildBranch(tribeData);
                if (rebuilt) {
                    tribeSnapshots[tribeId] = rebuilt;
                }
            });
            if (Object.keys(tribeSnapshots).length) {
                next.tribes = tribeSnapshots;
            }
        } else {
            const rebuilt = rebuildBranch(value);
            if (rebuilt) {
                next[key] = rebuilt;
            }
        }
    });
    return Object.keys(next).length ? next : null;
};

async function resetAllLastRanks(batchSize = USERS_BATCH_SIZE) {
    let lastDoc = null;
    let processed = 0;
    let updated = 0;

    while (true) {
        let query = db.collection("usersPublic").orderBy("__name__").limit(batchSize);
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }
        const snapshot = await query.get();
        if (snapshot.empty) break;

        const batch = db.batch();
        let writes = 0;

        snapshot.docs.forEach((docSnap) => {
            processed += 1;
            const data = docSnap.data() || {};
            const rebuilt = rebuildLastRanks(data?.lastRanks);
            const hadLastRanks = Object.prototype.hasOwnProperty.call(data, "lastRanks");
            if (!rebuilt && !hadLastRanks) return;

            const payload = {};
            if (!rebuilt) {
                payload.lastRanks = FieldValue.delete();
                payload.lastRanksVersion = FieldValue.delete();
            } else {
                payload.lastRanks = rebuilt;
                payload.lastRanksVersion = 4;
            }
            payload.lastRanksUpdatedAt = FieldValue.serverTimestamp();

            batch.set(
                docSnap.ref,
                payload,
                { merge: true }
            );
            writes += 1;
            updated += 1;
        });

        if (writes > 0) {
            await batch.commit();
            console.log(`Updated ${updated} user(s) so far (processed ${processed}).`);
        }

        lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    console.log(`Finished resetting last ranks. Users processed: ${processed}. Updated: ${updated}.`);
}

resetAllLastRanks().catch((err) => {
    console.error("resetLeaderboardLastRanks failed:", err);
    process.exit(1);
});
