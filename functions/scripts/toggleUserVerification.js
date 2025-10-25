import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

try {
  initializeApp();
} catch {
  // ignore: app may already be initialized
}

const db = getFirestore();

function normaliseHandle(raw) {
  if (raw === null || raw === undefined) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

async function findUserByHandle(rawHandle) {
  const handle = normaliseHandle(rawHandle);
  if (!handle) throw new Error("A non-empty handle is required.");

  const lower = handle.toLowerCase();
  const candidates = [
    { field: "handle", value: handle },
    { field: "handle", value: `@${handle}` },
    { field: "handle_lower", value: lower },
    { field: "username", value: handle },
    { field: "username_lower", value: lower },
    { field: "tag", value: handle },
  ];

  const tried = new Set();
  for (const { field, value } of candidates) {
    if (!value || tried.has(`${field}:${value}`)) continue;
    tried.add(`${field}:${value}`);

    const snap = await db.collection("users").where(field, "==", value).limit(2).get();
    if (snap.empty) continue;
    if (snap.size > 1) {
      throw new Error(`Multiple users matched ${field} = "${value}".`);
    }
    return snap.docs[0];
  }

  throw new Error(`No user found for handle "${rawHandle}".`);
}

async function resolveUserDoc(identifier) {
  const trimmed = String(identifier || "").trim();
  if (!trimmed) throw new Error("Provide a user UID or handle.");

  const uidDoc = await db.collection("users").doc(trimmed).get();
  if (uidDoc.exists) {
    return uidDoc;
  }

  return await findUserByHandle(trimmed);
}

function coerceBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value == null) return false;
  return Boolean(value);
}

async function main() {
  const [, , identifier] = process.argv;
  if (!identifier) {
    console.error("Usage: node functions/scripts/toggleUserVerification.js <uid-or-handle>");
    process.exit(1);
  }

  const docSnap = await resolveUserDoc(identifier);
  const uid = docSnap.id;
  const data = docSnap.data() || {};

  const current = coerceBoolean(data.isVerified ?? data.verified ?? false);
  const next = !current;

  await docSnap.ref.set(
    {
      isVerified: next,
      verified: next,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`User ${uid} (${data.handle || data.username || data.name || "unknown"}) verification toggled: ${current} -> ${next}`);
}

main().catch((error) => {
  console.error("toggleUserVerification failed:", error);
  process.exit(1);
});
