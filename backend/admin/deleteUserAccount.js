"use strict";

/**
 * Admin CLI to delete a user's account and all associated content.
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or equivalent Firebase Admin creds.
 *
 * Usage:
 *   node backend/admin/deleteUserAccount.js <handle> [--dry-run] [--force]
 *
 * Flags:
 *   --dry-run   Resolve and display the target user without deleting anything.
 *   --force     Skip the interactive confirmation prompt.
 */

const path = require("path");
const readline = require("readline");
const { pathToFileURL } = require("url");

const deletionModulePath = pathToFileURL(
  path.resolve(__dirname, "../../functions/shared/deleteUserAndContent.js")
).href;

let cachedDeletionModule = null;

function stripAt(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.startsWith("@") ? trimmed.slice(1).trim() : trimmed;
}

function normaliseHandle(input) {
  if (input === undefined || input === null) return "";
  if (typeof input !== "string") input = String(input);
  return stripAt(input).trim();
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = { dryRun: false, force: false, help: false };
  const positional = [];

  args.forEach((arg) => {
    if (arg === "--dry-run" || arg === "--dryrun") {
      flags.dryRun = true;
    } else if (arg === "--force" || arg === "--yes") {
      flags.force = true;
    } else if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else {
      positional.push(arg);
    }
  });

  if (flags.help || positional.length < 1) {
    console.log("Usage: node backend/admin/deleteUserAccount.js <handle> [--dry-run] [--force]");
    process.exit(flags.help ? 0 : 1);
  }

  return { handleRaw: positional[0], dryRun: flags.dryRun, force: flags.force };
}

async function loadDeletionModule() {
  if (cachedDeletionModule) return cachedDeletionModule;
  try {
    cachedDeletionModule = await import(deletionModulePath);
    return cachedDeletionModule;
  } catch (error) {
    console.error("Failed to load deleteUserAndContent module:", error?.message || error);
    throw error;
  }
}

function describeUserData(data = {}, fallbackHandle = "") {
  const handle =
    normaliseHandle(data.handle) ||
    normaliseHandle(data.username) ||
    normaliseHandle(data.tag) ||
    normaliseHandle(fallbackHandle);
  const displayName =
    data.displayName ||
    data.name ||
    data.fullName ||
    data.display_name ||
    "";
  const email = data.email || data.emailAddress || "";
  const createdAt = data.createdAt || data.joined || null;
  const followersCount =
    Number.isFinite(data.followersCount) ? data.followersCount :
    Number.isFinite(data.followerCount) ? data.followerCount :
    null;
  return { handle, displayName, email, createdAt, followersCount };
}

async function promptForConfirmation(expectedHandle) {
  const normalizedExpected = normaliseHandle(expectedHandle);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = normalizedExpected
    ? `\nType the handle "${normalizedExpected}" to confirm deletion: `
    : "\nType DELETE to confirm deletion: ";

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      const normalizedAnswer = normaliseHandle(answer);
      if (!normalizedExpected) {
        resolve(["delete", "confirm", "yes", "y"].includes(normalizedAnswer));
        return;
      }
      resolve(normalizedAnswer === normalizedExpected);
    });
  });
}

function formatDate(value) {
  if (!value) return "";
  try {
    if (typeof value.toDate === "function") {
      return value.toDate().toISOString();
    }
    if (typeof value.toMillis === "function") {
      return new Date(value.toMillis()).toISOString();
    }
    const millis = Number(value);
    if (Number.isFinite(millis) && millis > 0) {
      return new Date(millis).toISOString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value);
  } catch {
    return String(value);
  }
}

async function main() {
  const { handleRaw, dryRun, force } = parseArgs(process.argv);
  const normalizedInput = normaliseHandle(handleRaw);
  if (!normalizedInput) {
    throw new Error("Handle must be non-empty.");
  }

  const { findUserByHandle, deleteUserAndContentByHandle } = await loadDeletionModule();
  if (typeof findUserByHandle !== "function" || typeof deleteUserAndContentByHandle !== "function") {
    throw new Error("deleteUserAndContent module is missing required exports.");
  }

  let userSnap;
  try {
    userSnap = await findUserByHandle(normalizedInput);
  } catch (error) {
    console.error("Could not resolve user:", error?.message || error);
    process.exit(1);
  }

  if (!userSnap?.exists) {
    console.error(`No account found for handle "${handleRaw}".`);
    process.exit(1);
  }

  const uid = userSnap.id;
  const data = userSnap.data() || {};
  const descriptor = describeUserData(data, normalizedInput);

  console.log("\nResolved account:");
  console.log(`   • UID          : ${uid}`);
  console.log(`   • Handle       : ${descriptor.handle || "(unknown)"}`);
  console.log(`   • Display name : ${descriptor.displayName || "(unknown)"}`);
  if (descriptor.email) {
    console.log(`   • Email        : ${descriptor.email}`);
  }
  if (descriptor.followersCount !== null) {
    console.log(`   • Followers    : ${descriptor.followersCount}`);
  }
  if (descriptor.createdAt) {
    console.log(`   • Created at   : ${formatDate(descriptor.createdAt)}`);
  }

  if (dryRun) {
    console.log("\n[dry-run] No changes have been made.");
    return;
  }

  if (!force) {
    const confirmed = await promptForConfirmation(descriptor.handle || normalizedInput);
    if (!confirmed) {
      console.log("Aborted by user.");
      return;
    }
  }

  console.log("\nDeleting account…");
  let summary;
  try {
    summary = await deleteUserAndContentByHandle(normalizedInput);
  } catch (error) {
    console.error("deleteUserAndContentByHandle failed:", error?.message || error);
    process.exit(1);
  }

  console.log("\nSummary:");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("deleteUserAccount failed:", error?.message || error);
  process.exit(1);
});
