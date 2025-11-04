import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { deleteUserAndContentByUid } from "../shared/deleteUserAndContent.js";

const REQUIRED_FIELDS = ["uid", "name", "handle"];
const DRY_RUN_FLAG = "--yes";

function toTrimmedString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function describeMissingFields(entry) {
  return entry.missing.join(", ");
}

async function loadInvalidUsers(db) {
  const snapshot = await db.collection("users").get();
  const invalid = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() || {};
    const missing = [];

    for (const field of REQUIRED_FIELDS) {
      const value = toTrimmedString(data[field]);
      if (!value) {
        missing.push(field);
      }
    }

    if (!missing.length) continue;

    invalid.push({
      docId: docSnap.id,
      uid: toTrimmedString(data.uid) || "",
      name: toTrimmedString(data.name) || "",
      handle: toTrimmedString(data.handle) || "",
      missing,
      docSnap,
    });
  }

  return invalid;
}

async function purgeInvalidUsers(invalidUsers, { dryRun }) {
  if (!invalidUsers.length) {
    console.log("No users are missing uid + name + handle fields. Nothing to do.");
    return;
  }

  console.log(`Identified ${invalidUsers.length} user document(s) missing required fields:`);
  for (const entry of invalidUsers) {
    console.log(
      ` • ${entry.docId} (missing: ${describeMissingFields(entry)})` +
        (entry.name ? `, name="${entry.name}"` : "") +
        (entry.handle ? `, handle="${entry.handle}"` : "")
    );
  }

  if (dryRun) {
    console.log(
      "\nRun again with '--yes' if you want to delete these documents and any related data (when a uid is present)."
    );
    return;
  }

  let deletedCount = 0;
  for (const entry of invalidUsers) {
    try {
      if (entry.uid) {
        await deleteUserAndContentByUid(entry.uid, { userDocSnap: entry.docSnap });
      } else {
        await entry.docSnap.ref.delete();
      }
      deletedCount += 1;
    } catch (error) {
      console.error(
        `Failed to purge user document ${entry.docId} (missing ${describeMissingFields(entry)}):`,
        error
      );
    }
  }

  console.log(`\nFinished. Deleted ${deletedCount} user document(s) missing uid + name + handle.`);
}

async function main() {
  try {
    initializeApp();
  } catch {
    // App may already be initialised by imported helpers.
  }

  const db = getFirestore();
  const args = new Set(process.argv.slice(2));
  const dryRun = !args.has(DRY_RUN_FLAG);

  if (dryRun) {
    console.log("Dry run mode (default). Pass '--yes' to perform deletions.");
  }

  const invalidUsers = await loadInvalidUsers(db);
  await purgeInvalidUsers(invalidUsers, { dryRun });
}

main().catch((error) => {
  console.error("Purge script failed:", error);
  process.exit(1);
});
