import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const USERS_BATCH_SIZE = 400;

try {
  initializeApp();
} catch {
  // ignore: app may already be initialised when running via emulator
}

const db = getFirestore();

function toUid(value) {
  if (value === undefined || value === null) return null;
  try {
    const str = String(value).trim();
    return str ? str : null;
  } catch {
    return null;
  }
}

function getFollowingCount(data) {
  const arr = Array.isArray(data?.following) ? data.following : [];
  const set = new Set();
  arr.forEach((entry) => {
    const uid = toUid(entry?.uid ?? entry?.id ?? entry);
    if (uid) set.add(uid);
  });
  return set.size;
}

function normalizeLastRanks(structure) {
  const empty = { exercises: {}, hex: {} };
  if (!structure || typeof structure !== "object") return empty;

  const normalized = { exercises: {}, hex: {} };
  const hasExercises = Object.prototype.hasOwnProperty.call(structure, "exercises");
  const hasHex = Object.prototype.hasOwnProperty.call(structure, "hex");

  if (hasExercises || hasHex) {
    if (hasExercises && structure.exercises && typeof structure.exercises === "object") {
      normalized.exercises = structure.exercises;
    }
    if (hasHex && structure.hex && typeof structure.hex === "object") {
      normalized.hex = structure.hex;
    }
    return normalized;
  }

  // Legacy shape (top-level exercises only)
  normalized.exercises = structure;
  return normalized;
}

function fillWithCounts(branch, counts, snapshotId) {
  const output = {};
  Object.entries(branch || {}).forEach(([key, value]) => {
    if (!value || typeof value !== "object") return;
    const scopes = {};
    Object.keys(value).forEach((scopeKey) => {
      const normalizedScope = String(scopeKey);
      let size = counts.totalUsers;
      if (normalizedScope === "following") {
        size = counts.following;
      } else if (normalizedScope === "global") {
        size = counts.totalUsers;
      } else if (counts.tribeSizes.has(normalizedScope)) {
        size = counts.tribeSizes.get(normalizedScope);
      }
      if (Number.isFinite(size) && size > 0) {
        scopes[normalizedScope] = {
          rank: size,
          participantCount: size,
          snapshotId,
          membershipSignature: null,
        };
      }
    });
    if (Object.keys(scopes).length > 0) {
      output[key] = scopes;
    }
  });
  return output;
}

async function loadTotalUserCount() {
  try {
    const snap = await db.collection("users").count().get();
    const total = Number(snap.data()?.count ?? 0);
    return Number.isFinite(total) && total > 0 ? total : 0;
  } catch (err) {
    console.warn("setLastRanksToCounts: count() failed, falling back to iterative count", err?.message || err);
    return 0;
  }
}

async function loadTribeSizes() {
  const map = new Map();
  try {
    const snap = await db.collection("tribes").get();
    snap.forEach((docSnap) => {
      const arr = Array.isArray(docSnap.data()?.members) ? docSnap.data().members : [];
      const unique = new Set();
      arr.forEach((entry) => {
        const uid = toUid(entry?.uid ?? entry?.id ?? entry);
        if (uid) unique.add(uid);
      });
      if (unique.size > 0) {
        map.set(docSnap.id, unique.size);
      }
    });
  } catch (err) {
    console.warn("setLastRanksToCounts: failed to load tribes", err?.message || err);
  }
  return map;
}

async function setAllLastRanksToCounts(batchSize = USERS_BATCH_SIZE) {
  const totalUsersCountFromCount = await loadTotalUserCount();
  const tribeSizes = await loadTribeSizes();
  const snapshotId = new Date().toISOString();
  let processedDocs = 0;
  let updatedDocs = 0;
  let lastDoc = null;
  let effectiveTotalUsers = totalUsersCountFromCount;

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
    let writesInBatch = 0;

    snapshot.docs.forEach((docSnap) => {
      processedDocs += 1;
      if (!effectiveTotalUsers) {
        effectiveTotalUsers = processedDocs; // fallback when count() unavailable
      }
      const data = docSnap.data() || {};
      const original = data.lastRanks;
      if (!original || typeof original !== "object") {
        return;
      }

      const normalized = normalizeLastRanks(original);
      const followingCount = getFollowingCount(data);
      const counts = {
        totalUsers: totalUsersCountFromCount || effectiveTotalUsers,
        following: Math.max(1, followingCount + 1),
        tribeSizes,
      };
      const exercises = fillWithCounts(normalized.exercises, counts, snapshotId);
      const hex = fillWithCounts(normalized.hex, counts, snapshotId);

      const payload = {};
      if (Object.keys(exercises).length > 0) {
        payload.exercises = exercises;
      }
      if (Object.keys(hex).length > 0) {
        payload.hex = hex;
      }

      if (Object.keys(payload).length === 0) {
        return;
      }

      batch.set(
        docSnap.ref,
        {
          lastRanks: payload,
          lastRanksVersion: 3,
          lastRanksUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      writesInBatch += 1;
      updatedDocs += 1;
    });

    if (writesInBatch > 0) {
      await batch.commit();
      console.log(
        `Updated lastRanks counts for ${updatedDocs} user(s) so far (processed ${processedDocs}).`
      );
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  console.log(
    `Finished setting lastRanks to participant counts. Users processed: ${processedDocs}. Updated: ${updatedDocs}.`
  );
}

async function main() {
  console.log("\n📊 Setting all lastRanks scopes to participant counts...");
  await setAllLastRanksToCounts();
  console.log("\n✅ Done.");
}

main().catch((error) => {
  console.error("setAllLastRanksToCounts failed:", error);
  process.exit(1);
});
