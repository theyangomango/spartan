"use strict";

/**
 * Admin CLI to set a user's verification badge by handle or UID using the
 * post-redesign Firestore layout. Requires Firebase Admin credentials.
 *
 * Usage:
 *   node backend/admin/verifyUser.js <handleOrUid> [--dry-run] [--unverify]
 */

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const PRIMARY_USER_COLLECTION = "usersPublic";
const LEGACY_USER_COLLECTION = "users";

let firestore = null;
let appInitialized = false;

function ensureDb() {
    if (firestore) return firestore;
    if (!appInitialized) {
        try {
            initializeApp();
        } catch (error) {
            if (!error?.message?.includes("already exists")) {
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

function coerceBoolean(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (value === null || value === undefined) return fallback;
    if (typeof value === "string") {
        const lowered = value.trim().toLowerCase();
        if (lowered === "true") return true;
        if (lowered === "false") return false;
        if (!lowered.length) return fallback;
    }
    if (typeof value === "number") return value !== 0;
    return Boolean(value);
}

function formatHandle(value) {
    const clean = normaliseHandle(value);
    return clean ? `@${clean}` : "";
}

function buildVerificationPayload(shouldVerify) {
    if (shouldVerify) {
        const timestamp = FieldValue.serverTimestamp();
        return {
            isVerified: true,
            verified: true,
            verifiedAt: timestamp,
            updatedAt: timestamp,
        };
    }
    return {
        isVerified: false,
        verified: false,
        verifiedAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
    };
}

function buildLegacyPayload(shouldVerify, uid, publicData = {}, legacyData = {}) {
    const payload = buildVerificationPayload(shouldVerify);
    payload.uid = uid;

    const primaryHandle = typeof legacyData.handle === "string" && legacyData.handle
        ? legacyData.handle
        : typeof publicData.handle === "string" && publicData.handle
            ? publicData.handle
            : null;
    if (primaryHandle) {
        payload.handle = primaryHandle;
        const normalised = normaliseHandle(primaryHandle);
        if (normalised) {
            payload.handleLower = normalised.toLowerCase();
        }
    }

    const displayName =
        (typeof legacyData.displayName === "string" && legacyData.displayName) ||
        (typeof legacyData.name === "string" && legacyData.name) ||
        (typeof publicData.displayName === "string" && publicData.displayName) ||
        (typeof publicData.name === "string" && publicData.name) ||
        null;
    if (displayName) {
        payload.displayName = displayName;
        payload.name = displayName;
    }

    const photo =
        (typeof legacyData.photoURL === "string" && legacyData.photoURL) ||
        (typeof publicData.photoURL === "string" && publicData.photoURL) ||
        (typeof publicData.pfp === "string" && publicData.pfp) ||
        null;
    if (photo) {
        payload.photoURL = photo;
    }

    return payload;
}

function printUsage() {
    console.log("Usage: node backend/admin/verifyUser.js <handleOrUid> [--dry-run] [--unverify]");
    console.log("Examples:");
    console.log("  node backend/admin/verifyUser.js @spartan_admin");
    console.log("  node backend/admin/verifyUser.js creator123 --dry-run");
    console.log("  node backend/admin/verifyUser.js athlete42 --unverify");
}

function parseArgs(argv) {
    const args = argv.slice(2);
    const options = { dryRun: false, targetState: true, help: false };
    const positional = [];

    for (const arg of args) {
        if (arg === "--dry-run" || arg === "--dryrun") {
            options.dryRun = true;
        } else if (arg === "--unverify" || arg === "--unset" || arg === "--remove") {
            options.targetState = false;
        } else if (arg === "--help" || arg === "-h") {
            options.help = true;
        } else {
            positional.push(arg);
        }
    }

    if (options.help || positional.length < 1) {
        printUsage();
        process.exit(options.help ? 0 : 1);
    }

    return {
        identifier: positional[0],
        dryRun: options.dryRun,
        targetState: options.targetState,
    };
}

async function findUserByHandle(rawHandle) {
    const db = ensureDb();
    const handle = normaliseHandle(rawHandle);
    if (!handle) {
        throw new Error("A non-empty handle is required.");
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
        if (!value) continue;
        const key = `${field}:${value}`;
        if (tried.has(key)) continue;
        tried.add(key);

        const snap = await db.collection(PRIMARY_USER_COLLECTION).where(field, "==", value).limit(2).get();
        if (snap.empty) continue;
        if (snap.size > 1) {
            throw new Error(`Multiple ${PRIMARY_USER_COLLECTION} docs matched ${field} = "${value}".`);
        }
        const doc = snap.docs[0];
        return {
            uid: doc.id,
            source: `${PRIMARY_USER_COLLECTION}.${field}`,
            data: doc.data() || {},
        };
    }

    const handleDoc = await db.collection("userHandles").doc(lower).get();
    if (handleDoc.exists) {
        const mappedUid = String(handleDoc.data()?.uid || "").trim();
        if (mappedUid) {
            const snap = await db.collection(PRIMARY_USER_COLLECTION).doc(mappedUid).get();
            if (snap.exists) {
                return {
                    uid: snap.id,
                    source: "userHandles",
                    data: snap.data() || {},
                };
            }
        }
    }

    throw new Error(`Could not resolve user for handle "${rawHandle}".`);
}

async function resolveUser(identifier) {
    const db = ensureDb();
    const trimmed = String(identifier || "").trim();
    if (!trimmed) {
        throw new Error("Provide a user handle or UID.");
    }

    const direct = await db.collection(PRIMARY_USER_COLLECTION).doc(trimmed).get();
    if (direct.exists) {
        return {
            uid: direct.id,
            source: "docId",
            data: direct.data() || {},
        };
    }

    return await findUserByHandle(trimmed);
}

async function loadUserState(uid) {
    const db = ensureDb();
    const publicRef = db.collection(PRIMARY_USER_COLLECTION).doc(uid);
    const legacyRef = db.collection(LEGACY_USER_COLLECTION).doc(uid);
    const [publicSnap, legacySnap] = await Promise.all([
        publicRef.get(),
        legacyRef.get().catch(() => null),
    ]);

    if (!publicSnap.exists) {
        throw new Error(`${PRIMARY_USER_COLLECTION}/${uid} does not exist.`);
    }

    const publicData = publicSnap.data() || {};
    const legacyExists = Boolean(legacySnap && legacySnap.exists);
    const legacyData = legacyExists ? legacySnap.data() || {} : {};

    const publicVerified = coerceBoolean(publicData.isVerified ?? publicData.verified, false);
    const legacyVerified = coerceBoolean(
        legacyData.isVerified ?? legacyData.verified,
        publicVerified
    );

    const handle =
        (typeof publicData.handle === "string" && publicData.handle) ||
        (typeof legacyData.handle === "string" && legacyData.handle) ||
        "";

    const displayName =
        (typeof publicData.displayName === "string" && publicData.displayName) ||
        (typeof publicData.name === "string" && publicData.name) ||
        (typeof legacyData.displayName === "string" && legacyData.displayName) ||
        (typeof legacyData.name === "string" && legacyData.name) ||
        "";

    return {
        publicData,
        legacyData,
        publicVerified,
        legacyVerified,
        handle,
        displayName,
        legacyExists,
    };
}

async function applyVerification(uid, shouldVerify, state) {
    const db = ensureDb();
    const publicPayload = buildVerificationPayload(shouldVerify);
    const legacyPayload = buildLegacyPayload(shouldVerify, uid, state.publicData, state.legacyData);

    await Promise.all([
        db.collection(PRIMARY_USER_COLLECTION).doc(uid).set(publicPayload, { merge: true }),
        db.collection(LEGACY_USER_COLLECTION).doc(uid).set(legacyPayload, { merge: true }),
    ]);
}

async function main() {
    try {
        const { identifier, dryRun, targetState } = parseArgs(process.argv);
        const resolved = await resolveUser(identifier);
        const { uid, source } = resolved;

        const state = await loadUserState(uid);
        const prettyHandle = formatHandle(state.handle);

        console.log(`Resolved user: uid=${uid} (source=${source})`);
        if (prettyHandle) console.log(`Handle: ${prettyHandle}`);
        if (state.displayName) console.log(`Display name: ${state.displayName}`);
        console.log(`Current verified (usersPublic): ${state.publicVerified}`);
        console.log(`Current verified (users): ${state.legacyVerified}`);
        console.log(`Desired verified state: ${targetState}`);

        if (dryRun) {
            console.log("[dry-run] No changes applied.");
            return;
        }

        const alreadyPublic = state.publicVerified === targetState;
        const alreadyLegacy = state.legacyVerified === targetState;

        if (alreadyPublic && alreadyLegacy) {
            console.log("No change needed; both documents already reflect the desired state.");
            return;
        }

        await applyVerification(uid, targetState, state);

        const updated = await loadUserState(uid);
        console.log(`Updated verified (usersPublic): ${updated.publicVerified}`);
        console.log(`Updated verified (users): ${updated.legacyVerified}`);
        console.log("✅ Verification update complete.");
    } catch (error) {
        console.error("verifyUser failed:", error);
        process.exit(1);
    }
}

main();
