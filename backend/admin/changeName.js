"use strict";

/**
 * Admin CLI to switch a user's display name across Firestore documents.
 * Requires GOOGLE_APPLICATION_CREDENTIALS or equivalent Firebase Admin creds.
 *
 * Usage:
 *   node backend/admin/changeName.js <uidOrHandle> "<New Name>" [--old "<Current Name>"] [--dry-run]
 */

const { spawn } = require("child_process");
const path = require("path");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const PRIMARY_USER_COLLECTION = "usersPublic";

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

function normaliseName(input) {
    if (input === undefined || input === null) return "";
    return String(input).trim();
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

async function findUserByIdentifier(identifier) {
    const db = ensureDb();
    if (!identifier) {
        throw new Error("A non-empty identifier (uid or handle) is required.");
    }

    const directSnap = await db.collection(PRIMARY_USER_COLLECTION).doc(identifier).get();
    if (directSnap.exists) {
        return {
            uid: directSnap.id,
            source: "docId",
            data: directSnap.data() || {},
        };
    }

    const handle = normaliseHandle(identifier);
    if (!handle) {
        throw new Error(`Could not resolve user for identifier "${identifier}".`);
    }

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
        if (!value || tried.has(`${field}:${value}`)) continue;
        tried.add(`${field}:${value}`);
        const snap = await db.collection(PRIMARY_USER_COLLECTION).where(field, "==", value).limit(2).get();
        if (snap.empty) continue;
        if (snap.size > 1) {
            throw new Error(`Multiple ${PRIMARY_USER_COLLECTION} docs matched by ${field} = "${value}".`);
        }
        const doc = snap.docs[0];
        return {
            uid: doc.id,
            source: `usersPublic.${field}`,
            data: doc.data() || {},
        };
    }

    const handleDoc = await db.collection("userHandles").doc(lower).get();
    if (handleDoc.exists) {
        const uid = String(handleDoc.data()?.uid || "").trim();
        if (uid) {
            const snap = await db.collection(PRIMARY_USER_COLLECTION).doc(uid).get();
            if (snap.exists) {
                return {
                    uid: snap.id,
                    source: "userHandles",
                    data: snap.data() || {},
                };
            }
        }
    }

    throw new Error(`Could not resolve user for identifier "${identifier}".`);
}

function parseArgs(argv) {
    const args = argv.slice(2);
    const positional = [];
    const options = {
        dryRun: false,
        oldName: "",
    };
    let expectOld = false;

    for (const arg of args) {
        if (expectOld) {
            options.oldName = normaliseName(arg);
            expectOld = false;
            continue;
        }
        if (arg === "--dry-run" || arg === "--dryrun") {
            options.dryRun = true;
            continue;
        }
        if (arg === "--old") {
            expectOld = true;
            continue;
        }
        positional.push(arg);
    }

    if (expectOld) {
        throw new Error("Expected a value after --old.");
    }

    if (positional.length < 2) {
        throw new Error('Usage: node backend/admin/changeName.js <uidOrHandle> "<New Name>" [--old "<Current Name>"] [--dry-run]');
    }

    return {
        identifier: positional[0],
        newNameRaw: positional[1],
        oldName: options.oldName,
        dryRun: options.dryRun,
    };
}

async function runSwitchUserNameScript(identifier, newName, oldName) {
    const scriptPath = path.resolve(__dirname, "../../functions/scripts/switchUserName.js");
    const args = [identifier, newName];
    if (oldName) args.push(oldName);
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [scriptPath, ...args], {
            stdio: "inherit",
            env: process.env,
        });
        child.on("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`switchUserName.js exited with code ${code}`));
        });
        child.on("error", reject);
    });
}

async function refreshUserSearchIndex(uid) {
    const db = ensureDb();
    const snap = await db.collection(PRIMARY_USER_COLLECTION).doc(uid).get();
    if (!snap.exists) {
        console.warn(`[warn] ${PRIMARY_USER_COLLECTION}/${uid} missing; search index skipped.`);
        return;
    }
    const data = snap.data() || {};
    const displayName = normaliseName(data.displayName || data.name || "");
    const handle = normaliseHandle(data.handle || data.username || "");
    const payload = {
        displayName,
        handle,
        handleLower: handle ? handle.toLowerCase() : "",
        isPrivate: Boolean(data.isPrivate),
        tokens: buildSearchTokens(displayName, handle),
        updatedAt: FieldValue.serverTimestamp(),
    };
    await db.collection("userSearchIndex").doc(uid).set(payload, { merge: true });
}

async function main() {
    try {
        const { identifier, newNameRaw, oldName, dryRun } = parseArgs(process.argv);
        const newName = normaliseName(newNameRaw);
        if (!newName) {
            throw new Error("New name must be non-empty.");
        }

        const target = await findUserByIdentifier(identifier);
        const { uid, data } = target;

        const existingName =
            normaliseName(oldName) ||
            normaliseName(data.displayName) ||
            normaliseName(data.name) ||
            normaliseName(data.fullName) ||
            normaliseName(data.full_name) ||
            "";

        console.log(`Resolved user: uid=${uid} (source=${target.source})`);
        console.log(`Current name guess: ${existingName || "(unknown)"}`);
        console.log(`Next name        : ${newName}`);

        if (dryRun) {
            console.log("[dry-run] Name switch skipped.");
            return;
        }

        const explicitOld = oldName || "";
        await runSwitchUserNameScript(identifier, newName, explicitOld);

        await refreshUserSearchIndex(uid);

        console.log("✅ Name switch complete and search index refreshed.");
    } catch (error) {
        console.error("changeName failed:", error);
        process.exit(1);
    }
}

main();
