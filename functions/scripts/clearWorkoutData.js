import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const BATCH_SIZE = 400;

try {
  initializeApp();
} catch {}

const db = getFirestore();

async function clearWorkoutData() {
  let processed = 0;
  let lastDoc = null;

  // Walk the users collection in deterministic order to avoid skips.
  while (true) {
    let query = db.collection("users").orderBy("__name__").limit(BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((docSnap) => {
      batch.set(
        docSnap.ref,
        {
          completedWorkouts: [],
          statsExercises: {},
          statsTotalHours: 0,
          statsTotalVolume: 0,
          statsTotalWorkouts: 0,
          hexagonStats: {},
          hexagonStatsMeta: {},
          statsHexagon: {
            overall: 0,
            abs: 0,
            legs: 0,
            chest: 0,
            back: 0,
            shoulders: 0,
            arms: 0,
          },
          statsHexagonMeta: {},
        },
        { merge: true }
      );
    });

    await batch.commit();

    processed += snapshot.size;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(`Cleared workout stats for ${processed} user(s)...`);
  }

  console.log(`Completed. Total users processed: ${processed}`);
}

clearWorkoutData().catch((error) => {
  console.error("clearWorkoutData failed:", error);
  process.exit(1);
});
