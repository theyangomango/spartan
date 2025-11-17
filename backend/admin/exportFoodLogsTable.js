"use strict";

/**
 * Admin CLI to export every logged food entry (across all users) into a Markdown table.
 *
 * Requires Firebase Admin credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS).
 *
 * Usage:
 *   node backend/admin/exportFoodLogsTable.js [options]
 *
 * Options:
 *   --output <path>       Path for the .md file. Defaults to ./food_logs_table.md
 *   --batch-size <n>      Number of usersPrivate docs to fetch per batch (default 50)
 *   --limit-users <n>     Stop after processing N users (useful for smoke tests)
 *   --max-entries <n>     Stop after emitting N food entries
 *   --verbose             Log per-user progress
 *   --help                Show this help text
 */

const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const DEFAULT_OUTPUT = path.resolve(process.cwd(), "food_logs_table.md");
const DEFAULT_BATCH_SIZE = 50;

let firestore = null;
let appInitialised = false;

function printUsage() {
    console.log("Usage: node backend/admin/exportFoodLogsTable.js [options]");
    console.log("");
    console.log("Options:");
    console.log("  --output <path>       Path for the .md file. Defaults to ./food_logs_table.md");
    console.log("  --batch-size <n>      Number of usersPrivate docs to fetch per batch (default 50)");
    console.log("  --limit-users <n>     Stop after processing N users");
    console.log("  --max-entries <n>     Stop after emitting N food entries");
    console.log("  --verbose             Log per-user progress");
    console.log("  --help                Show this message");
}

function parseArgs(argv) {
    const args = argv.slice(2);
    const options = {
        output: DEFAULT_OUTPUT,
        batchSize: DEFAULT_BATCH_SIZE,
        limitUsers: null,
        maxEntries: null,
        verbose: false,
    };

    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === "--output" || arg === "-o") {
            const next = args[i + 1];
            if (!next) {
                throw new Error("Missing value for --output");
            }
            options.output = path.resolve(process.cwd(), next);
            i += 1;
        } else if (arg === "--batch-size") {
            const next = args[i + 1];
            if (!next) throw new Error("Missing value for --batch-size");
            const value = Number(next);
            if (!Number.isFinite(value) || value <= 0) {
                throw new Error("--batch-size must be a positive number");
            }
            options.batchSize = Math.max(1, Math.floor(value));
            i += 1;
        } else if (arg === "--limit-users") {
            const next = args[i + 1];
            if (!next) throw new Error("Missing value for --limit-users");
            const value = Number(next);
            if (!Number.isFinite(value) || value <= 0) {
                throw new Error("--limit-users must be a positive number");
            }
            options.limitUsers = Math.max(1, Math.floor(value));
            i += 1;
        } else if (arg === "--max-entries") {
            const next = args[i + 1];
            if (!next) throw new Error("Missing value for --max-entries");
            const value = Number(next);
            if (!Number.isFinite(value) || value <= 0) {
                throw new Error("--max-entries must be a positive number");
            }
            options.maxEntries = Math.max(1, Math.floor(value));
            i += 1;
        } else if (arg === "--verbose" || arg === "-v") {
            options.verbose = true;
        } else if (arg === "--help" || arg === "-h") {
            printUsage();
            process.exit(0);
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }
    return options;
}

function ensureDb() {
    if (firestore) return firestore;
    if (!appInitialised) {
        try {
            initializeApp();
        } catch (error) {
            if (!error?.message?.includes("already exists")) {
                throw error;
            }
        }
        appInitialised = true;
    }
    firestore = getFirestore();
    return firestore;
}

function normaliseHandle(value) {
    if (value === undefined || value === null) return "";
    let str = String(value).trim();
    if (!str) return "";
    if (str.startsWith("@")) str = str.slice(1).trim();
    return str;
}

function safeNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function coercePortion(q) {
    if (q == null) return 1;
    if (typeof q === "number") return Number.isFinite(q) && q > 0 ? q : 1;
    const s = String(q).trim();
    if (!s) return 1;
    if (s.includes("/")) {
        const [a, b] = s.split("/").map(Number);
        const v = a && b ? a / b : NaN;
        return Number.isFinite(v) && v > 0 ? v : 1;
    }
    const v = Number(s);
    return Number.isFinite(v) && v > 0 ? v : 1;
}

function scaleMacros(m = {}, quantity = 1) {
    const q = coercePortion(quantity);
    const c = m.calories || 0;
    const p = m.protein || 0;
    const cb = m.carbs || 0;
    const f = m.fat || 0;
    return {
        calories: c * q,
        protein: p * q,
        carbs: cb * q,
        fat: f * q,
    };
}

