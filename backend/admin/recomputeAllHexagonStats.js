"use strict";

/**
 * Admin CLI to recompute every user's hexagon stats snapshot.
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or equivalent Firebase Admin creds.
 *
 * Usage:
 *   node backend/admin/recomputeAllHexagonStats.js [options]
 *
 * Options:
 *   --batch-size <n>   How many user docs to fetch per query (default: 200).
 *   --limit <n>        Process at most <n> users (useful for canary runs).
 *   --start-after <id> Resume after the given user doc id.
 *   --update-public    Also mirror statsHexagon to usersPublic documents.
 *   --dry-run          Compute results but do not write to Firestore.
 *   --verbose          Log per-user details.
 *   --help             Show this message.
 */

const path = require("path");
const { pathToFileURL } = require("url");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const DEFAULT_BATCH_SIZE = 200;
const USERS_COLLECTION = "users";
const USERS_PUBLIC_COLLECTION = "usersPublic";

function printUsage() {
  console.log(`
Usage: node backend/admin/recomputeAllHexagonStats.js [options]

Options:
  --batch-size <n>   How many user docs to fetch per query (default: 200).
  --limit <n>        Process at most <n> users (useful for canary runs).
  --start-after <id> Resume after the given user doc id.
  --update-public    Also mirror statsHexagon to usersPublic documents.
  --dry-run          Compute results but do not write to Firestore.
  --verbose          Log per-user details.
  --help             Show this message.
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    batchSize: DEFAULT_BATCH_SIZE,
    limit: null,
    startAfter: null,
    dryRun: false,
    updatePublic: false,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case "--batch-size":
      case "-b": {
        const value = args[++i];
        if (!value) {
          throw new Error("--batch-size requires a numeric value.");
        }
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          throw new Error("--batch-size must be a positive integer.");
        }
        options.batchSize = parsed;
        break;
      }
      case "--limit":
      case "-n": {
        const value = args[++i];
        if (!value) {
          throw new Error("--limit requires a numeric value.");
        }
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          throw new Error("--limit must be a positive integer.");
        }
        options.limit = parsed;
        break;
      }
      case "--start-after":
      case "-s": {
        const value = args[++i];
        if (!value) {
          throw new Error("--start-after requires a document id.");
        }
        options.startAfter = String(value);
        break;
      }
      case "--update-public":
        options.updatePublic = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--verbose":
      case "-v":
        options.verbose = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument "${arg}". Use --help for usage.`);
    }
  }

  return options;
}

function ensureFirestore() {
  if (!getApps().length) {
    initializeApp();
  }
  const db = getFirestore();
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch (error) {
    console.warn("[warn] Could not enable ignoreUndefinedProperties:", error?.message || error);
  }
  return db;
}

async function loadComputeHexagon() {
  const modulePath = pathToFileURL(
    path.resolve(__dirname, "../../functions/shared/rebuildHexagonStats.js")
  ).href;
  const mod = await import(modulePath);
  const computeFn = mod?.computeHexagonFromUserData || mod?.default?.computeHexagonFromUserData;
  if (typeof computeFn !== "function") {
    throw new Error("Failed to load computeHexagonFromUserData helper.");
  }
  return computeFn;
}

function buildUpdatePayload(result, includeServerTimestamp) {
  const meta = {
    lastTrainedByGroup: result.lastTrainedByGroup || {},
  };
  if (includeServerTimestamp) {
    meta.updatedAt = FieldValue.serverTimestamp();
  }

  return {
    statsExercises: result.statsExercises || {},
    statsHexagon: result.statsHexagon || {},
    statsHexagonMeta: meta,
    statsTotalVolume: result.statsTotalVolume ?? 0,
    statsTotalHours: result.statsTotalHours ?? 0,
    statsTotalWorkouts: result.statsTotalWorkouts ?? 0,
    workoutsByDate: result.workoutsByDate || {},
  };
}

