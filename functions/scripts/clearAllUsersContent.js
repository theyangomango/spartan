import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const USERS_BATCH_SIZE = 400;
const DELETE_BATCH_SIZE = 500;

try {
  initializeApp();
} catch {
  // ignore: app may already be initialised when running via emulator
}

const db = getFirestore();

const ZERO_HEXAGON = {
  overall: 0,
  abs: 0,
  legs: 0,
  chest: 0,
  back: 0,
  shoulders: 0,
  arms: 0,
};

const DEFAULT_STATS = {
  totalReps: 0,
  totalVolume: 0,
  totalTime: 0,
  workoutCount: 0,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deleteCollection(collectionPath, batchSize = DELETE_BATCH_SIZE) {
  let deleted = 0;

  while (true) {
    const snapshot = await db
      .collection(collectionPath)
      .orderBy("__name__")
      .limit(batchSize)
      .get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();

    deleted += snapshot.size;
    console.log(`Deleted ${deleted} document(s) from ${collectionPath}...`);

    // Avoid hammering Firestore with rapid deletes.
    await sleep(50);
  }

  console.log(`Finished deleting documents from ${collectionPath}. Total removed: ${deleted}`);
}

async function resetUsers(batchSize = USERS_BATCH_SIZE) {
  let processed = 0;
  let lastDoc = null;

  while (true) {
    let query = db.collection("users").orderBy("__name__").limit(batchSize);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();

    snapshot.docs.forEach((docSnap) => {
      batch.set(
        docSnap.ref,
        {
          posts: [],
          postRecords: {},
          feedPosts: [],
          exploreFeedPosts: [],
          postCount: 0,
          completedWorkouts: [],
          currentWorkout: null,
          workouts: [],
          statsExercises: {},
          statsHexagon: { ...ZERO_HEXAGON },
          statsHexagonMeta: {},
          hexagonStats: {},
          hexagonStatsMeta: {},
          statsTotalHours: 0,
          statsTotalVolume: 0,
          statsTotalWorkouts: 0,
          stats: { ...DEFAULT_STATS },
        },
        { merge: true }
      );
    });

    await batch.commit();

    processed += snapshot.size;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(`Reset posts/workouts/stats for ${processed} user(s)...`);

    await sleep(50);
  }

  console.log(`Finished resetting user documents. Total users processed: ${processed}`);
}

async function main() {
  console.log("\n🚿 Resetting Spartan user-generated data...");
  await deleteCollection("posts");
  await deleteCollection("workouts");
  const globalPostsRef = db.collection('global').doc('posts');
  await globalPostsRef.set({ PIDs: [], ownerMap: {} }, { merge: false }).catch(async () => {
    await globalPostsRef.set({ PIDs: [], ownerMap: {} });
  });
  await resetUsers();
  console.log("\n✅ Done resetting posts, workouts, and stats for all users.");
}

main().catch((error) => {
  console.error("clearAllUsersContent failed:", error);
  process.exit(1);
});
