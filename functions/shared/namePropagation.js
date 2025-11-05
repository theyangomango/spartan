import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { findUserByHandle } from "./handlePropagation.js";

let cachedDb = null;
function getDb() {
  if (!cachedDb) {
    cachedDb = getFirestore();
  }
  return cachedDb;
}

const USERS_BATCH_SIZE = 200;
const GENERIC_BATCH_SIZE = 200;
const PRIMARY_USER_COLLECTION = "usersPublic";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normaliseName(raw) {
  if (raw === undefined || raw === null) return "";
  return String(raw).trim();
}

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function withOriginalWhitespace(original, replacement) {
  if (typeof original !== "string") return replacement;
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return `${leading}${replacement}${trailing}`;
}

const DISALLOWED_NAME_SEGMENTS = [
  "username",
  "handle",
  "template",
  "workout",
  "exercise",
  "movement",
  "meal",
  "food",
  "ingredient",
  "recipe",
  "macro",
  "stat",
  "plan",
  "program",
  "routine",
  "week",
  "day",
  "month",
  "year",
  "session",
  "setname",
  "repname",
  "mixname",
];

const LIKELY_NAME_PREFIXES = [
  "",
  "display",
  "full",
  "owner",
  "creator",
  "sender",
  "from",
  "friend",
  "member",
  "participant",
  "partner",
  "teammate",
  "target",
  "recipient",
  "requester",
  "inviter",
  "invitee",
  "viewer",
  "leader",
  "captain",
  "host",
  "coach",
  "trainer",
  "athlete",
  "author",
  "profile",
  "user",
  "admin",
  "moderator",
];

