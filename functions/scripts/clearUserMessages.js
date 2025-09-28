import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const BATCH_SIZE = 400;

try {
  initializeApp();
} catch {}

const db = getFirestore();

async function clearUserMessages() {
  let processed = 0;
  let lastDoc = null;

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
          messages: [],
          unreadMessagesCount: 0,
        },
        { merge: true }
      );
    });

    await batch.commit();

    processed += snapshot.size;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(`Cleared messages for ${processed} user(s)...`);
  }

  console.log(`Finished clearing messages. Total users processed: ${processed}`);
}

clearUserMessages().catch((error) => {
  console.error("clearUserMessages failed:", error);
  process.exit(1);
});
