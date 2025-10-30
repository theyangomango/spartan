import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const HEX_RANK_KEYS = ["overall", "chest", "shoulders", "abs", "back", "legs", "arms"];
const USERS_BATCH_SIZE = 400;

try {
  initializeApp();
} catch {
  // App may already be initialised when running via emulator/CLI
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

function buildZeroEntries(memberIds) {
  if (!Array.isArray(memberIds) || !memberIds.length) return [];
  const sorted = memberIds
    .map((id) => String(id || ""))
    .filter((id) => !!id)
    .sort();
  const rankValue = sorted.length;
  return sorted.map((uid) => ({ uid, rank: rankValue }));
}

async function initializeZeroSnapshot() {
  const usersSnap = await db.collection("users").get();
  if (usersSnap.empty) {
    console.log("initializeZeroSnapshot: no users found");
    return;
  }

  const users = [];
  const followingByUid = new Map();
  const statsKeys = new Set();
  const hexKeys = new Set();

  usersSnap.forEach((docSnap) => {
    try {
      const data = docSnap.data() || {};
      const uid = toUid(data?.uid) || docSnap.id;
      if (!uid) return;
      const isPrivate =
        data?.privacy?.profile === "private" ||
        data?.profilePrivacy === "private" ||
        data?.isProfilePrivate === true;
      if (isPrivate) return;

      const ref = docSnap.ref;
      const statsExercises =
        data?.statsExercises && typeof data.statsExercises === "object"
          ? data.statsExercises
          : {};
      Object.keys(statsExercises || {}).forEach((key) => {
        if (key) statsKeys.add(String(key));
      });

      const statsHexagon =
        data?.statsHexagon && typeof data.statsHexagon === "object"
          ? data.statsHexagon
          : {};
      Object.keys(statsHexagon || {}).forEach((key) => {
        if (key) hexKeys.add(String(key).toLowerCase());
      });

      const followingSet = new Set([uid]);
      const followingArr = Array.isArray(data?.following) ? data.following : [];
      for (const entry of followingArr) {
        const fUid = toUid(entry?.uid ?? entry?.id ?? entry);
        if (fUid) followingSet.add(fUid);
      }

      users.push({ uid, ref, data });
      followingByUid.set(uid, followingSet);
    } catch (err) {
      console.warn("initializeZeroSnapshot: failed to process user", docSnap.id, err?.message || err);
    }
  });

  if (!users.length) {
    console.log("initializeZeroSnapshot: no public users after filtering");
    return;
  }

  const tribeMembers = new Map();
  const tribesForUser = new Map();
  try {
    const tribeSnap = await db.collection("tribes").get();
    tribeSnap.forEach((docSnap) => {
      const tid = docSnap.id;
      const data = docSnap.data() || {};
      const membersArr = Array.isArray(data?.members) ? data.members : [];
      const set = tribeMembers.get(tid) || new Set();
      membersArr.forEach((member) => {
        const mUid = toUid(member?.uid ?? member?.id ?? member);
        if (!mUid) return;
        set.add(mUid);
        const byUser = tribesForUser.get(mUid) || new Set();
        byUser.add(tid);
        tribesForUser.set(mUid, byUser);
      });
      if (set.size) tribeMembers.set(tid, set);
    });
  } catch (err) {
    console.warn("initializeZeroSnapshot: tribe fetch failed", err?.message || err);
  }

  users.forEach(({ uid, data }) => {
    const arr = Array.isArray(data?.tribeIds) ? data.tribeIds : [];
    arr.forEach((tidRaw) => {
      const tid = toUid(tidRaw);
      if (!tid) return;
      const memberSet = tribeMembers.get(tid) || new Set();
      memberSet.add(uid);
      tribeMembers.set(tid, memberSet);
      const byUser = tribesForUser.get(uid) || new Set();
      byUser.add(tid);
      tribesForUser.set(uid, byUser);
    });
  });

  const snapshotId = new Date().toISOString();
  const snapshotMetaRef = db.collection("leaderboardMeta").doc("currentSnapshot");

  const globalMemberIds = users.map(({ uid }) => uid);
  const sortedGlobalIds = globalMemberIds.slice().sort();
  const globalExerciseSnapshot = {};
  const globalHexSnapshot = {};

  const exerciseKeys = Array.from(statsKeys);
  exerciseKeys.forEach((exercise) => {
    const entries = buildZeroEntries(sortedGlobalIds);
    if (entries.length) globalExerciseSnapshot[exercise] = entries;
  });

  const hexKeySet = new Set([...Array.from(hexKeys), ...HEX_RANK_KEYS.map((k) => String(k).toLowerCase())]);
  Array.from(hexKeySet).forEach((hexKey) => {
    const entries = buildZeroEntries(sortedGlobalIds);
    if (entries.length) globalHexSnapshot[hexKey] = entries;
  });

  const updates = [];
  users.forEach(({ uid, ref }) => {
    const followingSet = followingByUid.get(uid) || new Set([uid]);
    if (!followingSet.has(uid)) followingSet.add(uid);
    const followingIds = Array.from(followingSet).map((id) => String(id)).sort();

    const followingExercises = {};
    exerciseKeys.forEach((exercise) => {
      const entries = buildZeroEntries(followingIds);
      if (entries.length) followingExercises[exercise] = { snapshotId, entries };
    });

    const followingHex = {};
    Array.from(hexKeySet).forEach((hexKey) => {
      const entries = buildZeroEntries(followingIds);
      if (entries.length) followingHex[hexKey] = { snapshotId, entries };
    });

    const tribeSnapshots = {};
    const tribeSet = tribesForUser.get(uid) || new Set();
    tribeSet.forEach((tid) => {
      const memberSet = tribeMembers.get(tid) || new Set();
      if (!memberSet.size) return;
      if (!memberSet.has(uid)) memberSet.add(uid);
      const memberIds = Array.from(memberSet).map((id) => String(id)).sort();

      const tribeExercises = {};
      exerciseKeys.forEach((exercise) => {
        const entries = buildZeroEntries(memberIds);
        if (entries.length) tribeExercises[exercise] = { snapshotId, entries };
      });

      const tribeHex = {};
      Array.from(hexKeySet).forEach((hexKey) => {
        const entries = buildZeroEntries(memberIds);
        if (entries.length) tribeHex[hexKey] = { snapshotId, entries };
      });

      const snapshot = {};
      if (Object.keys(tribeExercises).length) snapshot.exercises = tribeExercises;
      if (Object.keys(tribeHex).length) snapshot.hex = tribeHex;
      if (Object.keys(snapshot).length) tribeSnapshots[tid] = snapshot;
    });

    const payload = {};
    if (Object.keys(followingExercises).length || Object.keys(followingHex).length) {
      payload.following = {};
      if (Object.keys(followingExercises).length) payload.following.exercises = followingExercises;
      if (Object.keys(followingHex).length) payload.following.hex = followingHex;
    }
    if (Object.keys(tribeSnapshots).length) {
      payload.tribes = tribeSnapshots;
    }

    if (Object.keys(payload).length === 0) {
      updates.push({
        ref,
        data: {
          lastRanks: FieldValue.delete(),
          lastRanksVersion: FieldValue.delete(),
          lastRanksUpdatedAt: FieldValue.serverTimestamp(),
        },
      });
    } else {
      updates.push({
        ref,
        data: {
          lastRanks: payload,
          lastRanksVersion: 4,
          lastRanksUpdatedAt: FieldValue.serverTimestamp(),
        },
      });
    }
  });

  const snapshotDoc = {
    snapshotId,
    generatedAt: FieldValue.serverTimestamp(),
    exercises: globalExerciseSnapshot,
    hex: globalHexSnapshot,
  };
  await db.collection("leaderboardSnapshots").doc(snapshotId).set(snapshotDoc);
  await snapshotMetaRef.set(
    {
      snapshotId,
      generatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  let batch = db.batch();
  let writes = 0;
  let committed = 0;
  for (const { ref, data } of updates) {
    batch.set(ref, data, { merge: true });
    writes += 1;
    if (writes === USERS_BATCH_SIZE) {
      await batch.commit();
      committed += writes;
      console.log(`initializeZeroSnapshot: committed ${committed} user updates...`);
      batch = db.batch();
      writes = 0;
    }
  }
  if (writes > 0) {
    await batch.commit();
    committed += writes;
  }

  console.log(
    `initializeZeroSnapshot: wrote snapshot ${snapshotId} and updated ${committed} user(s).`
  );
}

initializeZeroSnapshot()
  .then(() => {
    console.log("\n✅ Initialized zeroed leaderboard snapshot.\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("initializeLeaderboardZeroSnapshot failed:", err);
    process.exit(1);
  });