async function recomputeForUser(docSnap, computeHexagon, options) {
  const data = docSnap.data() || {};
  const completedWorkouts = Array.isArray(data?.completedWorkouts) ? data.completedWorkouts : [];
  const statsExercises = data?.statsExercises || {};
  const prevStatsHexagon = data?.statsHexagon || {};

  const result = computeHexagon({
    completedWorkouts,
    statsExercises,
    prevStatsHexagon,
  });

  if (options.verbose) {
    const hexPreview = JSON.stringify(result?.statsHexagon || {});
    console.log(`[info] ${docSnap.id}: recomputed hexagon ${hexPreview}`);
    if (Array.isArray(result?.skippedExercises) && result.skippedExercises.length) {
      console.log(`[info] ${docSnap.id}: skipped exercises ${result.skippedExercises.join(", ")}`);
    }
  }

  if (options.dryRun) {
    return { wrote: false, result };
  }

  const update = buildUpdatePayload(result, true);
  await docSnap.ref.set(update, { merge: true });

  if (options.updatePublic) {
    await docSnap.ref.firestore
      .collection(USERS_PUBLIC_COLLECTION)
      .doc(docSnap.id)
      .set(
        {
          statsHexagon: result.statsHexagon || {},
          statsHexagonMeta: {
            lastTrainedByGroup: result.lastTrainedByGroup || {},
            updatedAt: FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
  }

  return { wrote: true, result };
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "0s";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes < 60) {
    return remainder > 0 ? `${minutes}m ${remainder.toFixed(0)}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    printUsage();
    process.exit(0);
    return;
  }

  const db = ensureFirestore();
  const computeHexagon = await loadComputeHexagon();

  let lastDoc = null;
  if (options.startAfter) {
    const startSnap = await db.collection(USERS_COLLECTION).doc(options.startAfter).get();
    if (!startSnap.exists) {
      throw new Error(`No ${USERS_COLLECTION} document found with id "${options.startAfter}".`);
    }
    lastDoc = startSnap;
    console.log(`[info] Starting after user id ${options.startAfter}.`);
  }

  const stats = { processed: 0, updated: 0, failed: 0 };
  const startedAt = Date.now();

  console.log("\n🔁 Recomputing hexagon stats for users...");

  outer: while (true) {
    let query = db.collection(USERS_COLLECTION).orderBy("__name__").limit(options.batchSize);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    for (const docSnap of snapshot.docs) {
      stats.processed += 1;
      try {
        const { wrote } = await recomputeForUser(docSnap, computeHexagon, options);
        if (wrote) {
          stats.updated += 1;
        }
      } catch (error) {
        stats.failed += 1;
        console.warn(
          `[warn] Failed to recompute for ${docSnap.id}: ${error?.message || error}`
        );
      }

      if (options.limit && stats.processed >= options.limit) {
        console.log(`[info] --limit ${options.limit} reached. Stopping early.`);
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        break outer;
      }

      if (stats.processed % 25 === 0) {
        const elapsedSeconds = (Date.now() - startedAt) / 1000;
        console.log(
          `   • processed ${stats.processed} users (${stats.updated} updated, ${stats.failed} failed, elapsed ${formatDuration(
            elapsedSeconds
          )})`
        );
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  const elapsed = (Date.now() - startedAt) / 1000;
  console.log("\n✅ Finished recomputing hexagon stats.");
  console.log(
    `   • Users processed: ${stats.processed}${options.limit ? ` (limit ${options.limit})` : ""}`
  );
  console.log(`   • Documents updated: ${stats.updated}`);
  console.log(`   • Failures: ${stats.failed}`);
  console.log(`   • Duration: ${formatDuration(elapsed)}`);
  if (options.dryRun) {
    console.log("   • Dry-run mode: no writes were performed.");
  }
}

main().catch((error) => {
  console.error("recomputeAllHexagonStats failed:", error?.message || error);
  process.exit(1);
});
