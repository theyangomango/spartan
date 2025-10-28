import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  computeHexagonFromUserData,
  rebuildStatsFromWorkouts,
  combineStatsExercises,
} from "../../shared/rebuildHexagonStats.js";

try {
  initializeApp();
} catch {}

const db = getFirestore();
const handleArg = process.argv[2];

if (!handleArg) {
  console.error("Usage: node functions/scripts/recomputeHexagonByHandle.js <handle>");
  process.exit(1);
}

async function main() {
  console.log(`Looking up user with handle "${handleArg}"...`);
  const snap = await db.collection("users").where("handle", "==", handleArg).limit(1).get();
  if (snap.empty) {
    console.error(`No user found with handle "${handleArg}".`);
    process.exit(1);
  }

  const docSnap = snap.docs[0];
  const data = docSnap.data() || {};
  const uid = docSnap.id;

  const completedWorkouts = Array.isArray(data?.completedWorkouts) ? data.completedWorkouts : [];
  console.log(`Found user ${uid}. Completed workouts: ${completedWorkouts.length}`);

  const rebuilt = rebuildStatsFromWorkouts(completedWorkouts);
  console.log("Rebuilt statsExercises from completedWorkouts:");
  console.log(JSON.stringify(rebuilt.statsExercises, null, 2));

  const existingStatsExercises = data?.statsExercises || {};
  const { combined, skipped } = combineStatsExercises(existingStatsExercises, rebuilt.statsExercises);
  console.log("Combined statsExercises snapshot (existing + rebuilt):");
  console.log(JSON.stringify(combined, null, 2));
  if (skipped.length) {
    console.warn(`Exercises with no usable data after merge: ${skipped.join(", ")}`);
  }

  const recomputed = computeHexagonFromUserData({
    completedWorkouts,
    statsExercises: existingStatsExercises,
    prevStatsHexagon: {},
  });

  console.log("computeHexagonFromStats outputs:");
  console.log(JSON.stringify({ statsHexagon: recomputed.statsHexagon, lastTrained: recomputed.lastTrainedByGroup }, null, 2));

  await docSnap.ref.set(
    {
      statsExercises: recomputed.statsExercises,
      statsHexagon: recomputed.statsHexagon || {},
      statsHexagonMeta: {
        lastTrainedByGroup: recomputed.lastTrainedByGroup || {},
        updatedAt: FieldValue.serverTimestamp(),
      },
      statsTotalVolume: recomputed.statsTotalVolume,
      statsTotalHours: recomputed.statsTotalHours,
      statsTotalWorkouts: recomputed.statsTotalWorkouts,
      workoutsByDate: recomputed.workoutsByDate,
    },
    { merge: true }
  );

  console.log(`Firestore updated for user ${uid}.`);
}

main()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed to recompute hexagon stats:", err);
    process.exit(1);
  });
