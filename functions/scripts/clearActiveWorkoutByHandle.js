import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

try {
  initializeApp();
} catch {
  // ignore double initialisation when running in the emulator
}

const db = getFirestore();

const normaliseHandle = (raw) => {
  if (raw === null || raw === undefined) return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
};

const toUidString = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (typeof value === "object") {
    const candidates = [
      value.uid,
      value.userUid,
      value.id,
      value.creatorUid,
      value.ownerUid,
      value.userID,
      value.userUID,
    ];
    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) continue;
      const stringified = String(candidate).trim();
      if (stringified) return stringified;
    }
  }
  return "";
};

const filterOutUid = (arr, uidStr) => {
  if (!uidStr) return Array.isArray(arr) ? arr.slice() : [];
  const safeUid = String(uidStr).trim();
  return (Array.isArray(arr) ? arr : []).filter((entry) => toUidString(entry) !== safeUid);
};

async function findUserByHandle(rawHandle) {
  const handle = normaliseHandle(rawHandle);
  if (!handle) {
    throw new Error("A non-empty handle is required.");
  }

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

    const snapshot = await db.collection("users").where(field, "==", value).limit(2).get();
    if (snapshot.empty) continue;
    if (snapshot.size > 1) {
      throw new Error(`Multiple users matched by ${field} = "${value}". Aborting.`);
    }
    return snapshot.docs[0];
  }

  throw new Error(`No user found for handle "${rawHandle}".`);
}

async function clearCurrentWorkoutEntries(uid) {
  const uidStr = String(uid || "").trim();
  if (!uidStr) return;

  const payload = {
    currentWorkout: null,
    updatedAt: FieldValue.serverTimestamp(),
  };
  const targets = ["users", "usersPublic", "usersPrivate"];
  await Promise.all(
    targets.map(async (collection) => {
      try {
        await db.collection(collection).doc(uidStr).set(payload, { merge: true });
      } catch (error) {
        console.log(`clearCurrentWorkoutEntries: failed for ${collection}/${uidStr}`, error?.message || error);
      }
    })
  );
}

async function deleteWorkoutInvites(widStr, uidStr) {
  if (!widStr || !uidStr) return 0;
  const inviteRef = db.collection("workoutInvites");
  let removed = 0;

  const targets = [
    ["fromUid", uidStr],
    ["toUid", uidStr],
  ];

  for (const [field, value] of targets) {
    try {
      const snapshot = await inviteRef.where("wid", "==", widStr).where(field, "==", value).get();
      if (snapshot.empty) continue;
      const batch = db.batch();
      snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
      removed += snapshot.size;
    } catch (error) {
      console.log(
        `deleteWorkoutInvites: failed for wid=${widStr} ${field}=${value}`,
        error?.message || error
      );
    }
  }

  return removed;
}

async function removeUserFromWorkout(wid, uid) {
  const widStr = String(wid || "").trim();
  const uidStr = String(uid || "").trim();
  if (!widStr || !uidStr) return { updatedWorkout: false, invitesRemoved: 0 };

  const workoutRef = db.collection("workouts").doc(widStr);
  let updatedWorkout = false;

  try {
    const snapshot = await workoutRef.get();
    if (snapshot.exists) {
      const data = snapshot.data() || {};
      const hadMembers = Array.isArray(data.members);
      const hadUsers = Array.isArray(data.users);
      const nextMembers = filterOutUid(data.members, uidStr);
      const nextUsers = filterOutUid(data.users, uidStr);
      const payload = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (hadMembers) payload.members = nextMembers;
      if (hadUsers) payload.users = nextUsers;

      const knownCounts = [];
      if (hadMembers) knownCounts.push(nextMembers.length);
      if (hadUsers) knownCounts.push(nextUsers.length);
      if (knownCounts.length > 0 && knownCounts.every((count) => count === 0)) {
        payload.active = false;
      }

      await workoutRef.set(payload, { merge: true });
      updatedWorkout = true;
    }
  } catch (error) {
    console.log(`removeUserFromWorkout: failed to update workout ${widStr}`, error?.message || error);
  }

  try {
    await workoutRef.collection("live").doc(uidStr).delete();
  } catch (error) {
    if (error?.code !== 5) {
      console.log(`removeUserFromWorkout: live presence delete failed for ${widStr}/${uidStr}`, error?.message || error);
    }
  }

  const invitesRemoved = await deleteWorkoutInvites(widStr, uidStr);

  return { updatedWorkout, invitesRemoved };
}

async function main() {
  const [, , rawHandle] = process.argv;
  if (!rawHandle) {
    console.error("Usage: node functions/scripts/clearActiveWorkoutByHandle.js <handle>");
    process.exit(1);
  }

  const userDoc = await findUserByHandle(rawHandle);
  const uid = userDoc.id;
  const data = userDoc.data() || {};
  const currentWorkout = data.currentWorkout;

  if (!currentWorkout || typeof currentWorkout !== "object") {
    console.log(`User ${uid} (${data.handle || data.username || rawHandle}) has no active workout to clear.`);
    return;
  }

  const wid = currentWorkout.wid ? String(currentWorkout.wid) : "";
  console.log(
    `Clearing currentWorkout for user ${uid} (${data.handle || data.username || "unknown"})${
      wid ? `, wid=${wid}` : ""
    }...`
  );

  await clearCurrentWorkoutEntries(uid);

  if (wid) {
    const { updatedWorkout, invitesRemoved } = await removeUserFromWorkout(wid, uid);
    if (updatedWorkout) {
      console.log(`Removed user ${uid} from workout ${wid}.`);
    } else {
      console.log(`Workout ${wid} was not found or had no members to update.`);
    }
    if (invitesRemoved > 0) {
      console.log(`Deleted ${invitesRemoved} related workout invite${invitesRemoved === 1 ? "" : "s"}.`);
    }
  } else {
    console.log("No wid stored on currentWorkout; skipped workout cleanup.");
  }

  console.log("✅ Done.");
}

main().catch((error) => {
  console.error("clearActiveWorkoutByHandle failed:", error);
  process.exit(1);
});
