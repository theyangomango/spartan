import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

try {
  initializeApp();
} catch {
  // Ignore double initialisation when running in emulator/tests.
}

const db = getFirestore();

const toNumberOrDefault = (value, defaultValue) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
};

const usage = () => {
  console.log(
    "\nUsage: node functions/scripts/addFeaturedGlobalPost.js <pid> [priority=100] [boostScore=0] [expiresInMinutes]\n"
  );
};

async function main() {
  const [, , pidArg, priorityArg, boostArg, ttlMinutesArg] = process.argv;
  const pid = typeof pidArg === "string" ? pidArg.trim() : "";
  if (!pid) {
    usage();
    throw new Error("A post id (pid) is required.");
  }

  const priority = toNumberOrDefault(priorityArg, 100);
  const boostScore = toNumberOrDefault(boostArg, 0);
  const ttlMinutes = toNumberOrDefault(ttlMinutesArg, NaN);
  const expiresAt =
    Number.isFinite(ttlMinutes) && ttlMinutes > 0
      ? Timestamp.fromMillis(Date.now() + ttlMinutes * 60 * 1000)
      : null;

  const docId = pid.replace(/\//g, "_");
  const docRef = db.collection("globalTrendingPosts").doc(docId);
  const payload = {
    pid,
    priority,
    boostScore,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (expiresAt) {
    payload.expiresAt = expiresAt;
  }

  await docRef.set(payload, { merge: true });

  console.log(`✅ Featured post stored in globalTrendingPosts/${docId}`);
  console.log(
    `   pid=${pid}, priority=${priority}, boostScore=${boostScore}${
      expiresAt ? `, expiresAt=${expiresAt.toDate().toISOString()}` : ""
    }`
  );
}

main().catch((error) => {
  console.error("addFeaturedGlobalPost failed:", error?.message || error);
  process.exit(1);
});
