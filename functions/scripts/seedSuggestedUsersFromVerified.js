import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

try {
  initializeApp();
} catch {
  // App may already be initialized
}

const db = getFirestore();

const SOURCE_COLLECTION = "users";
const TARGET_COLLECTION = "global";
const TARGET_DOCUMENT = "suggestedUsers";

const toStringSafe = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  return str;
};

const resolveHandle = (data = {}) => {
  for (const key of ["handle", "username", "tag"]) {
    const raw = data[key];
    if (!raw) continue;
    const str = toStringSafe(raw);
    if (str) return str.replace(/^@+/, "");
  }
  const fallbacks = [data.name, data.displayName];
  for (const item of fallbacks) {
    const str = toStringSafe(item);
    if (str) return str.replace(/\s+/g, "").slice(0, 32);
  }
  return "";
};

const resolveName = (data = {}) => {
  for (const key of ["name", "displayName", "fullName"]) {
    const str = toStringSafe(data[key]);
    if (str) return str;
  }
  return resolveHandle(data);
};

const resolvePfp = (data = {}) => {
  for (const key of ["pfp", "photoURL", "image"]) {
    const str = toStringSafe(data[key]);
    if (str) return str;
  }
  return "";
};

const resolvePfpVersion = (data = {}) => {
  const raw = data?.pfpVersion ?? data?.photoVersion ?? data?.imageVersion ?? 0;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
};

const normalizeUser = (docSnap) => {
  const data = docSnap.data() || {};
  const uid = docSnap.id;
  const handle = resolveHandle(data);
  const name = resolveName(data);
  const pfp = resolvePfp(data);
  const pfpVersion = resolvePfpVersion(data);

  return {
    uid,
    handle,
    name,
    pfp,
    photoURL: pfp,
    pfpVersion,
    isVerified: true,
    tagline: toStringSafe(data.tagline || data.bio || ""),
    bio: toStringSafe(data.bio || ""),
    location: toStringSafe(data.location || ""),
  };
};

const mergeDocs = (targetMap, docs) => {
  docs.forEach((docSnap) => {
    const normalized = normalizeUser(docSnap);
    if (!normalized?.uid) return;
    targetMap.set(normalized.uid, normalized);
  });
};

async function fetchVerifiedDocs(fieldName) {
  const snap = await db.collection(SOURCE_COLLECTION).where(fieldName, "==", true).get();
  return snap.docs;
}

function sortUsers(users) {
  return users.sort((a, b) => {
    const aKey = (a.handle || a.name || "").toLowerCase();
    const bKey = (b.handle || b.name || "").toLowerCase();
    if (aKey < bKey) return -1;
    if (aKey > bKey) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });
}

async function main() {
  console.log("Fetching verified users…");
  const map = new Map();

  const [isVerifiedDocs, verifiedDocs] = await Promise.all([
    fetchVerifiedDocs("isVerified"),
    fetchVerifiedDocs("verified"),
  ]);

  mergeDocs(map, isVerifiedDocs);
  mergeDocs(map, verifiedDocs);

  const users = sortUsers(Array.from(map.values()));
  console.log(`Resolved ${users.length} verified user(s). Updating ${TARGET_COLLECTION}/${TARGET_DOCUMENT}…`);

  await db
    .collection(TARGET_COLLECTION)
    .doc(TARGET_DOCUMENT)
    .set(
      {
        list: users,
        total: users.length,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  console.log("Suggested users document updated.");
}

main().catch((error) => {
  console.error("seedSuggestedUsersFromVerified failed:", error);
  process.exit(1);
});
