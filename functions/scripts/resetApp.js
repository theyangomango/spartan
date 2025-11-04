import { initializeApp, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Hard-reset script for Spartan. This purges every Auth user, all Firestore data,
 * and every file in the default Storage bucket. USE WITH EXTREME CAUTION.
 *
 * Run with:
 *   node functions/scripts/resetApp.js --confirm
 *
 * Optional flags:
 *   --skip-auth       Do not delete Firebase Authentication users.
 *   --skip-firestore  Do not delete Firestore collections/documents.
 *   --skip-storage    Do not delete Cloud Storage files.
 *   --bucket=<name>   Explicit storage bucket to wipe (overrides env/defaults).
 */

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);

function getOption(flag) {
  for (let i = 0; i < rawArgs.length; i += 1) {
    const entry = rawArgs[i];
    if (entry === flag) {
      return rawArgs[i + 1] ?? "";
    }
    if (entry.startsWith(`${flag}=`)) {
      return entry.slice(flag.length + 1);
    }
  }
  return null;
}

const CONFIRMED = args.has("--confirm");

if (!CONFIRMED) {
  console.error("❌ Refusing to run. Pass --confirm to acknowledge this will delete ALL app data.");
  console.error("   Example: node functions/scripts/resetApp.js --confirm");
  process.exit(1);
}

const SKIP_AUTH = args.has("--skip-auth");
const SKIP_FIRESTORE = args.has("--skip-firestore");
const SKIP_STORAGE = args.has("--skip-storage");

try {
  initializeApp();
} catch {
  // App might already be initialised if run via emulator or another script.
}

const auth = getAuth();
const db = getFirestore();
const storageNamespace = getStorage();
const app = getApp();

const bucketOption = (getOption("--bucket") || "").trim();
const envBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.GCLOUD_STORAGE_BUCKET ||
  process.env.STORAGE_BUCKET ||
  "";

const appBucket = (app?.options?.storageBucket || "").trim();
const appProjectId =
  app?.options?.projectId ||
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "";
const derivedBucket = appProjectId ? `${appProjectId}.appspot.com` : "";

const selectedBucketName =
  bucketOption ||
  envBucket.trim() ||
  appBucket ||
  derivedBucket;

let storageBucket = null;
let storageInitError = null;
if (!SKIP_STORAGE) {
  const name = (selectedBucketName || "").trim();
  if (name) {
    storageBucket = storageNamespace.bucket(name);
  } else {
    try {
      storageBucket = storageNamespace.bucket();
    } catch (error) {
      storageInitError = error;
      storageBucket = null;
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deleteAllAuthUsers(batchSize = 1000) {
  let pageToken;
  let totalSuccess = 0;
  let totalFailure = 0;
  let batch = 0;

  while (true) {
    const { users, pageToken: nextPageToken } = await auth.listUsers(batchSize, pageToken);
    if (!users.length) {
      break;
    }

    const uids = users.map((user) => user.uid);
    console.log(`🗑️  Deleting auth users batch ${batch + 1} (${uids.length} account(s))...`);

    const result = await auth.deleteUsers(uids, { force: true });
    totalSuccess += result.successCount || 0;
    totalFailure += result.failureCount || 0;

    if (Array.isArray(result.errors) && result.errors.length) {
      result.errors.forEach((error) => {
        const failedUid = uids[error.index] || "(unknown uid)";
        console.warn(`   ⚠️  Failed to delete auth user ${failedUid}:`, error.error?.message || error.error || error);
      });
    }

    batch += 1;
    pageToken = nextPageToken;
    if (!pageToken) break;

    await sleep(200); // throttle to avoid hammering Auth API
  }

  console.log(`✅ Auth deletion complete. Success: ${totalSuccess}, Failures: ${totalFailure}`);
}

async function deleteAllFirestoreData() {
  const collections = await db.listCollections();
  if (!collections.length) {
    console.log("ℹ️  No top-level Firestore collections found.");
    return;
  }

  console.log(`🧹 Found ${collections.length} top-level Firestore collection(s). Starting recursive deletes...`);
  for (const collection of collections) {
    const path = collection.path;
    console.log(`   • Deleting collection '${path}'...`);
    try {
      await db.recursiveDelete(collection);
      console.log(`     → '${path}' deleted.`);
    } catch (error) {
      console.error(`     ⚠️  Failed to delete collection '${path}':`, error);
      throw error;
    }
  }
  console.log("✅ Firestore purge complete.");
}

async function deleteAllStorageFiles(bucket) {
  if (!bucket) {
    if (storageInitError) {
      console.warn(
        "⚠️  Unable to determine a default Cloud Storage bucket. Provide --bucket=<name> or set FIREBASE_STORAGE_BUCKET."
      );
      console.warn(`   Reason: ${storageInitError.message || storageInitError}`);
    } else {
      console.log(
        "⏭️  No Cloud Storage bucket configured. Provide --bucket=<name> or set FIREBASE_STORAGE_BUCKET to enable deletion."
      );
    }
    return;
  }

  const bucketName = bucket.name;
  console.log(`🧺 Clearing Cloud Storage bucket '${bucketName}'...`);
  try {
    await bucket.deleteFiles({ force: true });
    console.log(`✅ Storage bucket '${bucketName}' emptied.`);
  } catch (error) {
    // @google-cloud/storage throws if the bucket is already empty; treat as success.
    if (error?.code === 404 || /No such object/i.test(error?.message || "")) {
      console.log(`✅ Storage bucket '${bucketName}' already empty.`);
      return;
    }
    if (error?.code === 404 || /No such bucket/i.test(error?.message || "")) {
      console.warn(`⚠️  Bucket '${bucketName}' does not exist or is inaccessible. Skipping storage wipe.`);
      return;
    }
    console.error(`⚠️  Failed to delete storage files from '${bucketName}':`, error);
    throw error;
  }
}

async function main() {
  console.log("🚨 RESETTING SPARTAN BACKEND 🚨");
  console.log("This operation is irreversible. Proceeding because --confirm was provided.\n");

  if (!SKIP_AUTH) {
    await deleteAllAuthUsers();
    console.log("");
  } else {
    console.log("⏭️  Skipping Firebase Auth deletion (--skip-auth provided).\n");
  }

  if (!SKIP_FIRESTORE) {
    await deleteAllFirestoreData();
    console.log("");
  } else {
    console.log("⏭️  Skipping Firestore deletion (--skip-firestore provided).\n");
  }

  if (!SKIP_STORAGE) {
    await deleteAllStorageFiles(storageBucket);
    console.log("");
  } else {
    console.log("⏭️  Skipping Storage deletion (--skip-storage provided).\n");
  }

  console.log("🎯 Reset complete. Consider re-seeding baseline data if your app expects it.");
}

main().catch((error) => {
  console.error("\n❌ resetApp failed:", error);
  process.exit(1);
});
