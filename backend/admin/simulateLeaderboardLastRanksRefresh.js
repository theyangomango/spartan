import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const HEX_RANK_KEYS = ["overall", "chest", "shoulders", "abs", "back", "legs", "arms"];
const BATCH_WRITE_LIMIT = 400;

try {
  initializeApp();
} catch {
  // ignore if app already initialised
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

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function computeGlobalRanks(valueMap) {
  const entries = Array.from(valueMap.entries()).map(([uid, value]) => ({
    uid,
    value: safeNumber(value),
  }));
  entries.sort((a, b) => b.value - a.value);

  const ranks = new Map();
  entries.forEach((entry, index) => {
    ranks.set(entry.uid, index + 1);
  });
  return ranks;
}

function ensureMembersInValueMap(valueMap, memberIds) {
  memberIds.forEach((uid) => {
    if (!valueMap.has(uid)) valueMap.set(uid, 0);
  });
}

function buildEntriesForMembers(valueMap, memberIds) {
  if (!memberIds || !memberIds.length) return [];
  const sorted = memberIds
    .slice()
    .sort((a, b) => safeNumber(valueMap.get(b)) - safeNumber(valueMap.get(a)));
  return sorted.map((uid, index) => ({ uid, rank: index + 1 }));
}

async function simulateRefresh() {
  const usersSnap = await db.collection("usersPublic").get();
  if (usersSnap.empty) {
    console.log("simulateRefresh: no users found");
    return;
  }

  const users = [];
  const followingByUid = new Map();
  const statsByUid = new Map();
  const hexStatsByUid = new Map();

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

      const statsExercises =
        data?.statsExercises && typeof data.statsExercises === "object"
          ? data.statsExercises
          : {};
      const statsHexagon =
        data?.statsHexagon && typeof data.statsHexagon === "object"
          ? Object.fromEntries(
              Object.entries(data.statsHexagon).map(([k, v]) => [String(k).toLowerCase(), v])
            )
          : {};

      const followingSet = new Set([uid]);
      const followingArr = Array.isArray(data?.following) ? data.following : [];
      for (const entry of followingArr) {
        const fUid = toUid(entry?.uid ?? entry?.id ?? entry);
        if (fUid) followingSet.add(fUid);
      }

      users.push({ uid, ref: docSnap.ref, statsExercises, data });
      followingByUid.set(uid, followingSet);
      statsByUid.set(uid, statsExercises);
      hexStatsByUid.set(uid, statsHexagon);
    } catch (err) {
      console.warn("simulateRefresh: failed to process user", docSnap.id, err?.message || err);
    }
  });

  if (!users.length) {
    console.log("simulateRefresh: no users after filtering");
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
    console.warn("simulateRefresh: tribe fetch failed", err?.message || err);
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

  const allExercises = new Set();
  statsByUid.forEach((stats) => {
    Object.keys(stats || {}).forEach((exercise) => {
      if (exercise) allExercises.add(exercise);
    });
  });

  const allHexKeys = new Set();
  hexStatsByUid.forEach((stats) => {
    Object.keys(stats || {}).forEach((key) => {
      const normalized = String(key).toLowerCase();
      if (HEX_RANK_KEYS.includes(normalized)) allHexKeys.add(normalized);
    });
  });

  const exerciseMaps = new Map();
  allExercises.forEach((exercise) => {
    const valueMap = new Map();
    users.forEach(({ uid }) => {
      const stats = statsByUid.get(uid) || {};
      const exStats = stats?.[exercise] || {};
      valueMap.set(uid, safeNumber(exStats?.["1RM"]));
    });
    const ranks = computeGlobalRanks(valueMap);
    exerciseMaps.set(exercise, { valueMap, ranks });
  });

  const hexMaps = new Map();
  allHexKeys.forEach((key) => {
    const valueMap = new Map();
    users.forEach(({ uid }) => {
      const stats = hexStatsByUid.get(uid) || {};
      valueMap.set(uid, safeNumber(stats?.[key]));
    });
    const ranks = computeGlobalRanks(valueMap);
    hexMaps.set(key, { valueMap, ranks });
  });

  const globalMemberIds = users.map(({ uid }) => uid);
  const globalExerciseSnapshot = {};
  const globalHexSnapshot = {};

  allExercises.forEach((exercise) => {
    const config = exerciseMaps.get(exercise);
    if (!config) return;
    ensureMembersInValueMap(config.valueMap, globalMemberIds);
    const entries = buildEntriesForMembers(config.valueMap, globalMemberIds);
    if (entries.length) globalExerciseSnapshot[exercise] = entries;
  });

  allHexKeys.forEach((key) => {
    const config = hexMaps.get(key);
    if (!config) return;
    ensureMembersInValueMap(config.valueMap, globalMemberIds);
    const entries = buildEntriesForMembers(config.valueMap, globalMemberIds);
    if (entries.length) globalHexSnapshot[key] = entries;
  });

  const updates = [];
  users.forEach(({ uid, ref, statsExercises }) => {
    const exerciseNames = Object.keys(statsExercises || {});
    const followingSet = followingByUid.get(uid) || new Set([uid]);
    if (!followingSet.has(uid)) followingSet.add(uid);
    const tribeSet = tribesForUser.get(uid) || new Set();

    const followingExercises = {};
    const followingHex = {};

    const followingIds = Array.from(followingSet).map((id) => String(id));

    exerciseNames.forEach((exercise) => {
      const config = exerciseMaps.get(exercise);
      if (!config) return;
      ensureMembersInValueMap(config.valueMap, followingIds);
      const entries = buildEntriesForMembers(config.valueMap, followingIds);
      if (entries.length) followingExercises[exercise] = { snapshotId, entries };
    });

    allHexKeys.forEach((key) => {
      const config = hexMaps.get(key);
      if (!config) return;
      ensureMembersInValueMap(config.valueMap, followingIds);
      const entries = buildEntriesForMembers(config.valueMap, followingIds);
      if (entries.length) followingHex[key] = { snapshotId, entries };
    });

    const tribeSnapshots = {};
    tribeSet.forEach((tid) => {
      const memberSet = tribeMembers.get(tid) || new Set();
      if (!memberSet.size) return;
      if (!memberSet.has(uid)) memberSet.add(uid);
      const memberIds = Array.from(memberSet).map((id) => String(id));

      const tribeExercises = {};
      exerciseNames.forEach((exercise) => {
        const config = exerciseMaps.get(exercise);
        if (!config) return;
        ensureMembersInValueMap(config.valueMap, memberIds);
        const entries = buildEntriesForMembers(config.valueMap, memberIds);
        if (entries.length) tribeExercises[exercise] = { snapshotId, entries };
      });

      const tribeHex = {};
      allHexKeys.forEach((key) => {
        const config = hexMaps.get(key);
        if (!config) return;
        ensureMembersInValueMap(config.valueMap, memberIds);
        const entries = buildEntriesForMembers(config.valueMap, memberIds);
        if (entries.length) tribeHex[key] = { snapshotId, entries };
      });

      const snapshot = {};
      if (Object.keys(tribeExercises).length) snapshot.exercises = tribeExercises;
      if (Object.keys(tribeHex).length) snapshot.hex = tribeHex;
      if (Object.keys(snapshot).length) tribeSnapshots[tid] = snapshot;
    });

    const nextLastRanks = {};
    if (Object.keys(followingExercises).length || Object.keys(followingHex).length) {
      nextLastRanks.following = {};
      if (Object.keys(followingExercises).length) nextLastRanks.following.exercises = followingExercises;
      if (Object.keys(followingHex).length) nextLastRanks.following.hex = followingHex;
    }
    if (Object.keys(tribeSnapshots).length) {
      nextLastRanks.tribes = tribeSnapshots;
    }

    if (Object.keys(nextLastRanks).length === 0) {
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
          lastRanks: nextLastRanks,
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
    if (writes === BATCH_WRITE_LIMIT) {
      await batch.commit();
      committed += writes;
      console.log(`simulateRefresh: committed ${committed} updates...`);
      batch = db.batch();
      writes = 0;
    }
  }
  if (writes > 0) {
    await batch.commit();
    committed += writes;
  }

  console.log(`simulateRefresh: updated lastRanks for ${committed} user(s).`);
}

simulateRefresh()
  .then(() => {
    console.log("\n✅ Finished simulating refreshLeaderboardLastRanks.\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("simulateLeaderboardLastRanksRefresh failed:", err);
    process.exit(1);
  });
