import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const USERS_BATCH_SIZE = 200;
const GENERIC_BATCH_SIZE = 200;

try {
  initializeApp();
} catch {
  // ignore: app may already be initialised
}

const db = getFirestore();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normaliseHandle(raw) {
  if (raw === undefined || raw === null) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  const noAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return noAt.trim();
}

function normaliseName(raw) {
  if (raw === undefined || raw === null) return "";
  return String(raw).trim();
}

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function toStringSafe(value) {
  if (value === undefined || value === null) return "";
  return String(value);
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

function withOriginalWhitespace(original, replacement) {
  if (typeof original !== "string") return replacement;
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  return `${leading}${replacement}${trailing}`;
}

function isLowerKey(keyLc, parentLc) {
  if (!keyLc && !parentLc) return false;
  return Boolean(
    (keyLc && keyLc.includes("lower")) ||
      (parentLc && parentLc.includes("lower")) ||
      (keyLc && keyLc.endsWith("_lc")) ||
      (parentLc && parentLc.endsWith("_lc")),
  );
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

function transformString(value, key, parentKey) {
  if (!replaceConfig || typeof value !== "string") return value;

  const keyLc = (key || "").toLowerCase();
  const parentLc = (parentKey || "").toLowerCase();

  const isLowerField = isLowerKey(keyLc, parentLc);
  const isNameField = isLikelyNameKey(keyLc, parentLc);

  if (!isLowerField && !isNameField) {
    // Still replace when value exactly matches the old name
    if (!matchesOldName(value)) return value;
  } else if (!matchesOldName(value)) {
    return value;
  }

  const replacement = isLowerField ? replaceConfig.newNameLower : replaceConfig.newName;
  return withOriginalWhitespace(value, replacement);
}

function candidateUidMatches(value) {
  if (!replaceConfig || !replaceConfig.targetUid) return false;
  if (!value || typeof value !== "object") return false;
  const uid = replaceConfig.targetUid;

  const candidateKeys = [
    "uid",
    "userUid",
    "userID",
    "userId",
    "creatorUid",
    "creatorUID",
    "ownerUid",
    "ownerUID",
    "memberUid",
    "memberUID",
    "friendUid",
    "friendUID",
    "participantUid",
    "participantUID",
    "senderUid",
    "senderUID",
    "fromUid",
    "fromUID",
    "targetUid",
    "targetUID",
    "recipientUid",
    "recipientUID",
    "requesterUid",
    "requesterUID",
    "profileUid",
    "profileUID",
    "personUid",
    "personUID",
    "id",
    "uidStr",
  ];

  for (const key of candidateKeys) {
    if (key in value) {
      const candidate = toStringSafe(value[key]).trim();
      if (candidate && candidate === uid) return true;
    }
  }
  return false;
}

function updateObjectNameFields(obj) {
  if (!replaceConfig) return false;
  let changed = false;
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value !== "string") continue;
    const next = transformString(value, key, "");
    if (next !== value) {
      obj[key] = next;
      changed = true;
    }
  }
  return changed;
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
    if (candidateUidMatches(value)) {
      const updated = updateObjectNameFields(value);
      if (updated) changed = true;
    }

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

async function findUserByHandle(rawHandle) {
  const handle = normaliseHandle(rawHandle);
  if (!handle) {
    throw new Error("A non-empty handle is required to resolve the user.");
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

async function resolveUserDoc(identifier) {
  if (!identifier) throw new Error("Identifier is required.");
  const direct = await db.collection("users").doc(identifier).get();
  if (direct.exists) return direct;
  return findUserByHandle(identifier);
}

async function processUsers(targetUid) {
  console.log("[users] scanning...");
  const ids = [];
  let processed = 0;
  let mutated = 0;
  let lastDoc = null;

  while (true) {
    let query = db.collection("users").orderBy("__name__").limit(USERS_BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let writes = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() || {};
      ids.push(docSnap.id);

      const { replaced } = replaceNamesInPlace(data, []);
      let docChanged = replaced;

      if (docSnap.id === targetUid && replaceConfig) {
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

        if (typeof data.name_lower === "string") {
          if (data.name_lower !== newNameLower) {
            data.name_lower = newNameLower;
            docChanged = true;
          }
        } else {
          data.name_lower = newNameLower;
          docChanged = true;
        }

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

  console.log(`[users] processed ${processed} docs, updated ${mutated}`);
  return { ids, mutated };
}

async function processCollection(path, { label = path, limit = GENERIC_BATCH_SIZE, quiet = false, logOnlyIfChanged = false } = {}) {
  let processed = 0;
  let mutated = 0;
  let lastDoc = null;

  while (true) {
    let query = db.collection(path).orderBy("__name__").limit(limit);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
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
  const snapshot = await db.collection("global").get();
  if (snapshot.empty) {
    console.log("[global] no documents found.");
    return { mutated: 0 };
  }

  const batch = db.batch();
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
    let query = db.collection("messages").orderBy("__name__").limit(GENERIC_BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
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

async function processUserSubcollection(userIds, subcollection) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  let totalMutated = 0;
  for (const uid of userIds) {
    const path = `users/${uid}/${subcollection}`;
    const { mutated } = await processCollection(path, { label: path, quiet: true, logOnlyIfChanged: true });
    totalMutated += mutated;
  }
  if (totalMutated > 0) {
    console.log(`[users/*/${subcollection}] updated ${totalMutated} docs`);
  }
}

function buildOldNamesSet({ userData, explicitOldName }) {
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

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node functions/scripts/switchUserName.js <uidOrHandle> <newName> [oldName]");
    process.exit(1);
  }

  const identifier = args[0];
  const newNameInput = normaliseName(args[1]);
  const providedOldName = normaliseName(args.slice(2).join(" "));

  if (!newNameInput) {
    console.error("New name must be non-empty.");
    process.exit(1);
  }

  const userDoc = await resolveUserDoc(identifier);
  const uid = userDoc.id;
  const data = userDoc.data() || {};

  const oldNames = buildOldNamesSet({ userData: data, explicitOldName: providedOldName });
  if (!oldNames.length) {
    console.error("Could not determine the existing name. Provide it explicitly as the third argument.");
    process.exit(1);
  }

  const representativeOldName = oldNames[0].original;
  if (representativeOldName.toLowerCase() === newNameInput.toLowerCase()) {
    console.log("New name matches existing name (case-insensitive). Nothing to change.");
    return;
  }

  const newNameLower = newNameInput.toLowerCase();

  replaceConfig = {
    targetUid: uid,
    oldNames,
    newName: newNameInput,
    newNameLower,
  };

  console.log(`Switching name for uid ${uid}`);
  console.log(`   from "${representativeOldName}" to "${newNameInput}"`);

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

  await processUserSubcollection(userIds, "notifications");

  console.log("✅ Name switch complete.");
}

main().catch((error) => {
  console.error("switchUserName failed:", error);
  process.exit(1);
});
