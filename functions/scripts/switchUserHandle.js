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

function stripAt(value) {
  const str = typeof value === "string" ? value.trim() : "";
  if (!str) return "";
  return str.startsWith("@") ? str.slice(1) : str;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let replaceConfig = null;

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function transformString(value, key, parentKey) {
  if (!replaceConfig) return value;
  if (typeof value !== "string") return value;
  const { oldHandle, oldHandleLower, newHandle, newHandleLower, oldHandleAt, newHandleAt } = replaceConfig;

  const trimmed = value.trim();
  if (!trimmed) return value;

  const lower = trimmed.toLowerCase();
  const keyLc = (key || "").toLowerCase();
  const parentLc = (parentKey || "").toLowerCase();

  const stripped = stripAt(trimmed);
  const strippedLower = stripped.toLowerCase();

  const isLowerField = keyLc.includes("lower") || parentLc.includes("lower");
  const isHandleField =
    keyLc.includes("handle") ||
    parentLc.includes("handle") ||
    keyLc === "tag" ||
    parentLc === "tag" ||
    keyLc.includes("username") ||
    parentLc.includes("username");

  if (isLowerField) {
    if (lower === oldHandleLower || strippedLower === oldHandleLower) {
      return trimmed.startsWith("@") ? `@${newHandleLower}` : newHandleLower;
    }
  }

  if (isHandleField) {
    if (strippedLower === oldHandleLower) {
      const prefix = trimmed.startsWith("@") ? "@" : "";
      const target = isLowerField ? newHandleLower : newHandle;
      return `${prefix}${target}`;
    }
  }

  if (lower === oldHandleLower) {
    return isLowerField ? newHandleLower : newHandle;
  }
  if (lower === oldHandleAt.toLowerCase()) {
    return newHandleAt;
  }
  if (trimmed === oldHandle || trimmed === oldHandleAt) {
    return trimmed.startsWith("@") ? newHandleAt : newHandle;
  }

  if (!keyLc && !parentLc && strippedLower === oldHandleLower) {
    return trimmed.startsWith("@") ? newHandleAt : newHandle;
  }

  let next = value;
  const directPattern = new RegExp(`@${escapeRegExp(oldHandle)}`, "g");
  const lowerPattern = new RegExp(`@${escapeRegExp(oldHandleLower)}`, "g");
  if (directPattern.test(next)) {
    next = next.replace(directPattern, `@${newHandle}`);
  }
  if (lowerPattern.test(next)) {
    next = next.replace(lowerPattern, `@${newHandle}`);
  }

  return next;
}

function replaceHandlesInPlace(value, path) {
  if (Array.isArray(value)) {
    let changed = false;
    for (let i = 0; i < value.length; i += 1) {
      const result = replaceHandlesInPlace(value[i], path.concat(String(i)));
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
      const result = replaceHandlesInPlace(value[key], path.concat(key));
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

async function ensureHandleAvailable(newHandle, uid) {
  const lower = newHandle.toLowerCase();
  const candidates = [
    { field: "handle", value: newHandle },
    { field: "handle", value: `@${newHandle}` },
    { field: "handle", value: lower },
    { field: "handle_lower", value: lower },
    { field: "username", value: newHandle },
    { field: "username", value: lower },
    { field: "username_lower", value: lower },
    { field: "tag", value: newHandle },
    { field: "tag", value: lower },
  ];

  const tried = new Set();
  for (const { field, value } of candidates) {
    if (!value || tried.has(`${field}:${value}`)) continue;
    tried.add(`${field}:${value}`);
    const snapshot = await db.collection("users").where(field, "==", value).limit(1).get();
    if (snapshot.empty) continue;
    const doc = snapshot.docs[0];
    if (doc && doc.id !== uid) {
      throw new Error(`Handle "${newHandle}" conflicts with existing user (${field}).`);
    }
  }
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
      const { replaced } = replaceHandlesInPlace(data, []);
      let docChanged = replaced;

      if (docSnap.id === targetUid && replaceConfig) {
        const { newHandle, newHandleLower, oldHandleLower } = replaceConfig;

        if (stripAt(data.handle).toLowerCase() !== newHandleLower) {
          data.handle = newHandle;
          docChanged = true;
        }

        if (data.handle_lower !== newHandleLower) {
          data.handle_lower = newHandleLower;
          docChanged = true;
        }

        if (typeof data.username === "string") {
          const normalizedUsername = stripAt(data.username);
          if (normalizedUsername.toLowerCase() === oldHandleLower) {
            data.username = data.username.startsWith("@") ? `@${newHandle}` : newHandle;
            docChanged = true;
          }
        }

        if (typeof data.username_lower === "string" && data.username_lower.toLowerCase() === oldHandleLower) {
          data.username_lower = newHandleLower;
          docChanged = true;
        }

        if (typeof data.tag === "string") {
          const normalizedTag = stripAt(data.tag);
          if (normalizedTag.toLowerCase() === oldHandleLower) {
            data.tag = data.tag.startsWith("@") ? `@${newHandle}` : newHandle;
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
      const { replaced } = replaceHandlesInPlace(data, []);
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
    const { replaced } = replaceHandlesInPlace(data, []);
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
      const { replaced } = replaceHandlesInPlace(data, []);
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

async function main() {
  const [, , oldRaw, newRaw] = process.argv;
  if (!oldRaw || !newRaw) {
    console.error("Usage: node functions/scripts/switchUserHandle.js <oldHandle> <newHandle>");
    process.exit(1);
  }

  const oldHandleInput = normaliseHandle(oldRaw);
  const newHandleInput = normaliseHandle(newRaw);

  if (!oldHandleInput || !newHandleInput) {
    console.error("Both handles must be non-empty.");
    process.exit(1);
  }

  if (oldHandleInput.toLowerCase() === newHandleInput.toLowerCase()) {
    console.log("New handle matches old handle (case-insensitive). Nothing to change.");
    return;
  }

  const userDoc = await findUserByHandle(oldHandleInput);
  const uid = userDoc.id;
  const data = userDoc.data() || {};
  const existingHandle = normaliseHandle(data.handle || oldHandleInput);

  await ensureHandleAvailable(newHandleInput, uid);

  replaceConfig = {
    oldHandle: existingHandle,
    oldHandleLower: existingHandle.toLowerCase(),
    newHandle: newHandleInput,
    newHandleLower: newHandleInput.toLowerCase(),
    oldHandleAt: `@${existingHandle}`,
    newHandleAt: `@${newHandleInput}`,
  };

  console.log(`Switching handle for uid ${uid}`);
  console.log(`   from "${existingHandle}" to "${newHandleInput}"`);

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

  console.log("✅ Handle switch complete.");
}

main().catch((error) => {
  console.error("switchUserHandle failed:", error);
  process.exit(1);
});
