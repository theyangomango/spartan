import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const USERS_BATCH_SIZE = 400;
const DELETE_BATCH_SIZE = 500;

try {
  initializeApp();
} catch {
  // ignore: the app may already be initialised when run via emulator
}

const db = getFirestore();
const auth = getAuth();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normaliseHandle(rawHandle) {
  if (!rawHandle && rawHandle !== 0) return "";
  const trimmed = String(rawHandle).trim();
  if (!trimmed) return "";
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return withoutAt.trim();
}

function toStringSafe(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function getUidFromEntry(entry) {
  if (entry === null || entry === undefined) return "";
  if (typeof entry === "string" || typeof entry === "number") {
    return toStringSafe(entry);
  }
  if (typeof entry !== "object") return "";
  const candidates = [
    "uid",
    "userUid",
    "id",
    "creatorUid",
    "creatorUID",
    "ownerUid",
    "ownerUID",
  ];
  for (const key of candidates) {
    const value = entry[key];
    if (value !== undefined && value !== null) {
      const uid = toStringSafe(value);
      if (uid) return uid;
    }
  }
  return "";
}

async function findUserByHandle(rawHandle) {
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
}

async function deleteCollectionByPath(collectionPath, batchSize = DELETE_BATCH_SIZE) {
  let deleted = 0;

  while (true) {
    const snapshot = await db
      .collection(collectionPath)
      .orderBy("__name__")
      .limit(batchSize)
      .get();

    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    deleted += snapshot.size;
    await sleep(50);
  }

  return deleted;
}

async function deleteUserPosts(uid, batchSize = DELETE_BATCH_SIZE) {
  const removed = [];
  let total = 0;

  while (true) {
    const snapshot = await db
      .collection("posts")
      .where("uid", "==", uid)
      .limit(batchSize)
      .get();

    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
      removed.push(docSnap.id);
    });
    await batch.commit();

    total += snapshot.size;
    console.log(`Deleted ${total} post(s) for user ${uid} so far...`);

    await sleep(50);
  }

  return removed;
}

async function deleteUserWorkouts(uid, batchSize = DELETE_BATCH_SIZE) {
  const removedSet = new Set();
  const removedList = [];
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
        removedList.push(docSnap.id);
        batch.delete(docSnap.ref);
        pending += 1;
      });

      if (pending === 0) break;

      await batch.commit();
      total += pending;
      console.log(`Deleted ${total} workout(s) for user ${uid} so far...`);
      await sleep(50);
    }
  }

  return removedList;
}

async function cleanGlobalPosts(pidList, uid) {
  if (!pidList.length && !uid) return { removedFromGlobal: 0, removedFromOwnerMap: 0 };

  const globalPostsRef = db.collection("global").doc("posts");

  return db.runTransaction(async (txn) => {
    const snap = await txn.get(globalPostsRef).catch(() => null);
    if (!snap || !snap.exists) return { removedFromGlobal: 0, removedFromOwnerMap: 0 };

    const data = snap.data() || {};
    const currentPids = Array.isArray(data?.PIDs) ? data.PIDs : [];
    const ownerMap =
      data?.ownerMap && typeof data.ownerMap === "object" ? { ...data.ownerMap } : {};

    const removals = new Set(pidList.map(toStringSafe));
    Object.entries(ownerMap).forEach(([pid, owner]) => {
      if (removals.has(pid)) return;
      if (!uid) return;
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
}

async function cleanGlobalExplorePosts(pidList) {
  if (!pidList.length) return 0;
  const pidSet = new Set(pidList.map(toStringSafe));
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
}

async function removeFromGlobalUsers(uid) {
  const usersRef = db.collection("global").doc("users");
  return db.runTransaction(async (txn) => {
    const snap = await txn.get(usersRef).catch(() => null);
    if (!snap || !snap.exists) return false;
    const data = snap.data() || {};
    const arr = Array.isArray(data?.all) ? data.all : [];
    const filtered = arr.filter((entry) => getUidFromEntry(entry) !== uid);
    if (filtered.length === arr.length) return false;
    txn.set(usersRef, { all: filtered }, { merge: true });
    return true;
  });
}

function filterUserRefArray(arr, targetUid) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return { changed: false, value: arr || [] };
  }
  const filtered = arr.filter((entry) => {
    const uid = getUidFromEntry(entry);
    if (uid && uid === targetUid) return false;
    return true;
  });
  return { changed: filtered.length !== arr.length, value: filtered };
}

function filterPidArray(arr, pidSet) {
  if (!pidSet.size || !Array.isArray(arr) || arr.length === 0) {
    return { changed: false, value: arr || [] };
  }
  const filtered = arr.filter((entry) => {
    if (entry === null || entry === undefined) return false;
    if (typeof entry === "string" || typeof entry === "number") {
      return !pidSet.has(String(entry));
    }
    if (typeof entry === "object") {
      const pid = entry?.pid ?? entry?.id ?? null;
      if (pid && pidSet.has(String(pid))) {
        return false;
      }
    }
    return true;
  });
  return { changed: filtered.length !== arr.length, value: filtered };
}

function filterPostRecords(record, pidSet) {
  if (!pidSet.size || !record || typeof record !== "object") {
    return { changed: false, value: record || {} };
  }
  const next = { ...record };
  let changed = false;
  pidSet.forEach((pid) => {
    if (Object.prototype.hasOwnProperty.call(next, pid)) {
      delete next[pid];
      changed = true;
    }
  });
  return { changed, value: changed ? next : record };
}

function filterMessagesArray(arr, targetUid) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return { changed: false, value: arr || [] };
  }
  const filtered = arr.filter((entry) => {
    const other = Array.isArray(entry?.otherUsers) ? entry.otherUsers : [];
    return !other.some((user) => getUidFromEntry(user) === targetUid);
  });
  return { changed: filtered.length !== arr.length, value: filtered };
}

