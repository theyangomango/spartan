import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const DELETE_BATCH_SIZE = 500;
const USERS_BATCH_SIZE = 400;

try {
  initializeApp();
} catch {
  // ignore: app may already be initialised when run via emulator
}

const db = getFirestore();

const ZERO_HEX = {
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normaliseHandle = (rawHandle) => {
  if (rawHandle === null || rawHandle === undefined) return "";
  const trimmed = String(rawHandle).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
};

const findUserByHandle = async (rawHandle) => {
  const handle = normaliseHandle(rawHandle);
  if (!handle) {
    throw new Error("A non-empty handle is required.");
  }

  const candidates = [
    { field: "handle", value: handle },
    { field: "handle", value: `@${handle}` },
    { field: "handle", value: handle.toLowerCase() },
    { field: "handle_lower", value: handle.toLowerCase() },
    { field: "username", value: handle },
    { field: "username_lower", value: handle.toLowerCase() },
    { field: "tag", value: handle },
  ];

  const tried = new Set();
  for (const { field, value } of candidates) {
    if (!value || tried.has(`${field}:${value}`)) continue;
    tried.add(`${field}:${value}`);
    const snapshot = await db.collection("users").where(field, "==", value).limit(2).get();
    if (snapshot.empty) continue;
    if (snapshot.size > 1) {
      throw new Error(`Multiple users matched by ${field} = "${value}". Aborting.`);
    }
    return snapshot.docs[0];
  }

  throw new Error(`No user found for handle "${rawHandle}".`);
};

const deleteUserPosts = async (uid, batchSize = DELETE_BATCH_SIZE) => {
  const removed = [];
  let total = 0;

  while (true) {
    const snapshot = await db.collection("posts").where("uid", "==", uid).limit(batchSize).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((docSnap) => {
      removed.push(docSnap.id);
      batch.delete(docSnap.ref);
    });
    await batch.commit();

    total += snapshot.size;
    console.log(`Deleted ${total} post(s) for user ${uid} so far...`);

    await sleep(50);
  }

  return removed;
};

const deleteUserWorkouts = async (uid, batchSize = DELETE_BATCH_SIZE) => {
  const removedSet = new Set();
  const removed = [];
  let total = 0;

  const filters = [
    { field: "creatorUID", op: "==", value: uid },
    { field: "creatorUid", op: "==", value: uid },
    { field: "uid", op: "==", value: uid },
    { field: "userUid", op: "==", value: uid },
    { field: "ownerUid", op: "==", value: uid },
    { field: "users", op: "array-contains", value: uid },
  ];

  for (const filter of filters) {
    while (true) {
      const snapshot = await db
        .collection("workouts")
        .where(filter.field, filter.op, filter.value)
        .limit(batchSize)
        .get();

      if (snapshot.empty) break;

      const batch = db.batch();
      let pending = 0;
      snapshot.docs.forEach((docSnap) => {
        if (removedSet.has(docSnap.id)) return;
        removedSet.add(docSnap.id);
        removed.push(docSnap.id);
        batch.delete(docSnap.ref);
        pending += 1;
      });

      if (!pending) break;

      await batch.commit();
      total += pending;
      console.log(`Deleted ${total} workout(s) for user ${uid} so far...`);
      await sleep(50);
    }
  }

  return removed;
};

const cleanGlobalPosts = async (pidList, uid) => {
  if (!pidList.length) return { removedFromGlobal: 0, removedFromOwnerMap: 0 };

  const globalPostsRef = db.collection("global").doc("posts");

  return db.runTransaction(async (txn) => {
    const snap = await txn.get(globalPostsRef).catch(() => null);
    if (!snap || !snap.exists) return { removedFromGlobal: 0, removedFromOwnerMap: 0 };

    const data = snap.data() || {};
    const currentPids = Array.isArray(data?.PIDs) ? data.PIDs : [];
    const ownerMap =
      data?.ownerMap && typeof data.ownerMap === "object" ? { ...data.ownerMap } : {};

    const removals = new Set(pidList.map((id) => String(id)));
    if (uid) {
      Object.entries(ownerMap).forEach(([pid, owner]) => {
        if (removals.has(pid)) return;
        if (owner === uid) {
          removals.add(pid);
          return;
        }
        if (owner && typeof owner === "object") {
          const ownerUid =
            owner.uid ??
            owner.ownerUid ??
            owner.creatorUid ??
            owner.creatorUID ??
            owner.userUid ??
            null;
          if (ownerUid && String(ownerUid) === uid) {
            removals.add(pid);
          }
        }
      });
    }

    if (!removals.size) return { removedFromGlobal: 0, removedFromOwnerMap: 0 };

    const updatedPids = currentPids.filter((pid) => !removals.has(String(pid)));
    let ownerRemoved = 0;
    removals.forEach((pid) => {
      if (ownerMap[pid] !== undefined) {
        delete ownerMap[pid];
        ownerRemoved += 1;
      }
    });

    txn.set(
      globalPostsRef,
      {
        ...(updatedPids.length !== currentPids.length ? { PIDs: updatedPids } : {}),
        ...(ownerRemoved ? { ownerMap } : {}),
      },
      { merge: true }
    );

    return {
      removedFromGlobal: currentPids.length - updatedPids.length,
      removedFromOwnerMap: ownerRemoved,
    };
  });
};

const cleanGlobalExplorePosts = async (pidList) => {
  if (!pidList.length) return 0;
  const pidSet = new Set(pidList.map((id) => String(id)));
  const exploreRef = db.collection("global").doc("explorePosts");

  return db.runTransaction(async (txn) => {
    const snap = await txn.get(exploreRef).catch(() => null);
    if (!snap || !snap.exists) return 0;
    const data = snap.data() || {};
    const arr = Array.isArray(data?.PIDs) ? data.PIDs : [];
    const filtered = arr.filter((pid) => !pidSet.has(String(pid)));
    if (filtered.length === arr.length) return 0;
    txn.set(exploreRef, { PIDs: filtered }, { merge: true });
    return arr.length - filtered.length;
  });
};

const scrubPostReferences = async (pidList, excludeUid) => {
  if (!pidList.length) return 0;
  const pidSet = new Set(pidList.map((id) => String(id)));
  let processed = 0;
  let lastDoc = null;
  let updated = 0;

  while (true) {
    let query = db.collection("users").orderBy("__name__").limit(USERS_BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let batchWrites = 0;
    snapshot.docs.forEach((docSnap) => {
      const uid = docSnap.id;
      const data = docSnap.data() || {};
      const updates = {};
      let touched = false;

      const pruneArray = (arr) => {
        if (!Array.isArray(arr) || !arr.length) return { changed: false, value: arr || [] };
        const filtered = arr.filter((entry) => {
          if (entry === null || entry === undefined) return false;
          if (typeof entry === "string" || typeof entry === "number") {
            return !pidSet.has(String(entry));
          }
          if (typeof entry === "object") {
            const pid = entry?.pid ?? entry?.id ?? null;
            return !pid || !pidSet.has(String(pid));
          }
          return true;
        });
        return { changed: filtered.length !== arr.length, value: filtered };
      };

      const pruneMap = (record) => {
        if (!record || typeof record !== "object") return { changed: false, value: record || {} };
        const next = { ...record };
        let changed = false;
        pidSet.forEach((pid) => {
          if (Object.prototype.hasOwnProperty.call(next, pid)) {
            delete next[pid];
            changed = true;
          }
        });
        return { changed, value: changed ? next : record };
      };

      const targets = [
        ["savedPosts", pruneArray],
        ["feedPosts", pruneArray],
        ["exploreFeedPosts", pruneArray],
        ["posts", pruneArray],
        ["postRecords", pruneMap],
      ];

      targets.forEach(([key, fn]) => {
        const res = fn(data?.[key]);
        if (res.changed) {
          updates[key] = res.value;
          touched = true;
        }
      });

      if (uid === excludeUid) {
        updates.posts = [];
        updates.feedPosts = [];
        updates.exploreFeedPosts = [];
        touched = true;
      }

      if (touched) {
        batch.set(docSnap.ref, updates, { merge: true });
        batchWrites += 1;
      }
    });

    if (batchWrites) {
      await batch.commit();
      updated += batchWrites;
      await sleep(50);
    }

    processed += snapshot.size;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  return updated;
};

const resetUserDocument = async (userRef) => {
  await userRef.set(
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
      statsHexagon: { ...ZERO_HEX },
      statsHexagonMeta: {
        updatedAt: FieldValue.serverTimestamp(),
        lastTrainedByGroup: {},
      },
      hexagonStats: {},
      hexagonStatsMeta: {},
      statsTotalHours: 0,
      statsTotalVolume: 0,
      statsTotalWorkouts: 0,
      stats: { ...DEFAULT_STATS },
    },
    { merge: true }
  );
};

const main = async () => {
  const [, , handleArg] = process.argv;
  if (!handleArg) {
    console.error("Usage: node functions/scripts/clearUserContentByHandle.js <handle>");
    process.exit(1);
  }

  console.log(`\n🧹 Resetting Spartan content for handle "${handleArg}" (user retained)...`);

  const userDoc = await findUserByHandle(handleArg);
  const uid = userDoc.id;
  const userRef = userDoc.ref;
  const resolvedHandle = normaliseHandle(userDoc.data()?.handle || handleArg);

  console.log(`Found user ${uid} (${resolvedHandle || "unknown handle"}). Clearing posts/workouts...`);

  const removedPosts = await deleteUserPosts(uid);
  const removedWorkouts = await deleteUserWorkouts(uid);

  const postCleanup = await cleanGlobalPosts(removedPosts, uid);
  const exploreCleanup = await cleanGlobalExplorePosts(removedPosts);
  const scrubbedUsers = await scrubPostReferences(removedPosts, uid);

  await resetUserDocument(userRef);

  console.log("\n✅ Single-user reset summary:");
  console.log(`   • Posts deleted: ${removedPosts.length}`);
  console.log(`   • Workouts deleted: ${removedWorkouts.length}`);
  console.log(`   • Global post list removals: ${postCleanup.removedFromGlobal}`);
  console.log(`   • Global ownerMap entries removed: ${postCleanup.removedFromOwnerMap}`);
  console.log(`   • Explore post list removals: ${exploreCleanup}`);
  console.log(`   • Other user documents scrubbed: ${scrubbedUsers}`);
  console.log(`   • User stats/posts/workouts reset in user doc.`);
  console.log(`\n🎯 Completed reset for ${resolvedHandle || handleArg} (account retained).`);
};

main().catch((error) => {
  console.error("clearUserContentByHandle failed:", error);
  process.exit(1);
});
