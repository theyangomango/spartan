import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  computeHexagonFromUserData,
} from "../shared/rebuildHexagonStats.js";

const USERS_BATCH_SIZE = 200;

try {
  initializeApp();
} catch {
  // App may already be initialised when running via emulator/CLI
}

const db = getFirestore();
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (err) {
  console.warn("Unable to enable ignoreUndefinedProperties; continuing anyway", err?.message || err);
}

async function recomputeForUser(docSnap) {
  const data = docSnap.data() || {};
  const completedWorkouts = Array.isArray(data?.completedWorkouts) ? data.completedWorkouts : [];
  const statsExercises = data?.statsExercises || {};
  const prevStatsHexagon = data?.statsHexagon || {};

  const result = computeHexagonFromUserData({
    completedWorkouts,
    statsExercises,
    prevStatsHexagon,
  });

  const updateData = {
    statsExercises: result.statsExercises || {},
    statsHexagon: result.statsHexagon || {},
    statsHexagonMeta: {
      lastTrainedByGroup: result.lastTrainedByGroup || {},
      updatedAt: FieldValue.serverTimestamp(),
    },
    statsTotalVolume: result.statsTotalVolume ?? 0,
    statsTotalHours: result.statsTotalHours ?? 0,
    statsTotalWorkouts: result.statsTotalWorkouts ?? 0,
    workoutsByDate: result.workoutsByDate || {},
  };

  await docSnap.ref.set(updateData, { merge: true });
}

async function main() {
  let processed = 0;
  let updated = 0;
  let lastDoc = null;

  console.log("\n🔁 Recomputing hexagon stats for all users...");

  while (true) {
    let query = db.collection("users").orderBy("__name__").limit(USERS_BATCH_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const docSnap of snapshot.docs) {
      processed += 1;
      try {
        await recomputeForUser(docSnap);
        updated += 1;
      } catch (err) {
        console.warn(
          `⚠️  Failed to recompute for user ${docSnap.id}: ${err?.message || err}`
        );
      }

      if (processed % 25 === 0) {
        console.log(`   • Processed ${processed} users...`);
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  console.log(
    `\n✅ Finished recomputing hexagon stats. Users processed: ${processed}. Updated: ${updated}.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("recomputeAllHexagonStats failed:", err);
    process.exit(1);
  });