async function scrubUserReferences(uid, removedPostIds) {
  const pidSet = new Set((removedPostIds || []).map(toStringSafe));
  let processed = 0;
  let lastDoc = null;
  let updatedDocs = 0;

  while (true) {
    let query = db.collection("users").orderBy("__name__").limit(USERS_BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let writes = 0;

    snapshot.docs.forEach((docSnap) => {
      if (docSnap.id === uid) return;
      const data = docSnap.data() || {};
      const updates = {};
      let touched = false;

      const followers = filterUserRefArray(data?.followers, uid);
      if (followers.changed) {
        updates.followers = followers.value;
        updates.followerCount = followers.value.length;
        touched = true;
      }

      const following = filterUserRefArray(data?.following, uid);
      if (following.changed) {
        updates.following = following.value;
        updates.followingCount = following.value.length;
        touched = true;
      }

      const fri = filterUserRefArray(data?.followRequestsIn, uid);
      if (fri.changed) {
        updates.followRequestsIn = fri.value;
        touched = true;
      }

      const fro = filterUserRefArray(data?.followRequestsOut, uid);
      if (fro.changed) {
        updates.followRequestsOut = fro.value;
        touched = true;
      }

      const blocked = filterUserRefArray(data?.blocked, uid);
      if (blocked.changed) {
        updates.blocked = blocked.value;
        touched = true;
      }

      const blockedBy = filterUserRefArray(data?.blockedBy, uid);
      if (blockedBy.changed) {
        updates.blockedBy = blockedBy.value;
        touched = true;
      }

      const messages = filterMessagesArray(data?.messages, uid);
      if (messages.changed) {
        updates.messages = messages.value;
        touched = true;
      }

      const savedPosts = filterPidArray(data?.savedPosts, pidSet);
      if (savedPosts.changed) {
        updates.savedPosts = savedPosts.value;
        touched = true;
      }

      const feedPosts = filterPidArray(data?.feedPosts, pidSet);
      if (feedPosts.changed) {
        updates.feedPosts = feedPosts.value;
        touched = true;
      }

      const exploreFeedPosts = filterPidArray(data?.exploreFeedPosts, pidSet);
      if (exploreFeedPosts.changed) {
        updates.exploreFeedPosts = exploreFeedPosts.value;
        touched = true;
      }

      const postRecords = filterPostRecords(data?.postRecords, pidSet);
      if (postRecords.changed) {
        updates.postRecords = postRecords.value;
        touched = true;
      }

      if (touched) {
        batch.set(docSnap.ref, updates, { merge: true });
        writes += 1;
        updatedDocs += 1;
      }
    });

    if (writes) {
      await batch.commit();
      await sleep(50);
    }

    processed += snapshot.size;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  return updatedDocs;
}

async function purgeMessageContent(cid, uid, batchSize = DELETE_BATCH_SIZE) {
  let deleted = 0;

  while (true) {
    const snapshot = await db
      .collection(`messages/${cid}/content`)
      .where("senderUid", "==", uid)
      .limit(batchSize)
      .get();

    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    deleted += snapshot.size;
    await sleep(50);
  }

  return deleted;
}

async function removeUserFromMessages(uid) {
  let updatedChats = 0;
  let deletedChats = 0;
  let removedMessages = 0;

  while (true) {
    const snapshot = await db
      .collection("messages")
      .where("memberUids", "array-contains", uid)
      .limit(DELETE_BATCH_SIZE)
      .get();

    if (snapshot.empty) break;

    for (const docSnap of snapshot.docs) {
      const cid = docSnap.id;
      const data = docSnap.data() || {};
      const memberUids = Array.isArray(data?.memberUids) ? data.memberUids : [];
      const usersArr = Array.isArray(data?.users) ? data.users : [];

      const nextMemberUids = memberUids.filter((m) => toStringSafe(m) !== uid);
      const nextUsers = usersArr.filter((entry) => getUidFromEntry(entry) !== uid);

      const memberChanged = nextMemberUids.length !== memberUids.length;
      const usersChanged = nextUsers.length !== usersArr.length;

      if (nextMemberUids.length <= 1) {
        const removed = await deleteCollectionByPath(`messages/${cid}/content`);
        removedMessages += removed;
        await docSnap.ref.delete().catch(() => docSnap.ref.set({ deleted: true }, { merge: true }));
        deletedChats += 1;
        console.log(`Deleted chat ${cid} while removing user ${uid}.`);
        continue;
      }

      const messageRemovals = await purgeMessageContent(cid, uid);
      removedMessages += messageRemovals;

      if (memberChanged || usersChanged) {
        const payload = {
          ...(memberChanged ? { memberUids: nextMemberUids } : {}),
          ...(usersChanged ? { users: nextUsers } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        };
        await docSnap.ref.set(payload, { merge: true });
        updatedChats += 1;
      }
    }

    await sleep(50);
  }

  return { updatedChats, deletedChats, removedMessages };
}

async function cleanTribes(uid) {
  const snapshot = await db
    .collection("tribes")
    .where("members", "array-contains", uid)
    .get();

  if (snapshot.empty) return { updated: 0, deleted: 0 };

  let updated = 0;
  let deleted = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() || {};
    const members = Array.isArray(data?.members) ? data.members : [];
    const nextMembers = members.filter((memberUid) => toStringSafe(memberUid) !== uid);

    if (!nextMembers.length) {
      await docSnap.ref.delete();
      deleted += 1;
      continue;
    }

    const updates = {
      members: nextMembers,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (toStringSafe(data?.ownerUid) === uid) {
      updates.ownerUid = nextMembers[0] || null;
    }

    await docSnap.ref.set(updates, { merge: true });
    updated += 1;
  }

  return { updated, deleted };
}

async function deleteAuthUser(uid) {
  try {
    await auth.deleteUser(uid);
    return true;
  } catch (error) {
    if (error?.code === "auth/user-not-found") {
      return false;
    }
    console.warn(`Failed to delete auth user ${uid}:`, error.message || error);
    return false;
  }
}

async function main() {
  const [, , handleArg] = process.argv;
  if (!handleArg) {
    console.error("Usage: node functions/scripts/deleteUserAndContentByHandle.js <handle>");
    process.exit(1);
  }

  console.log(`\n🗑️  Deleting Spartan account for handle "${handleArg}"...`);

  const userDoc = await findUserByHandle(handleArg);
  const uid = userDoc.id;
  const userData = userDoc.data() || {};
  const resolvedHandle = normaliseHandle(userData?.handle || handleArg);

  console.log(`Found user ${uid} (${resolvedHandle || "unknown handle"}). Beginning purge...`);

  const removedPosts = await deleteUserPosts(uid);
  const removedWorkouts = await deleteUserWorkouts(uid);

  const postCleanup = await cleanGlobalPosts(removedPosts, uid);
  const exploreCleanup = await cleanGlobalExplorePosts(removedPosts);
  const messageCleanup = await removeUserFromMessages(uid);
  const tribeCleanup = await cleanTribes(uid);
  const touchedUsers = await scrubUserReferences(uid, removedPosts);
  const removedFromGlobalUsers = await removeFromGlobalUsers(uid);

  const authDeleted = await deleteAuthUser(uid);

  await userDoc.ref.delete();

  console.log("\n✅ Account removal summary:");
  console.log(`   • Posts deleted: ${removedPosts.length}`);
  console.log(`   • Workouts deleted: ${removedWorkouts.length}`);
  console.log(`   • Global post list removals: ${postCleanup.removedFromGlobal}`);
  console.log(`   • Global ownerMap entries removed: ${postCleanup.removedFromOwnerMap}`);
  console.log(`   • Explore post list removals: ${exploreCleanup}`);
  console.log(`   • Message chats updated: ${messageCleanup.updatedChats}`);
  console.log(`   • Message chats deleted: ${messageCleanup.deletedChats}`);
  console.log(`   • Individual messages purged: ${messageCleanup.removedMessages}`);
  console.log(`   • Tribes updated: ${tribeCleanup.updated}`);
  console.log(`   • Tribes deleted: ${tribeCleanup.deleted}`);
  console.log(`   • Other user documents scrubbed: ${touchedUsers}`);
  console.log(`   • Removed from global users registry: ${removedFromGlobalUsers ? "yes" : "no"}`);
  console.log(`   • Auth account deleted: ${authDeleted ? "yes" : "not found/failed"}`);
  console.log(`\n🧹 Completed removal of ${resolvedHandle || handleArg}.`);
}

main().catch((error) => {
  console.error("deleteUserAndContentByHandle failed:", error);
  process.exit(1);
});
