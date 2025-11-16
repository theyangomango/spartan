import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
  console.warn(
    "Unable to enable ignoreUndefinedProperties; continuing anyway",
    err?.message || err
  );
}

async function copyStats(docSnap) {
  const data = docSnap.data() || {};
  const statsHexagon = data?.statsHexagon;
  const statsExercises = data?.statsExercises;

  const payload = {};
  if (statsHexagon && typeof statsHexagon === "object") {
    payload.statsHexagon = statsHexagon;
  }
  if (statsExercises && typeof statsExercises === "object") {
    payload.statsExercises = statsExercises;
  }

  if (!Object.keys(payload).length) {
    return false;
  }

  const publicRef = db.collection("usersPublic").doc(docSnap.id);
  await publicRef.set(payload, { merge: true });
  return true;
}

async function main() {
  let processed = 0;
  let updated = 0;
  let lastDoc = null;

  console.log("\n🔁 Copying statsHexagon and statsExercises from users to usersPublic...");

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
        const didUpdate = await copyStats(docSnap);
        if (didUpdate) {
          updated += 1;
        }
      } catch (err) {
        console.warn(
          `⚠️  Failed to copy stats for user ${docSnap.id}: ${err?.message || err}`
        );
      }

      if (processed % 25 === 0) {
        console.log(`   • Processed ${processed} users...`);
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  console.log(
    `\n✅ Done copying stats. Users processed: ${processed}. Users updated: ${updated}.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("copyStatsHexagonToUsersPublic failed:", err);
    process.exit(1);
  });
