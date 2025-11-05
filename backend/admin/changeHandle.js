"use strict";

/**
 * Admin CLI to switch a user's handle across Firestore documents and update
 * the `userHandles` registry. Requires GOOGLE_APPLICATION_CREDENTIALS or
 * equivalent Firebase Admin credentials to be available in the environment.
 *
 * Usage:
 *   node backend/admin/changeHandle.js <currentHandle> <nextHandle> [--dry-run]
 */

const path = require("path");
const { spawn } = require("child_process");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

let firestore = null;
let appInitialized = false;

function ensureDb() {
    if (firestore) return firestore;
    if (!appInitialized) {
        try {
            initializeApp();
        } catch (error) {
            if (!error?.message?.includes("app already exists")) {
                throw error;
            }
        }
        appInitialized = true;
    }
    firestore = getFirestore();
    return firestore;
}

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

function sanitiseNewHandle(rawHandle) {
    const cleaned = normaliseHandle(rawHandle);
    if (!cleaned) {
        throw new Error("New handle must be non-empty.");
    }
    return cleaned;
}

function buildSearchTokens(displayName, handle) {
    const tokens = new Set();
    const addToken = (token) => {
        if (!token || typeof token !== "string") return;
        token
            .toLowerCase()
            .replace(/[^a-z0-9]/g, " ")
            .split(" ")
            .map((part) => part.trim())
            .filter((part) => part.length > 1)
            .forEach((part) => tokens.add(part));
    };
    addToken(displayName);
    addToken(handle);
    return Array.from(tokens).slice(0, 24);
}

function parseArgs(argv) {
    const args = argv.slice(2);
    const flags = { dryRun: false };
    const positional = [];
    for (const arg of args) {
        if (arg === "--dry-run" || arg === "--dryrun") {
            flags.dryRun = true;
        } else if (arg === "--help" || arg === "-h") {
            flags.help = true;
        } else {
            positional.push(arg);
        }
    }
    if (flags.help || positional.length < 2) {
        console.error("Usage: node backend/admin/changeHandle.js <currentHandle> <nextHandle> [--dry-run]");
        process.exit(flags.help ? 0 : 1);
    }
    return { oldRaw: positional[0], newRaw: positional[1], dryRun: flags.dryRun };
}

async function findUserByHandle(rawHandle) {
    const handle = normaliseHandle(rawHandle);
    if (!handle) {
        throw new Error("A non-empty current handle is required.");
    }
    const db = ensureDb();
    const lower = handle.toLowerCase();
    const candidates = [
        { field: "handle", value: handle },
        { field: "handle", value: `@${handle}` },
        { field: "handle", value: lower },
        { field: "handleLower", value: lower },
        { field: "handle_lower", value: lower },
    ];
    const tried = new Set();
    for (const { field, value } of candidates) {
        if (!value) continue;
        const key = `${field}:${value}`;
        if (tried.has(key)) continue;
        tried.add(key);
        const snap = await db.collection("usersPublic").where(field, "==", value).limit(2).get();
        if (snap.empty) continue;
        if (snap.size > 1) {
            throw new Error(`Multiple usersPublic docs matched field ${field} = "${value}". Abort.`);
        }
        const [doc] = snap.docs;
        const data = doc.data() || {};
        const currentHandle = normaliseHandle(data.handle || handle);
        return {
            uid: doc.id,
            source: "usersPublic",
            handle: currentHandle || handle,
            handleLower: (data.handleLower || data.handle_lower || currentHandle || handle).toLowerCase(),
        };
    }

    const handleDoc = await db.collection("userHandles").doc(lower).get();
    if (handleDoc.exists) {
        const uid = String(handleDoc.data()?.uid || "").trim();
        if (uid) {
            const doc = await db.collection("usersPublic").doc(uid).get();
            if (doc.exists) {
                const data = doc.data() || {};
                const currentHandle = normaliseHandle(data.handle || handle);
                return {
                    uid,
                    source: "userHandles",
                    handle: currentHandle || handle,
                    handleLower: (data.handleLower || data.handle_lower || currentHandle || handle).toLowerCase(),
                };
            }
        }
    }

    throw new Error(`Could not find a user for handle "${rawHandle}".`);
}