function cleanKey(key) {
  return (key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isLikelyNameKey(keyLc, parentLc) {
  const keyClean = cleanKey(keyLc);
  const parentClean = cleanKey(parentLc);

  const collection = [keyClean, parentClean];
  for (const candidate of collection) {
    if (!candidate) continue;
    if (DISALLOWED_NAME_SEGMENTS.some((segment) => candidate.includes(segment))) {
      return false;
    }
  }

  if (keyClean === "name" || keyClean === "displayname" || keyClean === "fullname") {
    return true;
  }
  if (parentClean === "name" || parentClean === "displayname" || parentClean === "fullname") {
    return true;
  }

  for (const candidate of collection) {
    if (!candidate) continue;
    if (!candidate.endsWith("name")) continue;
    const prefix = candidate.slice(0, -4);
    if (LIKELY_NAME_PREFIXES.includes(prefix)) return true;
  }

  return false;
}

function isLowerKey(keyLc, parentLc) {
  if (!keyLc && !parentLc) return false;
  return Boolean(
    (keyLc && keyLc.includes("lower")) ||
      (parentLc && parentLc.includes("lower")) ||
      (keyLc && keyLc.endsWith("_lc")) ||
      (parentLc && parentLc.endsWith("_lc"))
  );
}

let replaceConfig = null;

function matchesOldName(value) {
  if (!replaceConfig || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  for (const entry of replaceConfig.oldNames) {
    if (trimmed === entry.original || lower === entry.lower) {
      return true;
    }
  }
  return false;
}

function transformString(value, key, parentKey) {
  if (!replaceConfig || typeof value !== "string") return value;

  const keyLc = (key || "").toLowerCase();
  const parentLc = (parentKey || "").toLowerCase();
  const isLowerField = isLowerKey(keyLc, parentLc);
  const isNameField = isLikelyNameKey(keyLc, parentLc);

  if (!isLowerField && !isNameField) {
    if (!matchesOldName(value)) return value;
  } else if (!matchesOldName(value)) {
    return value;
  }

  const replacement = isLowerField ? replaceConfig.newNameLower : replaceConfig.newName;
  return withOriginalWhitespace(value, replacement);
}

function replaceNamesInPlace(value, path) {
  if (Array.isArray(value)) {
    let changed = false;
    for (let i = 0; i < value.length; i += 1) {
      const result = replaceNamesInPlace(value[i], path.concat(String(i)));
      if (result.replaced) {
        value[i] = result.value;
        changed = true;
      }
    }
    return { replaced: changed, value };
  }

  if (isPlainObject(value)) {
    let changed = false;
    for (const key of Object.keys(value)) {
      const result = replaceNamesInPlace(value[key], path.concat(key));
      if (result.replaced) {
        value[key] = result.value;
        changed = true;
      }
    }
    return { replaced: changed, value };
  }

  if (typeof value === "string") {
    const key = path[path.length - 1] || "";
    const parentKey = path[path.length - 2] || "";
    const next = transformString(value, key, parentKey);
    return next !== value ? { replaced: true, value: next } : { replaced: false, value };
  }

  return { replaced: false, value };
}

async function processUsers(uid) {
  console.log(`[${PRIMARY_USER_COLLECTION}] scanning...`);
  const ids = [];
  let processed = 0;
  let mutated = 0;
  let lastDoc = null;

  while (true) {
    let query = getDb().collection(PRIMARY_USER_COLLECTION).orderBy("__name__").limit(USERS_BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = getDb().batch();
    let writes = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() || {};
      ids.push(docSnap.id);
      const { replaced } = replaceNamesInPlace(data, []);
      let docChanged = replaced;

      if (docSnap.id === uid && replaceConfig) {
        const { newName, newNameLower } = replaceConfig;
        const candidates = [
          "name",
          "displayName",
          "display_name",
          "fullName",
          "full_name",
          "profileName",
        ];

        for (const key of candidates) {
          if (typeof data[key] === "string" && matchesOldName(data[key])) {
            data[key] = withOriginalWhitespace(data[key], newName);
            docChanged = true;
          }
        }

        if (data.name === undefined || data.name === null || data.name === "") {
          data.name = newName;
          docChanged = true;
        }

        if (typeof data.displayName !== "string" || !data.displayName.trim()) {
          data.displayName = newName;
          docChanged = true;
        }

        if (typeof data.display_name === "string" && !data.display_name.trim()) {
          data.display_name = newName;
          docChanged = true;
        }

        data.name_lower = newNameLower;
        docChanged = true;

        if (Array.isArray(data.searchKeywords)) {
          const nextKeywords = data.searchKeywords.map((entry) => {
            if (typeof entry !== "string") return entry;
            if (matchesOldName(entry)) return withOriginalWhitespace(entry, newName);
            if (entry.trim().toLowerCase() === newNameLower) return entry;
            return entry;
          });
          if (JSON.stringify(nextKeywords) !== JSON.stringify(data.searchKeywords)) {
            data.searchKeywords = nextKeywords;
            docChanged = true;
          }
        }

        data.updatedAt = FieldValue.serverTimestamp();
        docChanged = true;
      }

      if (docChanged) {
        batch.set(docSnap.ref, data, { merge: false });
        writes += 1;
        mutated += 1;
      }
    }

    if (writes) {
      await batch.commit();
      await sleep(50);
    }

    processed += snapshot.size;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  console.log(`[${PRIMARY_USER_COLLECTION}] processed ${processed} docs, updated ${mutated}`);
  return { ids, mutated };
}

async function processCollection(path, { label = path, limit = GENERIC_BATCH_SIZE, quiet = false, logOnlyIfChanged = false } = {}) {
  let processed = 0;
  let mutated = 0;
  let lastDoc = null;

  while (true) {
    let query = getDb().collection(path).orderBy("__name__").limit(limit);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = getDb().batch();
    let writes = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (!data) continue;
      const { replaced } = replaceNamesInPlace(data, []);
      if (replaced) {
        batch.set(docSnap.ref, data, { merge: false });
        writes += 1;
        mutated += 1;
      }
    }

    if (writes) {
      await batch.commit();
      await sleep(25);
    }

    processed += snapshot.size;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  if (!quiet) {
    if (!logOnlyIfChanged || mutated > 0) {
      console.log(`[${label}] processed ${processed} docs, updated ${mutated}`);
    }
  } else if (mutated > 0) {
    console.log(`[${label}] updated ${mutated}`);
  }

  return { processed, mutated };
}

async function processGlobalDocs() {
  console.log("[global] scanning...");
  const snapshot = await getDb().collection("global").get();
  if (snapshot.empty) {
    console.log("[global] no documents found.");
    return { mutated: 0 };
  }

  const batch = getDb().batch();
  let mutated = 0;
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (!data) continue;
    const { replaced } = replaceNamesInPlace(data, []);
    if (replaced) {
      batch.set(docSnap.ref, data, { merge: false });
      mutated += 1;
    }
  }

  if (mutated) {
    await batch.commit();
    await sleep(25);
  }

  console.log(`[global] updated ${mutated} document(s)`);
  return { mutated };
}

async function processMessages() {
  console.log("[messages] scanning...");
  const ids = [];
  let processed = 0;
  let mutated = 0;
  let lastDoc = null;

  while (true) {
    let query = getDb().collection("messages").orderBy("__name__").limit(GENERIC_BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = getDb().batch();
    let writes = 0;

    for (const docSnap of snapshot.docs) {
      ids.push(docSnap.id);
      const data = docSnap.data();
      if (!data) continue;
      const { replaced } = replaceNamesInPlace(data, []);
      if (replaced) {
        batch.set(docSnap.ref, data, { merge: false });
        writes += 1;
        mutated += 1;
      }
    }

    if (writes) {
      await batch.commit();
      await sleep(25);
    }

    processed += snapshot.size;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  console.log(`[messages] processed ${processed} docs, updated ${mutated}`);
  return { ids, mutated };
}

async function processUserSubcollection(userIds, baseCollection, subcollection) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  let totalMutated = 0;
  for (const uid of userIds) {
    const path = `${baseCollection}/${uid}/${subcollection}`;
    const { mutated } = await processCollection(path, { label: path, quiet: true, logOnlyIfChanged: true });
    totalMutated += mutated;
  }
  if (totalMutated > 0) {
    console.log(`[${baseCollection}/*/${subcollection}] updated ${totalMutated} docs`);
  }
}

export function buildOldNamesSet({ userData, explicitOldName }) {
  const rawNames = new Set();
  const push = (value) => {
    const trimmed = normaliseName(value);
    if (trimmed) rawNames.add(trimmed);
  };

  push(explicitOldName);
  push(userData?.name);
  push(userData?.displayName);
  push(userData?.display_name);
  push(userData?.fullName);
  push(userData?.full_name);

  if (Array.isArray(userData?.aliases)) {
    for (const alias of userData.aliases) push(alias);
  }

  const names = [];
  for (const entry of rawNames) {
    names.push({ original: entry, lower: entry.toLowerCase() });
  }
  return names;
}

export async function resolveUserDoc(identifier) {
  if (!identifier) throw new Error("Identifier is required.");
  const direct = await getDb().collection(PRIMARY_USER_COLLECTION).doc(identifier).get();
  if (direct.exists) return direct;
  try {
    return await findUserByHandle(identifier);
  } catch (error) {
    throw new Error(`Could not resolve user for identifier "${identifier}"`);
  }
}

export async function propagateNameChange({ uid, oldNames, newName }) {
  const normalizedNewName = normaliseName(newName);
  if (!uid || !normalizedNewName) {
    console.log("propagateNameChange: missing uid/newName, skipping.");
    return;
  }
  const validOldNames = Array.isArray(oldNames) && oldNames.length
    ? oldNames
    : [{ original: normalizedNewName, lower: normalizedNewName.toLowerCase() }];

  replaceConfig = {
    targetUid: uid,
    oldNames: validOldNames,
    newName: normalizedNewName,
    newNameLower: normalizedNewName.toLowerCase(),
  };

  console.log(`propagateNameChange: updating name references for uid ${uid}`);

  const { ids: userIds } = await processUsers(uid);

  await processGlobalDocs();

  const additionalCollections = ["posts", "workouts", "workoutInvites", "tribes"];
  for (const collectionName of additionalCollections) {
    await processCollection(collectionName, { label: collectionName, limit: GENERIC_BATCH_SIZE });
  }

  const { ids: messageIds } = await processMessages();
  for (const cid of messageIds) {
    await processCollection(`messages/${cid}/content`, {
      label: `messages/${cid}/content`,
      quiet: true,
      logOnlyIfChanged: true,
      limit: 200,
    });
  }

  await processUserSubcollection(userIds, "usersPrivate", "notifications");

  replaceConfig = null;
  console.log("propagateNameChange: completed name migration.");
}

export default {
  normaliseName,
  resolveUserDoc,
  buildOldNamesSet,
  propagateNameChange,
};
