import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const USERS_BATCH_SIZE = 400;
const BATCH_WRITE_LIMIT = 400;
const DEFAULT_STALE_HOURS = 6;
const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toMillis = (value) => {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object") {
    if (typeof value.toMillis === "function") {
      try {
        return value.toMillis();
      } catch {
        // fall through
      }
    }
    const seconds = Number(value.seconds ?? value._seconds);
    if (Number.isFinite(seconds)) {
      const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
      return seconds * 1000 + Math.floor(nanos / 1e6);
    }
  }
  return null;
};

try {
  initializeApp();
} catch {
  // Ignore double initialisation when running in emulator or tests.
}

const db = getFirestore();

const resolveCutoffMillis = () => {
  const arg = Number(process.argv[2]);
  const hours = Number.isFinite(arg) && arg > 0 ? arg : DEFAULT_STALE_HOURS;
  return {
    hours,
    cutoff: Date.now() - hours * 60 * 60 * 1000,
  };
};

async function cleanupWorkouts(entries) {
  if (!entries.length) return;
  const filtered = entries.filter(({ wid }) => wid);
  if (!filtered.length) return;

  console.log(`\n🧹 Cleaning up ${filtered.length} stale workout document(s)...`);
  let cleaned = 0;

  for (const group of chunk(filtered, 20)) {
    await Promise.all(
      group.map(async ({ wid, uid }) => {
        const widStr = String(wid);
        const uidStr = String(uid);
        const workoutRef = db.collection("workouts").doc(widStr);
        try {
          await workoutRef.collection("live").doc(uidStr).delete();
        } catch (err) {
          if (err?.code !== 5) {
            console.log(`  • live delete failed (${widStr}/${uidStr}):`, err?.message || err);
          }
        }
        try {
          await workoutRef.set(
            {
              active: false,
              updatedAt: FieldValue.serverTimestamp(),
              members: FieldValue.arrayRemove(uidStr),
              users: FieldValue.arrayRemove(uidStr),
            },
            { merge: true }
          );
        } catch (err) {
          console.log(`  • workout cleanup failed (${widStr}):`, err?.message || err);
        }
        cleaned += 1;
      })
    );
    await sleep(50);
  }

  console.log(`✅ Finished cleaning ${cleaned} workout document(s).\n`);
}

async function main() {
  const { hours, cutoff } = resolveCutoffMillis();
  console.log(`\n🧼 Clearing currentWorkout entries older than ${hours} hour(s)...`);

  let processedUsers = 0;
  let clearedUsers = 0;
  let lastDoc = null;
  let batch = db.batch();
  let batchCount = 0;

  const cleanupQueue = [];

  while (true) {
    let query = db.collection("users").orderBy("__name__").limit(USERS_BATCH_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() || {};
      const currentWorkout = data.currentWorkout;
      if (!currentWorkout || typeof currentWorkout !== "object") {
        continue;
      }

      const createdMs =
        toMillis(currentWorkout.created) ??
        toMillis(currentWorkout.createdAt) ??
        toMillis(currentWorkout.created_at) ??
        toMillis(currentWorkout.startedAt) ??
        toMillis(currentWorkout.started_at);
      const updatedMs =
        toMillis(currentWorkout.updatedAt) ??
        toMillis(currentWorkout.updated_at) ??
        null;
      const referenceMs = createdMs ?? updatedMs;
      const wid = currentWorkout.wid ? String(currentWorkout.wid) : "";

      const isStale = !referenceMs || referenceMs < cutoff;
      if (!isStale) continue;

      batch.set(
        docSnap.ref,
        {
          currentWorkout: null,
        },
        { merge: true }
      );
      batchCount += 1;
      clearedUsers += 1;

      if (wid) {
        cleanupQueue.push({ wid, uid: docSnap.id });
      }

      if (batchCount >= BATCH_WRITE_LIMIT) {
        await batch.commit();
        console.log(`  • Cleared ${batchCount} stale currentWorkout entr${batchCount === 1 ? "y" : "ies"}...`);
        batch = db.batch();
        batchCount = 0;
        await sleep(50);
      }
    }

    processedUsers += snapshot.size;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(`Processed ${processedUsers} user(s)...`);
    await sleep(50);
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  • Cleared ${batchCount} stale currentWorkout entr${batchCount === 1 ? "y" : "ies"}...`);
  }

  console.log(`\n✅ Cleared ${clearedUsers} user currentWorkout entr${clearedUsers === 1 ? "y" : "ies"} out of ${processedUsers} user(s) scanned.`);

  await cleanupWorkouts(cleanupQueue);

  console.log("🎉 Done.\n");
}

main().catch((error) => {
  console.error("clearStaleCurrentWorkouts failed:", error);
  process.exit(1);
});