function parseMacrosFromDescription(desc = "", quantity = 1) {
    const text = String(desc);

    let cal = 0;
    const calLabel = text.match(/calories?\s*:\s*(\d+(?:\.\d+)?)/i);
    const calBare = text.match(/(\d+(?:\.\d+)?)\s*(?:kcal|cal)\b/i);
    if (calLabel) cal = parseFloat(calLabel[1]);
    else if (calBare) cal = parseFloat(calBare[1]);

    const protMatch = text.match(/protein\s*:\s*(\d+(?:\.\d+)?)\s*g/i);
    const carbsMatch = text.match(/carb(?:s|ohydrate)?\s*:\s*(\d+(?:\.\d+)?)\s*g/i);
    const fatMatch = text.match(/fat\s*:\s*(\d+(?:\.\d+)?)\s*g/i);

    const base = {
        calories: Number.isFinite(cal) ? cal : 0,
        protein: protMatch ? parseFloat(protMatch[1]) : 0,
        carbs: carbsMatch ? parseFloat(carbsMatch[1]) : 0,
        fat: fatMatch ? parseFloat(fatMatch[1]) : 0,
    };

    return scaleMacros(base, quantity);
}

function ensureMacros(entry, quantity = 1) {
    if (entry?.macros && typeof entry.macros === "object") {
        return {
            calories: safeNumber(entry.macros.calories),
            protein: safeNumber(entry.macros.protein),
            carbs: safeNumber(entry.macros.carbs),
            fat: safeNumber(entry.macros.fat),
        };
    }
    const desc = entry?.description || entry?.desc || "";
    const computed = parseMacrosFromDescription(desc, quantity);
    return {
        calories: safeNumber(computed.calories),
        protein: safeNumber(computed.protein),
        carbs: safeNumber(computed.carbs),
        fat: safeNumber(computed.fat),
    };
}

function normalizeMeal(meal) {
    const value = String(meal || "").trim().toLowerCase();
    if (!value) return "Snacks";
    if (value.startsWith("break")) return "Breakfast";
    if (value.startsWith("lunch")) return "Lunch";
    if (value.startsWith("dinn")) return "Dinner";
    if (value.startsWith("snack")) return "Snacks";
    if (value.includes("pre")) return "Pre-Workout";
    if (value.includes("post")) return "Post-Workout";
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeMarkdown(value) {
    if (value === undefined || value === null) return "";
    const str = String(value)
        .replace(/\r?\n|\r/g, "<br>")
        .replace(/\|/g, "\\|");
    return str;
}

function toMillis(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : 0;
    if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value.toDate === "function") {
        const date = value.toDate();
        if (date instanceof Date && Number.isFinite(date.getTime())) return date.getTime();
    }
    if (typeof value.seconds === "number") {
        const nanos = typeof value.nanoseconds === "number" ? value.nanoseconds : 0;
        return value.seconds * 1000 + Math.round(nanos / 1e6);
    }
    return 0;
}

function inferDayMillis(dayKey) {
    if (!dayKey) return 0;
    const parsed = Date.parse(`${dayKey}T00:00:00Z`);
    return Number.isFinite(parsed) ? parsed : 0;
}

function resolveTimestamp(entry, dayKey) {
    const candidates = [
        entry?.loggedAt,
        entry?.createdAt,
        entry?.updatedAt,
        entry?.timestamp,
        entry?.completedAt,
    ];
    for (const candidate of candidates) {
        const ms = toMillis(candidate);
        if (ms) return ms;
    }
    return inferDayMillis(dayKey);
}

function formatNumber(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    const rounded = Math.round(num * 100) / 100;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-6) {
        return String(Math.round(rounded));
    }
    return rounded.toFixed(2);
}

function formatQuantity(value) {
    if (value === undefined || value === null) return "";
    const num = Number(value);
    if (Number.isFinite(num)) {
        if (Math.abs(num - Math.round(num)) < 1e-6) return String(Math.round(num));
        return (Math.round(num * 100) / 100).toFixed(2);
    }
    return String(value);
}

function formatIso(ms) {
    if (!ms) return "";
    const date = new Date(ms);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toISOString();
}

async function getUserDescriptor(db, uid, cache) {
    if (cache.has(uid)) return cache.get(uid);
    let publicData = null;
    try {
        const snap = await db.collection("usersPublic").doc(uid).get();
        if (snap.exists) publicData = snap.data() || {};
    } catch (error) {
        console.warn(`Failed to read usersPublic/${uid}:`, error?.message || error);
    }

    let handle = normaliseHandle(publicData?.handle || publicData?.username || "");
    let displayName = "";
    if (typeof publicData?.displayName === "string" && publicData.displayName) {
        displayName = publicData.displayName;
    } else if (typeof publicData?.name === "string" && publicData.name) {
        displayName = publicData.name;
    }

    if (!handle || !displayName) {
        try {
            const legacySnap = await db.collection("users").doc(uid).get();
            if (legacySnap.exists) {
                const legacy = legacySnap.data() || {};
                if (!handle) {
                    handle = normaliseHandle(legacy.handle || legacy.username);
                }
                if (!displayName) {
                    if (typeof legacy.displayName === "string" && legacy.displayName) {
                        displayName = legacy.displayName;
                    } else if (typeof legacy.name === "string" && legacy.name) {
                        displayName = legacy.name;
                    }
                }
            }
        } catch (error) {
            console.warn(`Failed to read users/${uid}:`, error?.message || error);
        }
    }

    const descriptor = {
        uid,
        handle: handle ? `@${handle}` : "",
        displayName,
    };
    cache.set(uid, descriptor);
    return descriptor;
}