async function ensureHandleRegistryAvailable(newHandleLower, uid) {
    const db = ensureDb();
    const snap = await db.collection("userHandles").doc(newHandleLower).get();
    if (snap.exists) {
        const data = snap.data() || {};
        const existingUid = String(data.uid || "").trim();
        if (existingUid && existingUid !== uid) {
            throw new Error(`Handle "${newHandleLower}" is reserved by uid ${existingUid}.`);
        }
    }

    const conflicts = await db.collection("usersPublic").where("handleLower", "==", newHandleLower).limit(1).get();
    if (!conflicts.empty) {
        const doc = conflicts.docs[0];
        if (doc.id !== uid) {
            throw new Error(`Handle "${newHandleLower}" conflicts with usersPublic/${doc.id}.`);
        }
    }
}

async function runSwitchUserHandleScript(oldHandle, newHandle) {
    const scriptPath = path.resolve(__dirname, "../../functions/scripts/switchUserHandle.js");
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [scriptPath, oldHandle, newHandle], {
            stdio: "inherit",
            env: process.env,
        });
        child.on("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`switchUserHandle.js exited with code ${code}`));
        });
        child.on("error", reject);
    });
}

async function updateHandleRegistry(uid, oldHandleLower, newHandleLower) {
    const db = ensureDb();
    const now = FieldValue.serverTimestamp();
    const newRef = db.collection("userHandles").doc(newHandleLower);
    const oldRef = oldHandleLower && oldHandleLower !== newHandleLower
        ? db.collection("userHandles").doc(oldHandleLower)
        : null;

    await db.runTransaction(async (tx) => {
        const newSnap = await tx.get(newRef);
        let oldSnap = null;
        if (oldRef) {
            oldSnap = await tx.get(oldRef);
        }

        const payload = { uid, updatedAt: now };
        if (!newSnap.exists) payload.createdAt = now;
        tx.set(newRef, payload, { merge: true });

        if (oldRef && oldSnap?.exists) {
            const existingUid = String(oldSnap.data()?.uid || "").trim();
            if (!existingUid || existingUid === uid) {
                tx.delete(oldRef);
            }
        }
    });
}

async function refreshUserSearchIndex(uid, handle) {
    const db = ensureDb();
    const publicSnap = await db.collection("usersPublic").doc(uid).get();
    if (!publicSnap.exists) {
        console.warn(`[warn] usersPublic/${uid} missing; skipping search index update.`);
        return;
    }
    const data = publicSnap.data() || {};
    const resolvedHandle = normaliseHandle(data.handle || handle);
    const displayName = data.displayName || data.name || resolvedHandle || "";
    const isPrivate = Boolean(data.isPrivate);
    const payload = {
        displayName,
        handle: resolvedHandle,
        handleLower: resolvedHandle ? resolvedHandle.toLowerCase() : "",
        isPrivate,
        tokens: buildSearchTokens(displayName, resolvedHandle),
        updatedAt: FieldValue.serverTimestamp(),
    };
    await db.collection("userSearchIndex").doc(uid).set(payload, { merge: true });
}

async function main() {
    const { oldRaw, newRaw, dryRun } = parseArgs(process.argv);
    const oldHandleNormalized = normaliseHandle(oldRaw);
    if (!oldHandleNormalized) {
        throw new Error("Current handle must be non-empty.");
    }
    const newHandle = sanitiseNewHandle(newRaw);
    const user = await findUserByHandle(oldHandleNormalized);
    const oldHandleLower = oldHandleNormalized.toLowerCase();
    const newHandleLower = newHandle.toLowerCase();
    const existingHandleLower = user.handleLower.toLowerCase();

    if (existingHandleLower === newHandleLower) {
        console.log("New handle matches the current handle (case-insensitive). No switch required.");
        if (dryRun) {
            console.log("[dry-run] Registry refresh skipped.");
            return;
        }
        await updateHandleRegistry(user.uid, oldHandleLower, newHandleLower);
        await refreshUserSearchIndex(user.uid, newHandle);
        console.log("✅ Handle registry and search index refreshed.");
        return;
    }

    await ensureHandleRegistryAvailable(newHandleLower, user.uid);

    console.log(`Resolved user: uid=${user.uid} (source=${user.source})`);
    console.log(`Current handle: ${user.handle}`);
    console.log(`Next handle   : ${newHandle}`);

    if (dryRun) {
        console.log("[dry-run] Handle change skipped.");
        return;
    }

        await runSwitchUserHandleScript(user.handle, newHandle);
    await updateHandleRegistry(user.uid, oldHandleLower, newHandleLower);
    await refreshUserSearchIndex(user.uid, newHandle);

    console.log("✅ Handle switch complete and registry updated.");
}

main().catch((error) => {
    console.error("changeHandle failed:", error);
    process.exit(1);
});
