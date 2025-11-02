import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const USERS_BATCH_SIZE = 500;

try {
  initializeApp();
} catch {
  // App might already be initialised when run via emulator or another script.
}

const db = getFirestore();

function hasEntries(value) {
  return Array.isArray(value) ? value.some(Boolean) : !!value;
}

async function clearBlocksForAllUsers() {
  let processed = 0;
  let mutated = 0;
  let cursor = null;

  // Iterate through every user document in batches.
  // We order by document id to allow cursor pagination via startAfter.
  while (true) {
    let query = db.collection("users").orderBy("__name__").limit(USERS_BATCH_SIZE);
    if (cursor) query = query.startAfter(cursor);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let writesInBatch = 0;

    snapshot.docs.forEach((docSnap) => {
      processed += 1;
      const data = docSnap.data() || {};
      const blocked = data.blocked;
      const blockedBy = data.blockedBy;

      const hasBlocked = hasEntries(blocked);
      const hasBlockedBy = hasEntries(blockedBy);

      if (!hasBlocked && !hasBlockedBy) return;

      batch.update(docSnap.ref, {
        blocked: FieldValue.delete(),
        blockedBy: FieldValue.delete(),
      });

      writesInBatch += 1;
      mutated += 1;
    });

    if (writesInBatch > 0) {
      await batch.commit();
      console.log(`Cleared blocks for ${writesInBatch} user(s) in current batch.`);
    } else {
      console.log("No block data found in this batch chunk; skipping commit.");
    }

    cursor = snapshot.docs[snapshot.docs.length - 1];
  }

  console.log("------");
  console.log(`Processed users: ${processed}`);
  console.log(`Users cleared: ${mutated}`);
  console.log("All block relationships have been removed.");
}

clearBlocksForAllUsers()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("clearAllBlocks failed:", error);
    process.exit(1);
  });