function normalizeEntry(data, dayKey, entryId) {
    const quantity = safeNumber(data?.quantity ?? data?.qty ?? data?.portion, 1) || 1;
    const macros = ensureMacros(data, quantity);
    const timestamp = resolveTimestamp(data, dayKey);

    return {
        entryId: entryId,
        dayKey,
        meal: normalizeMeal(data?.mealType || data?.meal || data?.mealName),
        foodName: data?.name || data?.food_name || data?.foodName || "",
        brand: data?.brand || data?.brand_name || "",
        description: data?.description || data?.desc || "",
        quantity,
        macros,
        source: data?.source || data?.origin || "",
        serving: data?.servingDesc || data?.servingDescription || data?.serving || "",
        timestamp,
    };
}

function buildTableRow(index, row) {
    const fields = [
        index,
        row.handle || "(unknown)",
        row.uid,
        row.dayKey,
        row.meal || "",
        row.foodName || "",
        row.brand || "",
        row.description || "",
        formatQuantity(row.quantity),
        formatNumber(row.macros?.calories),
        formatNumber(row.macros?.protein),
        formatNumber(row.macros?.carbs),
        formatNumber(row.macros?.fat),
        formatIso(row.timestamp),
        row.source || "",
        row.entryId,
    ].map(escapeMarkdown);
    return `| ${fields.join(" | ")} |`;
}

async function exportFoodLogs(options) {
    const db = ensureDb();
    const handleCache = new Map();

    const headerLines = [
        "# Food Log Export",
        `Generated: ${new Date().toISOString()}`,
        "",
    ];

    const tableRows = [];
    const stats = {
        usersProcessed: 0,
        daysProcessed: 0,
        entriesProcessed: 0,
    };

    let lastDoc = null;
    let shouldStop = false;

    while (!shouldStop) {
        let query = db.collection("usersPrivate").orderBy("__name__").limit(options.batchSize);
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }
        const snap = await query.get();
        if (snap.empty) break;

        for (const userDoc of snap.docs) {
            if (options.limitUsers && stats.usersProcessed >= options.limitUsers) {
                shouldStop = true;
                break;
            }

            const uid = userDoc.id;
            const descriptor = await getUserDescriptor(db, uid, handleCache);
            let perUserEntries = 0;

            const logsSnap = await userDoc.ref.collection("foodLogs").get();
            if (logsSnap.empty) {
                if (options.verbose) {
                    console.log(`[skip] ${uid} has no food logs.`);
                }
                stats.usersProcessed += 1;
                continue;
            }

            for (const dayDoc of logsSnap.docs) {
                const dayKey = dayDoc.id;
                const entriesSnap = await dayDoc.ref.collection("entries").get();
                if (entriesSnap.empty) continue;

                let dayEntries = 0;
                entriesSnap.forEach((entryDoc) => {
                    if (options.maxEntries && stats.entriesProcessed >= options.maxEntries) {
                        shouldStop = true;
                        return;
                    }
                    const normalized = normalizeEntry(entryDoc.data() || {}, dayKey, entryDoc.id);
                    const row = {
                        uid,
                        handle: descriptor.handle || "",
                        ...normalized,
                    };
                    stats.entriesProcessed += 1;
                    perUserEntries += 1;
                    dayEntries += 1;
                    tableRows.push(buildTableRow(stats.entriesProcessed, row));
                });

                if (dayEntries > 0) stats.daysProcessed += 1;
                if (shouldStop) break;
            }

            stats.usersProcessed += 1;

            if (options.verbose) {
                console.log(
                    `[user] ${descriptor.handle || uid}: ${perUserEntries} entr${perUserEntries === 1 ? "y" : "ies"}`
                );
            }

            if (shouldStop) break;
        }

        lastDoc = snap.docs[snap.docs.length - 1];
    }

    headerLines.push(`Total users scanned: ${stats.usersProcessed}`);
    headerLines.push(`Total days with logs: ${stats.daysProcessed}`);
    headerLines.push(`Total food entries: ${stats.entriesProcessed}`);
    headerLines.push("");

    if (!tableRows.length) {
        headerLines.push("_No food entries found._");
    } else {
        headerLines.push(
            "| # | Handle | UID | Day | Meal | Food | Brand | Description | Qty | Calories | Protein | Carbs | Fat | Logged At | Source | Entry ID |"
        );
        headerLines.push(
            "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"
        );
        headerLines.push(...tableRows);
    }

    await fs.promises.mkdir(path.dirname(options.output), { recursive: true });
    await fs.promises.writeFile(options.output, `${headerLines.join("\n")}\n`, "utf8");

    console.log(`Exported ${stats.entriesProcessed} entries to ${options.output}`);
}

(async () => {
    try {
        const options = parseArgs(process.argv);
        await exportFoodLogs(options);
        process.exit(0);
    } catch (error) {
        console.error("Failed to export food logs:", error?.message || error);
        process.exit(1);
    }
})();

