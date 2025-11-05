import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { ensureHandleAvailable, propagateHandleChange } from "./handlePropagation.js";
import { buildOldNamesSet, propagateNameChange } from "./namePropagation.js";

const USERS_BATCH_SIZE = 400;
const DELETE_BATCH_SIZE = 500;
const DELETED_USER_DISPLAY_NAME = "Deleted User";
const DELETED_USER_HANDLE_LABEL = "Deleted User";
const DELETED_USER_HANDLE_BASE = "deleteduser";
const DELETED_USER_PFP = "https://ui-avatars.com/api/?name=Deleted+User&background=29263A&color=FFFFFF&size=256";

try {
  initializeApp();
} catch {
  // App might already be initialised.
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

export async function findUserByHandle(rawHandle) {
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

function gatherHandleLowerCandidates(userData = {}, resolvedHandle = "", handleHint = "") {
  const candidates = [
    userData?.handle,
    userData?.handleLower,
    userData?.handle_lower,
    userData?.username,
    userData?.usernameLower,
    userData?.username_lower,
    userData?.tag,
    userData?.tagLower,
    userData?.tag_lower,
    resolvedHandle,
    handleHint,
  ];

  const set = new Set();
  candidates.forEach((value) => {
    const normalized = normaliseHandle(value);
    if (normalized) {
      set.add(normalized.toLowerCase());
    }
  });
  return Array.from(set);
}

async function deleteHandleRegistryEntries(uid, handleLowers = []) {
  if (!Array.isArray(handleLowers) || !handleLowers.length) return 0;
  let removed = 0;
  for (const handleLower of handleLowers) {
    if (!handleLower) continue;
    const safeLower = normaliseHandle(handleLower).toLowerCase();
    if (!safeLower) continue;
    const handleRef = db.collection("userHandles").doc(safeLower);
    try {
      const snap = await handleRef.get();
      if (!snap.exists) continue;
      const docUid = String(snap.data()?.uid || "").trim();
      if (docUid && docUid !== uid) continue;
      await handleRef.delete();
      removed += 1;
    } catch (error) {
      console.warn(`[warn] Failed to delete userHandles/${safeLower}:`, error?.message || error);
    }
  }
  return removed;
}

async function deleteUserSearchIndexDoc(uid) {
  const ref = db.collection("userSearchIndex").doc(uid);
  try {
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.delete();
    return true;
  } catch (error) {
    console.warn(`[warn] Failed to delete userSearchIndex/${uid}:`, error?.message || error);
    return false;
  }
}

async function deleteUserPublicDoc(uid) {
  const ref = db.collection("usersPublic").doc(uid);
  try {
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.delete();
    return true;
  } catch (error) {
    console.warn(`[warn] Failed to delete usersPublic/${uid}:`, error?.message || error);
    return false;
  }
}

async function deleteUsersPrivateArtifacts(uid, batchSize = DELETE_BATCH_SIZE) {
  const basePath = `usersPrivate/${uid}`;
  const result = {
    notificationsDeleted: 0,
    recentFoodsDeleted: 0,
    foodLogDaysDeleted: 0,
    foodEntriesDeleted: 0,
    docDeleted: false,
  };

  try {
    result.notificationsDeleted = await deleteCollectionByPath(`${basePath}/notifications`, batchSize);
  } catch (error) {
    console.warn(`[warn] Failed to delete notifications for ${basePath}:`, error?.message || error);
  }

  try {
    result.recentFoodsDeleted = await deleteCollectionByPath(`${basePath}/recentFoods`, batchSize);
  } catch (error) {
    console.warn(`[warn] Failed to delete recent foods for ${basePath}:`, error?.message || error);
  }

  try {
    const logsRef = db.collection(`${basePath}/foodLogs`);
    while (true) {
      const snapshot = await logsRef.orderBy("__name__").limit(batchSize).get();
      if (snapshot.empty) break;

      for (const docSnap of snapshot.docs) {
        const entriesPath = `${basePath}/foodLogs/${docSnap.id}/entries`;
        try {
          const removedEntries = await deleteCollectionByPath(entriesPath, batchSize);
          result.foodEntriesDeleted += removedEntries;
        } catch (error) {
          console.warn(
            `[warn] Failed to delete food log entries at ${entriesPath}:`,
            error?.message || error
          );
        }
      }

      const batch = db.batch();
      snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();

      result.foodLogDaysDeleted += snapshot.size;
      await sleep(50);
    }
  } catch (error) {
    console.warn(`[warn] Failed to delete foodLogs for ${basePath}:`, error?.message || error);
  }

  try {
    const privateRef = db.collection("usersPrivate").doc(uid);
    const snap = await privateRef.get();
    if (snap.exists) {
      await privateRef.delete();
      result.docDeleted = true;
    }
  } catch (error) {
    console.warn(`[warn] Failed to delete usersPrivate/${uid}:`, error?.message || error);
  }

  return result;
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

function filterUidArray(arr, targetUid) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return { changed: false, value: arr || [] };
  }
  const filtered = arr.filter((entry) => String(entry || "") !== targetUid);
  return { changed: filtered.length !== arr.length, value: filtered };
}

function filterUidMap(map, targetUid) {
  if (!map || typeof map !== "object" || !Object.prototype.hasOwnProperty.call(map, targetUid)) {
    return { changed: false, value: map || {} };
  }
  const next = { ...map };
  delete next[targetUid];
  return { changed: true, value: next };
}

async function scrubUserCollection(collectionName, uid, pidSet) {
  let lastDoc = null;
  let updatedDocs = 0;

  while (true) {
    let query = db.collection(collectionName).orderBy("__name__").limit(USERS_BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    let snapshot;
    try {
      snapshot = await query.get();
    } catch (error) {
      console.warn(
        `[warn] Failed to scan ${collectionName} while scrubbing references:`,
        error?.message || error
      );
      break;
    }

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

      const blockedUidList = filterUidArray(data?.blockedUidList, uid);
      if (blockedUidList.changed) {
        updates.blockedUidList = blockedUidList.value;
        touched = true;
      }

      const blockedByUidList = filterUidArray(data?.blockedByUidList, uid);
      if (blockedByUidList.changed) {
        updates.blockedByUidList = blockedByUidList.value;
        touched = true;
      }

      const blockedTimestamps = filterUidMap(data?.blockedTimestamps, uid);
      if (blockedTimestamps.changed) {
        updates.blockedTimestamps = blockedTimestamps.value;
        touched = true;
      }

      const blockedByTimestamps = filterUidMap(data?.blockedByTimestamps, uid);
      if (blockedByTimestamps.changed) {
        updates.blockedByTimestamps = blockedByTimestamps.value;
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
      }
    });

    if (writes) {
      try {
        await batch.commit();
        updatedDocs += writes;
      } catch (error) {
        console.warn(
          `[warn] Failed to commit updates to ${collectionName}:`,
          error?.message || error
        );
      }
      await sleep(50);
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  return updatedDocs;
}

async function scrubUserReferences(uid, removedPostIds) {
  const pidSet = new Set((removedPostIds || []).map(toStringSafe));
  const collections = ["users", "usersPublic", "usersPrivate"];
  let totalUpdated = 0;

  for (const collectionName of collections) {
    totalUpdated += await scrubUserCollection(collectionName, uid, pidSet);
  }

  return totalUpdated;
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

function buildDeletedChatUser(original, uid) {
  const stubUid = `deleted:${uid}`;
  const prevVersion =
    Number(original?.pfpVersion ?? original?.imageVersion ?? original?.avatarVersion ?? 0) || 0;

  return {
    uid: stubUid,
    removedUid: uid,
    handle: DELETED_USER_HANDLE_LABEL,
    username: DELETED_USER_HANDLE_LABEL,
    name: DELETED_USER_HANDLE_LABEL,
    displayName: DELETED_USER_HANDLE_LABEL,
    photoURL: DELETED_USER_PFP,
    photoUrl: DELETED_USER_PFP,
    image: DELETED_USER_PFP,
    pfp: DELETED_USER_PFP,
    avatar: DELETED_USER_PFP,
    pfpUrl: DELETED_USER_PFP,
    pfpVersion: prevVersion,
    imageVersion: prevVersion,
    deleted: true,
  };
}

function sanitizeChatUsers(usersArr, uid) {
  if (!Array.isArray(usersArr)) {
    return { value: [], changed: false, placeholders: 0 };
  }

  let changed = false;
  let placeholders = 0;
  let found = false;

  const sanitized = usersArr.map((entry) => {
    const entryUid = getUidFromEntry(entry);
    if (entryUid === uid) {
      found = true;
      placeholders += 1;
      changed = true;
      return buildDeletedChatUser(entry, uid);
    }
    if (entryUid === `deleted:${uid}` && entry?.deleted) {
      found = true;
      return entry;
    }
    if (entryUid === `deleted:${uid}`) {
      found = true;
      changed = true;
      return buildDeletedChatUser(entry, uid);
    }
    return entry;
  });

  if (!found) {
    sanitized.push(buildDeletedChatUser({}, uid));
    changed = true;
    placeholders += 1;
  }

  return { value: sanitized, changed, placeholders };
}

async function removeUserFromMessages(uid) {
  let updatedChats = 0;
  let deletedChats = 0;
  let removedMessages = 0;
  let placeholdersApplied = 0;

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
      const memberUids = Array.isArray(data?.memberUids) ? data.memberUids.map(toStringSafe) : [];
      const nextMemberUids = memberUids.filter((m) => m && m !== uid);
      const usersArr = Array.isArray(data?.users) ? data.users : [];

      const { value: sanitizedUsers, changed: usersChanged, placeholders } = sanitizeChatUsers(
        usersArr,
        uid
      );
      placeholdersApplied += placeholders;

      const memberChanged = nextMemberUids.length !== memberUids.length;

      const messageRemovals = await purgeMessageContent(cid, uid);
      removedMessages += messageRemovals;

      if (!nextMemberUids.length) {
        const removed = await deleteCollectionByPath(`messages/${cid}/content`);
        removedMessages += removed;
        await docSnap.ref.delete().catch(() => docSnap.ref.set({ deleted: true }, { merge: true }));
        deletedChats += 1;
        console.log(`Deleted chat ${cid} while removing user ${uid}.`);
        continue;
      }

      if (memberChanged || usersChanged) {
        const payload = {
          ...(memberChanged ? { memberUids: nextMemberUids } : {}),
          ...(usersChanged ? { users: sanitizedUsers } : {}),
          userCount: nextMemberUids.length,
          updatedAt: FieldValue.serverTimestamp(),
        };
        await docSnap.ref.set(payload, { merge: true });
        updatedChats += 1;
      }
    }

    await sleep(50);
  }

  return { updatedChats, deletedChats, removedMessages, placeholdersApplied };
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

    const isOwner = toStringSafe(data?.ownerUid) === uid;
    if (!nextMembers.length || isOwner) {
      await docSnap.ref.delete();
      deleted += 1;
      continue;
    }

    const updates = {
      members: nextMembers,
      updatedAt: FieldValue.serverTimestamp(),
    };

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

function resolveHandleFromData(data, fallback) {
  const candidates = [
    data?.handle,
    data?.username,
    data?.tag,
    fallback,
  ];
  for (const candidate of candidates) {
    const normalized = normaliseHandle(candidate);
    if (normalized) return normalized;
  }
  return "";
}

async function assignDeletedName(uid, userData) {
  try {
    const oldNames = buildOldNamesSet({
      userData: userData || {},
      explicitOldName: userData?.displayName || userData?.name || "",
    });
    await propagateNameChange({
      uid,
      oldNames,
      newName: DELETED_USER_DISPLAY_NAME,
    });
    return true;
  } catch (error) {
    console.warn(`[warn] Failed to propagate deleted name for ${uid}:`, error?.message || error);
    return false;
  }
}

async function setHandleDocuments(uid, handle) {
  if (!handle) return;
  const normalized = normaliseHandle(handle);
  if (!normalized) return;
  const now = FieldValue.serverTimestamp();
  await Promise.all([
    db.collection("users").doc(uid).set(
      {
        handle: normalized,
        handleLower: normalized.toLowerCase(),
        updatedAt: now,
      },
      { merge: true }
    ),
    db.collection("usersPublic").doc(uid).set(
      {
        handle: normalized,
        handleLower: normalized.toLowerCase(),
        updatedAt: now,
      },
      { merge: true }
    ),
  ]);
}

async function assignDeletedHandle(uid, currentHandle) {
  const existingHandle = normaliseHandle(currentHandle);
  let candidateHandle = null;
  let attempt = 0;

  while (attempt < 20) {
    const suffix = attempt === 0 ? "" : `${attempt}`;
    const candidate = normaliseHandle(`${DELETED_USER_HANDLE_BASE}${suffix}`);
    if (!candidate) {
      attempt += 1;
      continue;
    }
    try {
      await ensureHandleAvailable(candidate, uid);
      if (existingHandle) {
        await propagateHandleChange({ uid, oldHandle: existingHandle, newHandle: candidate });
      }
      await setHandleDocuments(uid, candidate);
      await db.collection("userHandles").doc(candidate.toLowerCase()).set({
        uid,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      candidateHandle = candidate;
      break;
    } catch (error) {
      const message = String(error?.message || "");
      if (
        message.includes("conflicts") ||
        message.includes("reserved") ||
        message.includes("Handle") ||
        message.includes("non-empty")
      ) {
        attempt += 1;
        continue;
      }
      console.warn(`[warn] Failed to assign deleted handle candidate "${candidate}" for ${uid}:`, message || error);
      throw error;
    }
  }

  if (!candidateHandle) {
    const fallback = normaliseHandle(`${DELETED_USER_HANDLE_BASE}${Date.now().toString(36)}`);
    try {
      await ensureHandleAvailable(fallback, uid);
      if (existingHandle) {
        await propagateHandleChange({ uid, oldHandle: existingHandle, newHandle: fallback });
      }
      await setHandleDocuments(uid, fallback);
      await db.collection("userHandles").doc(fallback.toLowerCase()).set({
        uid,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      candidateHandle = fallback;
    } catch (error) {
      console.warn(`[warn] Failed to assign fallback deleted handle for ${uid}:`, error?.message || error);
      return null;
    }
  }

  return candidateHandle;
}

async function applyDeletedIdentity(uid, { userData, resolvedHandle }) {
  const nameChanged = await assignDeletedName(uid, userData);
  let newHandle = null;
  try {
    newHandle = await assignDeletedHandle(uid, resolveHandleFromData(userData, resolvedHandle));
  } catch (error) {
    console.warn(`[warn] Failed to propagate deleted handle for ${uid}:`, error?.message || error);
  }
  return { nameChanged, newHandle };
}

async function deleteUserCore(uid, { userDocSnap = null, handleHint = "" } = {}) {
  let docSnap = userDocSnap;
  if (!docSnap) {
    docSnap = await db.collection("users").doc(uid).get().catch(() => null);
  }

  const userExists = docSnap?.exists;
  const userData = userExists ? docSnap.data() || {} : {};
  let resolvedHandle = resolveHandleFromData(userData, handleHint);
  const handleLowerCandidates = gatherHandleLowerCandidates(userData, resolvedHandle, handleHint);

  console.log(`Found user ${uid} (${resolvedHandle || "unknown handle"}). Beginning purge...`);

  const identityResult = await applyDeletedIdentity(uid, { userData, resolvedHandle });
  if (identityResult?.newHandle) {
    const lowered = normaliseHandle(identityResult.newHandle)?.toLowerCase();
    if (lowered) handleLowerCandidates.push(lowered);
    resolvedHandle = identityResult.newHandle;
  }

  const removedPosts = await deleteUserPosts(uid);
  const removedWorkouts = await deleteUserWorkouts(uid);

  const postCleanup = await cleanGlobalPosts(removedPosts, uid);
  const exploreCleanup = await cleanGlobalExplorePosts(removedPosts);
  const messageCleanup = await removeUserFromMessages(uid);
  const tribeCleanup = await cleanTribes(uid);
  const touchedUsers = await scrubUserReferences(uid, removedPosts);
  const removedFromGlobalUsers = await removeFromGlobalUsers(uid);
  const searchIndexDeleted = await deleteUserSearchIndexDoc(uid);
  const handleDocsDeleted = await deleteHandleRegistryEntries(uid, handleLowerCandidates);
  const publicProfileDeleted = await deleteUserPublicDoc(uid);
  const privateArtifacts = await deleteUsersPrivateArtifacts(uid).catch((error) => {
    console.warn(
      `[warn] Failed to delete usersPrivate artifacts for ${uid}:`,
      error?.message || error
    );
    return {
      notificationsDeleted: 0,
      recentFoodsDeleted: 0,
      foodLogDaysDeleted: 0,
      foodEntriesDeleted: 0,
      docDeleted: false,
    };
  });

  const authDeleted = await deleteAuthUser(uid);

  if (userExists) {
    await docSnap.ref.delete().catch(() => { });
  } else {
    await db.collection("users").doc(uid).delete().catch(() => { });
  }

  console.log(`\n✅ Account removal summary for ${resolvedHandle || uid}:`);
  console.log(`   • Placeholder name applied: ${identityResult?.nameChanged ? "yes" : "no"}`);
  console.log(`   • Placeholder handle: ${identityResult?.newHandle || "(unchanged)"}`);
  console.log(`   • Posts deleted: ${removedPosts.length}`);
  console.log(`   • Workouts deleted: ${removedWorkouts.length}`);
  console.log(`   • Global post list removals: ${postCleanup.removedFromGlobal}`);
  console.log(`   • Global ownerMap entries removed: ${postCleanup.removedFromOwnerMap}`);
  console.log(`   • Explore post list removals: ${exploreCleanup}`);
  console.log(`   • Message chats updated: ${messageCleanup.updatedChats}`);
  console.log(`   • Message chats deleted: ${messageCleanup.deletedChats}`);
  console.log(`   • Individual messages purged: ${messageCleanup.removedMessages}`);
  console.log(`   • Chat placeholders applied: ${messageCleanup.placeholdersApplied}`);
  console.log(`   • Tribes updated: ${tribeCleanup.updated}`);
  console.log(`   • Tribes deleted: ${tribeCleanup.deleted}`);
  console.log(`   • Other user documents scrubbed: ${touchedUsers}`);
  console.log(`   • Removed from global users registry: ${removedFromGlobalUsers ? "yes" : "no"}`);
  console.log(`   • Public profile deleted: ${publicProfileDeleted ? "yes" : "no"}`);
  console.log(`   • Private profile deleted: ${privateArtifacts.docDeleted ? "yes" : "no"}`);
  console.log(`   • Private notifications deleted: ${privateArtifacts.notificationsDeleted}`);
  console.log(`   • Private recent foods deleted: ${privateArtifacts.recentFoodsDeleted}`);
  console.log(`   • Private food log days deleted: ${privateArtifacts.foodLogDaysDeleted}`);
  console.log(`   • Private food entries deleted: ${privateArtifacts.foodEntriesDeleted}`);
  console.log(`   • Handle registry entries removed: ${handleDocsDeleted}`);
  console.log(`   • Search index deleted: ${searchIndexDeleted ? "yes" : "no"}`);
  console.log(`   • Auth account deleted: ${authDeleted ? "yes" : "not found/failed"}`);

  const completionLabel = resolvedHandle || normaliseHandle(handleHint) || uid;
  console.log(`\n🧹 Completed removal of ${completionLabel}.`);

  return {
    uid,
    handle: resolvedHandle,
    postsDeleted: removedPosts.length,
    workoutsDeleted: removedWorkouts.length,
    globalPostsRemoved: postCleanup.removedFromGlobal,
    globalOwnerEntriesRemoved: postCleanup.removedFromOwnerMap,
    explorePostsRemoved: exploreCleanup,
    chatsUpdated: messageCleanup.updatedChats,
    chatsDeleted: messageCleanup.deletedChats,
    messagesPurged: messageCleanup.removedMessages,
    chatPlaceholdersApplied: messageCleanup.placeholdersApplied,
    tribesUpdated: tribeCleanup.updated,
    tribesDeleted: tribeCleanup.deleted,
    otherUsersScrubbed: touchedUsers,
    removedFromGlobalUsers,
    publicProfileDeleted,
    privateProfileDeleted: Boolean(privateArtifacts.docDeleted),
    privateNotificationsDeleted: privateArtifacts.notificationsDeleted,
    privateRecentFoodsDeleted: privateArtifacts.recentFoodsDeleted,
    privateFoodLogDaysDeleted: privateArtifacts.foodLogDaysDeleted,
    privateFoodEntriesDeleted: privateArtifacts.foodEntriesDeleted,
    handleRegistryEntriesRemoved: handleDocsDeleted,
    handleCandidatesConsidered: handleLowerCandidates,
    placeholderNameApplied: Boolean(identityResult?.nameChanged),
    placeholderHandle: identityResult?.newHandle || null,
    searchIndexDeleted,
    authDeleted,
    userDocDeleted: userExists,
  };
}

export async function deleteUserAndContentByUid(uid, { handleHint = "", userDocSnap = null } = {}) {
  if (!uid) {
    throw new Error("A uid is required for account deletion.");
  }
  return deleteUserCore(uid, { handleHint, userDocSnap });
}

export async function deleteUserAndContentByHandle(handle) {
  const userDoc = await findUserByHandle(handle);
  return deleteUserCore(userDoc.id, { userDocSnap: userDoc, handleHint: handle });
}
