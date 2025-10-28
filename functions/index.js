import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

setGlobalOptions({
    region: "us-central1",
    vpcConnector: "projects/spartan-8a55f/locations/us-central1/connectors/serverless-conn",
    vpcConnectorEgressSettings: "ALL_TRAFFIC",
});

// Initialize Admin SDK once per instance
try { initializeApp(); } catch { }
const adminDb = getFirestore();

// Secrets must be configured via Firebase/Google Secret Manager
const FATSECRET_KEY = defineSecret("FATSECRET_KEY");
const FATSECRET_SECRET = defineSecret("FATSECRET_SECRET");

// Simple in-memory cache per scope per function instance
const tokenCacheByScope = new Map(); // scope -> { accessToken, expiresAt }
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const fatsecretSearchCache = new Map(); // normalizedQuery|max|page -> { value, expiresAt }

export const computeHexagonStats = onCall({ region: "us-central1" }, async (request) => {
    try {
        if (!request.auth?.uid) {
            throw new HttpsError("unauthenticated", "Authentication required");
        }
        const zeroHex = {
            shoulders: 0,
            chest: 0,
            arms: 0,
            legs: 0,
            back: 0,
            abs: 0,
            overall: 0,
        };
        const zeroLast = {
            shoulders: 0,
            chest: 0,
            arms: 0,
            legs: 0,
            back: 0,
            abs: 0,
        };

        return {
            statsHexagon: zeroHex,
            lastTrained: zeroLast,
            statsExercises: {},
            debug: {},
        };
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        logger.error("computeHexagonStats failure", error);
        throw new HttpsError("invalid-argument", "Unable to compute hexagon stats");
    }
});

async function getAccessToken(scope = "basic") {
    const now = Date.now();
    const cached = tokenCacheByScope.get(scope);
    if (cached && cached.accessToken && now < cached.expiresAt - 60_000) {
        return cached.accessToken;
    }

    const client_id = FATSECRET_KEY.value();
    const client_secret = FATSECRET_SECRET.value();

    const resp = await fetch("https://oauth.fatsecret.com/connect/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            scope,
            client_id,
            client_secret,
        }).toString(),
    });

    if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        logger.error("FatSecret token error", { status: resp.status, text });
        throw new HttpsError("internal", "Failed to get FatSecret access token");
    }

    const data = await resp.json();
    if (!data?.access_token || !data?.expires_in) {
        logger.error("FatSecret token response missing fields", data);
        throw new HttpsError("internal", "Invalid token response from FatSecret");
    }

    const entry = { accessToken: data.access_token, expiresAt: now + data.expires_in * 1000 };
    tokenCacheByScope.set(scope, entry);
    return entry.accessToken;
}

async function fatSecretRequest(methodName, params = {}, scope = "basic") {
    const token = await getAccessToken(scope);
    const url = "https://platform.fatsecret.com/rest/server.api";

    const body = new URLSearchParams({
        method: methodName,
        format: "json",
        ...Object.fromEntries(
            Object.entries(params)
                .filter(([_, v]) => v !== undefined && v !== null)
                .map(([k, v]) => [k, String(v)])
        ),
    }).toString();

    const resp = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || json?.error) {
        logger.error("FatSecret API error", { status: resp.status, json });
        const message = json?.error?.message || `FatSecret request failed: ${resp.status}`;
        throw new HttpsError("internal", message);
    }

    return json;
}

// Allow-list only required methods
const ALLOWED_METHODS = new Set(["foods.search"]);

export const fatsecretMethod = onCall(
    { region: "us-central1", secrets: [FATSECRET_KEY, FATSECRET_SECRET] },
    async (request) => {
        const { method, params } = request.data || {};
        if (!method || typeof method !== "string") {
            throw new HttpsError("invalid-argument", "Missing 'method' string.");
        }
        if (!ALLOWED_METHODS.has(method)) {
            throw new HttpsError("permission-denied", `Method not allowed: ${method}`);
        }
        return await fatSecretRequest(method, params || {}, "basic");
    }
);

// Dedicated: get full food details (includes micro nutrients per serving)
export const fatsecretGetFood = onCall(
    { region: "us-central1", secrets: [FATSECRET_KEY, FATSECRET_SECRET] },
    async (request) => {
        const { food_id } = request.data || {};
        const fid = String(food_id || "").trim();
        if (!fid) throw new HttpsError("invalid-argument", "Missing 'food_id'.");

        // Ask API to flag default serving if possible
        const res = await fatSecretRequest("food.get.v2", { food_id: fid, flag_default_serving: "true" }, "basic");
        const food = res?.food || {};

        // Ensure minimal fields for client usage
        try {
            if (!food.food_description) {
                const servings = food?.servings?.serving;
                const arr = Array.isArray(servings) ? servings : (servings ? [servings] : []);
                const def = arr.find((s) => String(s?.is_default || "") === "1") || arr[0] || {};
                const calories = Number(def?.calories || 0);
                const fat = Number(def?.fat || 0);
                const carbs = Number(def?.carbohydrate || 0);
                const protein = Number(def?.protein || 0);
                const desc = `Per ${def?.serving_description || "1 serving"} - Calories: ${Math.round(calories)} kcal | Fat: ${+fat} g | Carbs: ${+carbs} g | Protein: ${+protein} g`;
                food.food_description = desc;
            }
        } catch { }

        return { food };
    }
);

export const fatsecretSearchFood = onCall(
    { region: "us-central1", secrets: [FATSECRET_KEY, FATSECRET_SECRET] },
    async (request) => {
        const { query, max_results = 10, page_number = 0 } = request.data || {};
        if (!query || typeof query !== "string") {
            throw new HttpsError("invalid-argument", "Missing 'query' string.");
        }

        // Clamp limits (FatSecret caps at 50 per page)
        const safeMax = Math.min(Math.max(Number(max_results) || 10, 1), 50);
        const safePage = Math.max(Number(page_number) || 0, 0);

        const overallStartedAt = Date.now();
        const qRaw = String(query || "");

        // -------------- helpers -------------- //
        const normalize = (s) =>
            String(s || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, " ")
                .replace(/\s+/g, " ")
                .trim();

        const toTokens = (s) => normalize(s).split(" ").filter(Boolean);

        const SYNONYM_TABLE = {
            soda: ["pop", "soft drink", "cola"],
            pop: ["soda", "soft drink", "cola"],
            cola: ["soda", "soft drink"],
            fries: ["french fries", "chips"],
            fry: ["french fry", "french fries", "chips"],
            potatoes: ["potato", "fries"],
            potato: ["potatoes", "fries"],
            oatmeal: ["porridge", "oats"],
            oats: ["oatmeal", "porridge"],
            yogurt: ["yoghurt"],
            yoghurt: ["yogurt"],
            candy: ["sweets", "confectionery"],
            cookies: ["biscuits"],
            cookie: ["biscuit", "cookies"],
            biscuit: ["cookie", "cookies"],
            pasta: ["spaghetti", "noodles"],
            noodles: ["pasta"],
            rice: ["white rice", "brown rice"],
            burger: ["hamburger"],
            hamburger: ["burger"],
            sandwich: ["sub", "hoagie"],
            sub: ["sandwich", "hoagie"],
            wrap: ["burrito"],
            burrito: ["wrap"],
            beans: ["legumes"],
            legumes: ["beans"],
            egg: ["eggs"],
            eggs: ["egg"],
            cereal: ["breakfast cereal"],
        };

        const expandTokensForMatch = (tokens) => {
            const expanded = new Set();
            for (const token of tokens) {
                if (!token) continue;
                expanded.add(token);
                const norm = normalize(token);
                if (norm) expanded.add(norm);
                if (norm.endsWith("ies")) expanded.add(norm.replace(/ies$/, "y"));
                if (norm.endsWith("es") && norm.length > 3) expanded.add(norm.replace(/es$/, ""));
                if (norm.endsWith("s") && norm.length > 3) expanded.add(norm.slice(0, -1));
                const syns = SYNONYM_TABLE[norm];
                if (Array.isArray(syns)) {
                    for (const syn of syns) {
                        expanded.add(syn);
                        for (const part of toTokens(syn)) expanded.add(part);
                    }
                }
            }
            return expanded;
        };

        const charNGrams = (s, n = 3) => {
            const str = normalize(s).replace(/\s+/g, "");
            const grams = new Set();
            if (!str) return grams;
            for (let i = 0; i <= Math.max(0, str.length - n); i++) {
                grams.add(str.slice(i, i + n));
            }
            if (grams.size === 0) grams.add(str);
            return grams;
        };

        const jaccard = (aSet, bSet) => {
            if (!aSet || !bSet || aSet.size === 0 || bSet.size === 0) return 0;
            let inter = 0;
            for (const x of aSet) if (bSet.has(x)) inter++;
            return inter / (aSet.size + bSet.size - inter);
        };

        const tokenOverlap = (aTokens, bTokens) => {
            if (!aTokens.length || !bTokens.length) return 0;
            const a = expandTokensForMatch(aTokens);
            const b = expandTokensForMatch(bTokens);
            let inter = 0;
            for (const t of a) if (b.has(t)) inter++;
            return (2 * inter) / (a.size + b.size);
        };

        const levenshteinSimilarity = (a, b) => {
            const from = normalize(a).replace(/\s+/g, "");
            const to = normalize(b).replace(/\s+/g, "");
            if (!from && !to) return 1;
            if (!from || !to) return 0;
            const maxLen = Math.max(from.length, to.length);
            if (maxLen === 0) return 1;

            const cappedFrom = from.slice(0, 80);
            const cappedTo = to.slice(0, 80);
            const m = cappedFrom.length;
            const n = cappedTo.length;
            let prev = new Array(n + 1);
            let curr = new Array(n + 1);
            for (let j = 0; j <= n; j++) prev[j] = j;
            for (let i = 1; i <= m; i++) {
                curr[0] = i;
                const charA = cappedFrom.charCodeAt(i - 1);
                for (let j = 1; j <= n; j++) {
                    const cost = charA === cappedTo.charCodeAt(j - 1) ? 0 : 1;
                    curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
                }
                [prev, curr] = [curr, prev];
            }
            const distance = prev[n];
            return Math.max(0, 1 - distance / maxLen);
        };

        const similarityScore = (queryStr, candidateStr) => {
            const qTokens = toTokens(queryStr);
            const cTokens = toTokens(candidateStr);
            const tokenScore = tokenOverlap(qTokens, cTokens);
            const qGrams = charNGrams(queryStr);
            const cGrams = charNGrams(candidateStr);
            const gramScore = jaccard(qGrams, cGrams);
            const levScore = levenshteinSimilarity(queryStr, candidateStr);

            let boost = 0;
            const normalizedQuery = normalize(queryStr);
            const normalizedCandidate = normalize(candidateStr);
            if (qTokens.length > 0 && normalizedCandidate.startsWith(qTokens[0])) boost += 0.05;
            if (normalizedQuery && normalizedCandidate.includes(normalizedQuery)) boost += 0.1;
            const allTokensPresent = qTokens.every((t) => normalizedCandidate.includes(t));
            if (allTokensPresent) boost += 0.05;

            const score = 0.45 * tokenScore + 0.25 * gramScore + 0.25 * levScore + boost;
            return Math.max(0, Math.min(1, score));
        };

        const buildDisplayName = (food) => {
            const name = String(food?.food_name || "");
            const brand = String(food?.brand_name || "");
            return brand ? `${name} ${brand}` : name;
        };

        const qNorm = normalize(qRaw);
        const cacheKey = `${qNorm}|${safeMax}|${safePage}`;
        const cachedEntry = fatsecretSearchCache.get(cacheKey);
        if (cachedEntry && cachedEntry.expiresAt > overallStartedAt) {
            logger.info("fatsecretSearchFood stats", {
                query: qNorm,
                safeMax,
                safePage,
                cache: "hit",
                durationMs: Date.now() - overallStartedAt,
            });
            return cachedEntry.value;
        }

        const qTokens = toTokens(qRaw);
        const candidates = new Set();

        const addCandidate = (expr) => {
            const cleaned = String(expr || "").trim();
            if (!cleaned) return;
            candidates.add(cleaned);
        };

        const addTokenVariants = (token) => {
            const variants = new Set();
            const raw = String(token || "").trim();
            if (!raw) return;
            variants.add(raw);
            const norm = normalize(raw);
            if (norm && norm !== raw) variants.add(norm);

            if (norm.endsWith("ies")) {
                const singular = norm.replace(/ies$/, "y");
                variants.add(singular);
            }
            if (norm.endsWith("es")) {
                variants.add(norm.replace(/es$/, ""));
            }
            if (norm.endsWith("s") && norm.length > 3) {
                variants.add(norm.slice(0, -1));
            } else {
                variants.add(`${norm}s`);
            }

            const syns = SYNONYM_TABLE[norm];
            if (Array.isArray(syns)) {
                for (const syn of syns) variants.add(syn);
            }

            for (const variant of variants) {
                addCandidate(variant);
            }
        };

        addCandidate(qRaw);
        if (qNorm && qNorm !== qRaw.trim()) addCandidate(qNorm);
        const qSynonyms = SYNONYM_TABLE[qNorm];
        if (Array.isArray(qSynonyms)) {
            for (const syn of qSynonyms) addCandidate(syn);
        }
        if (qTokens.length > 1) {
            const sorted = [...qTokens].sort().join(" ");
            if (sorted && sorted !== qNorm) candidates.add(sorted);
        }
        if (qTokens.length >= 2) {
            for (let size = Math.min(3, qTokens.length); size >= 2; size--) {
                for (let i = 0; i <= qTokens.length - size; i++) {
                    addCandidate(qTokens.slice(i, i + size).join(" "));
                }
            }
        }
        const STOP = new Set([
            "the", "and", "for", "with", "without", "of", "to", "in", "on", "a", "an", "per",
            "cup", "cups", "tbsp", "tsp", "tablespoon", "tablespoons", "teaspoon", "teaspoons",
            "oz", "ml", "l", "g", "kg", "gram", "grams", "milliliter", "milliliters", "liter", "liters",
        ]);
        for (const t0 of qTokens) {
            const t = t0.toLowerCase();
            if (STOP.has(t)) continue;
            if (t.length >= 3) addCandidate(t);
            if (t.length >= 4) addCandidate(t.slice(0, 3));
            if (t.length >= 5) addCandidate(t.slice(0, 4));
            addTokenVariants(t);
        }

        const variantListAll = Array.from(candidates);
        const [primaryVariant, ...variantList] = variantListAll;
        const RESULTS_PER_PAGE = Math.min(50, Math.max(safeMax, 20));
        const MAX_TOTAL_CALLS = 8;
        const MAX_CONCURRENT_VARIANTS = 3;
        const SCORE_EARLY_EXIT_THRESHOLD = 0.6;

        const byId = new Map();
        const successfulVariants = new Set();
        let highScoreCount = 0;
        let calls = 0;
        let scheduled = 0;
        let stopEarly = false;
        let totalCallDurationMs = 0;

        const handleResultList = (expr, list) => {
            let anyAdded = false;
            for (const item of list) {
                const fid = String(item?.food_id || "");
                if (!fid) continue;
                const display = buildDisplayName(item);
                const score = similarityScore(qRaw, display);
                const prev = byId.get(fid);
                if (prev && score <= prev.bestScore) continue;
                const prevAbove = prev?.bestScore >= SCORE_EARLY_EXIT_THRESHOLD;
                const newAbove = score >= SCORE_EARLY_EXIT_THRESHOLD;
                byId.set(fid, { item, bestScore: score });
                if (newAbove && !prevAbove) {
                    highScoreCount++;
                }
                anyAdded = true;
            }
            if (anyAdded) {
                successfulVariants.add(expr);
                if (highScoreCount >= safeMax) {
                    stopEarly = true;
                }
            }
        };

        const executeTask = async ({ expr, page }) => {
            const requestStart = Date.now();
            try {
                const res = await fatSecretRequest(
                    "foods.search",
                    {
                        search_expression: expr,
                        max_results: RESULTS_PER_PAGE,
                        page_number: page,
                    },
                    "basic"
                );
                const foods = res?.foods?.food;
                if (!foods) return;
                const list = Array.isArray(foods) ? foods : [foods];
                if (!list.length) return;
                handleResultList(expr, list);
            } catch (e) {
                logger.warn("fatsecretSearchFood: variant search failed", {
                    expr,
                    page,
                    message: e?.message || e,
                });
            } finally {
                calls++;
                scheduled = Math.max(0, scheduled - 1);
                totalCallDurationMs += Date.now() - requestStart;
            }
        };

        const processQueue = async (queue) => {
            let index = 0;
            while (index < queue.length && !stopEarly) {
                const available = MAX_TOTAL_CALLS - (calls + scheduled);
                if (available <= 0) break;
                const batchSize = Math.min(MAX_CONCURRENT_VARIANTS, available, queue.length - index);
                if (batchSize <= 0) break;
                const batch = [];
                for (let i = 0; i < batchSize; i++) {
                    const task = queue[index++];
                    scheduled++;
                    batch.push(executeTask(task));
                }
                await Promise.all(batch);
            }
        };

        if (primaryVariant) {
            scheduled++;
            await executeTask({ expr: primaryVariant, page: 0 });
        }

        if (!stopEarly && variantList.length) {
            const firstPass = variantList.map((expr) => ({ expr, page: 0 }));
            await processQueue(firstPass);
        }

        if (!stopEarly && byId.size < safeMax && calls < MAX_TOTAL_CALLS) {
            const remainingBudget = MAX_TOTAL_CALLS - calls;
            if (remainingBudget > 0 && successfulVariants.size > 0) {
                const secondPass = Array.from(successfulVariants)
                    .slice(0, remainingBudget)
                    .map((expr) => ({ expr, page: 1 }));
                if (secondPass.length) {
                    await processQueue(secondPass);
                }
            }
        }

        const ranked = Array.from(byId.values())
            .sort((a, b) => b.bestScore - a.bestScore)
            .slice(0, safeMax)
            .map((x) => x.item);

        const response = {
            foods: {
                food: ranked,
                max_results: String(safeMax),
                page_number: String(safePage),
                total_results: String(byId.size),
            },
        };

        const now = Date.now();
        fatsecretSearchCache.set(cacheKey, { value: response, expiresAt: now + SEARCH_CACHE_TTL_MS });
        if (fatsecretSearchCache.size > 64) {
            for (const [key, entry] of fatsecretSearchCache) {
                if (entry.expiresAt <= now || fatsecretSearchCache.size > 64) {
                    fatsecretSearchCache.delete(key);
                }
                if (fatsecretSearchCache.size <= 64) break;
            }
        }

        logger.info("fatsecretSearchFood stats", {
            query: qNorm,
            safeMax,
            safePage,
            cache: "miss",
            variantsConsidered: variantListAll.length,
            variantsWithHits: successfulVariants.size,
            totalCandidates: byId.size,
            calls,
            durationMs: Date.now() - overallStartedAt,
            totalCallDurationMs,
            stopEarly,
            highScoreCountAboveThreshold: highScoreCount,
        });

        return response;
    }
);

// ---- Barcode Lookup (Premier Exclusive) ---- //
function toGtin13(raw) {
    try {
        const digits = String(raw || "").replace(/\D/g, "");
        if (!digits) return "";
        // Pad left with zeros to 13 (GTIN-13 requirement)
        return digits.length >= 13 ? digits.slice(-13) : digits.padStart(13, "0");
    } catch {
        return "";
    }
}

export const fatsecretLookupBarcode = onCall(
    { region: "us-central1", secrets: [FATSECRET_KEY, FATSECRET_SECRET] },
    async (request) => {
        const { barcode } = request.data || {};
        const gtin = toGtin13(barcode);
        if (!gtin || gtin.length !== 13) {
            throw new HttpsError("invalid-argument", "Invalid or missing barcode");
        }

        // Resolve barcode -> food (FatSecret v2 returns full payload)
        let foodRes;
        try {
            foodRes = await fatSecretRequest(
                "food.find_id_for_barcode.v2",
                { barcode: gtin, flag_default_serving: "true" },
                "premier barcode"
            );
        } catch (err) {
            if (err instanceof HttpsError) {
                const msg = String(err.message || "").toLowerCase();
                if (msg.includes("no food") || msg.includes("211")) {
                    throw new HttpsError("not-found", "No food found for this barcode");
                }
            }
            throw err;
        }

        const food = foodRes?.food || {};
        if (!food || Object.keys(food).length === 0) {
            throw new HttpsError("not-found", "No food found for this barcode");
        }

        // Ensure a FatSecret-like food_description exists (used by client to parse macros)
        try {
            if (!food.food_description) {
                const servings = food?.servings?.serving;
                const arr = Array.isArray(servings) ? servings : (servings ? [servings] : []);
                const def = arr.find((s) => String(s?.is_default || "") === "1") || arr[0] || {};
                const calories = Number(def?.calories || 0);
                const fat = Number(def?.fat || 0);
                const carbs = Number(def?.carbohydrate || 0);
                const protein = Number(def?.protein || 0);
                const desc = `Per ${def?.serving_description || "1 serving"} - Calories: ${Math.round(calories)} kcal | Fat: ${+fat} g | Carbs: ${+carbs} g | Protein: ${+protein} g`;
                food.food_description = desc;
            }
        } catch { }

        return { food };
    }
);


// --------------- Leaderboard Last Rank Refresh ---------------- //
const EPSILON = 1e-6;

function toUid(value) {
    if (value === undefined || value === null) return null;
    try {
        const str = String(value).trim();
        return str ? str : null;
    } catch {
        return null;
    }
}

function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function computeGlobalRanks(valueMap) {
    const entries = Array.from(valueMap.entries()).map(([uid, value]) => ({
        uid,
        value: safeNumber(value),
    }));
    entries.sort((a, b) => b.value - a.value);

    const ranks = new Map();
    let lastRank = 0;
    let lastValue = null;
    entries.forEach((entry, index) => {
        if (index === 0) {
            lastRank = 1;
            lastValue = entry.value;
        } else if (Math.abs(entry.value - lastValue) > EPSILON) {
            lastRank = index + 1;
            lastValue = entry.value;
        }
        ranks.set(entry.uid, lastRank);
    });
    return ranks;
}

function computeSubsetRank(valueMap, uid, subset) {
    if (!subset || subset.size === 0) return null;
    const target = String(uid);
    if (!subset.has(target)) {
        subset = new Set([...subset, target]);
    }

    const userValue = safeNumber(valueMap.get(target));
    let participants = 0;
    let greater = 0;
    subset.forEach((member) => {
        const id = String(member);
        if (!id) return;
        if (!valueMap.has(id) && id !== target) return;
        participants += 1;
        if (id === target) return;
        const val = safeNumber(valueMap.get(id));
        if (val > userValue + EPSILON) greater += 1;
    });
    if (participants === 0) return null;
    return greater + 1;
}

function lastRanksEqual(prev, next) {
    const prevKeys = Object.keys(prev || {});
    const nextKeys = Object.keys(next || {});
    if (prevKeys.length !== nextKeys.length) return false;
    for (const exercise of nextKeys) {
        if (!Object.prototype.hasOwnProperty.call(prev, exercise)) return false;
        const prevScopes = prev[exercise] || {};
        const nextScopes = next[exercise] || {};
        const prevScopeKeys = Object.keys(prevScopes);
        const nextScopeKeys = Object.keys(nextScopes);
        if (prevScopeKeys.length !== nextScopeKeys.length) return false;
        for (const scope of nextScopeKeys) {
            if (!Object.prototype.hasOwnProperty.call(prevScopes, scope)) return false;
            const a = safeNumber(prevScopes[scope]);
            const b = safeNumber(nextScopes[scope]);
            if (a !== b) return false;
        }
    }
    return true;
}

export const refreshLeaderboardLastRanks = onSchedule(
    {
        schedule: '0 0 * * 0',
        timeZone: 'UTC',
        region: 'us-central1',
        timeoutSeconds: 540,
        memory: '1GiB',
    },
    async () => {
        const started = Date.now();
        const usersSnap = await adminDb.collection('users').get();
        if (usersSnap.empty) {
            logger.info('refreshLeaderboardLastRanks: no users found');
            return;
        }

        const users = [];
        const followingByUid = new Map();
        const statsByUid = new Map();
        const existingLastRanks = new Map();

        usersSnap.forEach((docSnap) => {
            try {
                const data = docSnap.data() || {};
                const uid = toUid(data?.uid) || docSnap.id;
                if (!uid) return;
                const ref = docSnap.ref;
                const statsExercises =
                    data?.statsExercises && typeof data.statsExercises === 'object'
                        ? data.statsExercises
                        : {};

                const followingSet = new Set([uid]);
                const followingArr = Array.isArray(data?.following) ? data.following : [];
                for (const entry of followingArr) {
                    const fUid = toUid(entry?.uid ?? entry?.id ?? entry);
                    if (fUid) followingSet.add(fUid);
                }

                users.push({ uid, ref, statsExercises, data });
                followingByUid.set(uid, followingSet);
                statsByUid.set(uid, statsExercises);
                existingLastRanks.set(uid, data?.lastRanks || {});
            } catch (err) {
                logger.warn('refreshLeaderboardLastRanks: failed to process user doc', {
                    id: docSnap.id,
                    message: err?.message || err,
                });
            }
        });

        if (!users.length) {
            logger.info('refreshLeaderboardLastRanks: no users after filtering');
            return;
        }

        const tribeMembers = new Map();
        const tribesForUser = new Map();
        try {
            const tribeSnap = await adminDb.collection('tribes').get();
            tribeSnap.forEach((docSnap) => {
                const tid = docSnap.id;
                const data = docSnap.data() || {};
                const membersArr = Array.isArray(data?.members) ? data.members : [];
                const set = tribeMembers.get(tid) || new Set();
                membersArr.forEach((member) => {
                    const mUid = toUid(member?.uid ?? member?.id ?? member);
                    if (!mUid) return;
                    set.add(mUid);
                    const byUser = tribesForUser.get(mUid) || new Set();
                    byUser.add(tid);
                    tribesForUser.set(mUid, byUser);
                });
                if (set.size) tribeMembers.set(tid, set);
            });
        } catch (err) {
            logger.warn('refreshLeaderboardLastRanks: tribe fetch failed', err?.message || err);
        }

        users.forEach(({ uid, data }) => {
            const arr = Array.isArray(data?.tribeIds) ? data.tribeIds : [];
            arr.forEach((tidRaw) => {
                const tid = toUid(tidRaw);
                if (!tid) return;
                const memberSet = tribeMembers.get(tid) || new Set();
                memberSet.add(uid);
                tribeMembers.set(tid, memberSet);
                const byUser = tribesForUser.get(uid) || new Set();
                byUser.add(tid);
                tribesForUser.set(uid, byUser);
            });
        });

        const allExercises = new Set();
        statsByUid.forEach((stats) => {
            Object.keys(stats || {}).forEach((exercise) => {
                if (exercise) allExercises.add(exercise);
            });
        });

        if (!allExercises.size) {
            logger.info('refreshLeaderboardLastRanks: no exercises found to rank');
            return;
        }

        const exerciseMaps = new Map();
        for (const exercise of allExercises) {
            const valueMap = new Map();
            users.forEach(({ uid }) => {
                const stats = statsByUid.get(uid) || {};
                const exStats = stats?.[exercise] || {};
                const value = safeNumber(exStats?.['1RM']);
                valueMap.set(uid, value);
            });
            const ranks = computeGlobalRanks(valueMap);
            exerciseMaps.set(exercise, { valueMap, ranks });
        }

        const updates = [];
        users.forEach(({ uid, ref, statsExercises }) => {
            const exerciseNames = Object.keys(statsExercises || {});
            const nextLastRanks = {};

            if (!exerciseNames.length) {
                const existing = existingLastRanks.get(uid) || {};
                if (Object.keys(existing).length) {
                    updates.push({
                        ref,
                        data: { lastRanks: FieldValue.delete(), lastRanksUpdatedAt: FieldValue.serverTimestamp() },
                    });
                }
                return;
            }

            const followingSet = followingByUid.get(uid) || new Set([uid]);
            const tribeSet = tribesForUser.get(uid) || new Set();

            exerciseNames.forEach((exercise) => {
                const config = exerciseMaps.get(exercise);
                if (!config) return;
                const scopes = {};
                const globalRank = config.ranks.get(uid);
                if (Number.isFinite(globalRank)) scopes.global = globalRank;

                const followingRank = computeSubsetRank(config.valueMap, uid, followingSet);
                if (Number.isFinite(followingRank)) scopes.following = followingRank;

                tribeSet.forEach((tid) => {
                    const members = tribeMembers.get(tid);
                    if (!members || !members.size) return;
                    const rank = computeSubsetRank(config.valueMap, uid, members);
                    if (Number.isFinite(rank)) scopes[tid] = rank;
                });

                if (Object.keys(scopes).length) {
                    nextLastRanks[exercise] = scopes;
                }
            });

            const existing = existingLastRanks.get(uid) || {};
            const newIsEmpty = Object.keys(nextLastRanks).length === 0;
            let needsUpdate = false;
            if (newIsEmpty) {
                if (Object.keys(existing).length) needsUpdate = true;
            } else if (!Object.keys(existing).length) {
                needsUpdate = true;
            } else if (!lastRanksEqual(existing, nextLastRanks)) {
                needsUpdate = true;
            }

            if (!needsUpdate) return;

            const updateData = newIsEmpty
                ? { lastRanks: FieldValue.delete(), lastRanksUpdatedAt: FieldValue.serverTimestamp() }
                : { lastRanks: nextLastRanks, lastRanksUpdatedAt: FieldValue.serverTimestamp() };
            updates.push({ ref, data: updateData });
        });

        if (!updates.length) {
            logger.info(
                'refreshLeaderboardLastRanks: no user updates required (%d users, %d exercises, %dms)',
                users.length,
                allExercises.size,
                Date.now() - started,
            );
            return;
        }

        let batch = adminDb.batch();
        let writes = 0;
        for (const { ref, data } of updates) {
            batch.set(ref, data, { merge: true });
            writes += 1;
            if (writes === 400) {
                await batch.commit();
                batch = adminDb.batch();
                writes = 0;
            }
        }
        if (writes > 0) {
            await batch.commit();
        }

        logger.info(
            'refreshLeaderboardLastRanks: updated %d users (%d exercises) in %dms',
            updates.length,
            allExercises.size,
            Date.now() - started,
        );
    }
);


const toMillisSafe = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return numeric;
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) return parsed;
        return null;
    }
    if (value instanceof Date) {
        const ms = value.getTime();
        return Number.isFinite(ms) ? ms : null;
    }
    if (typeof value === "object") {
        try {
            if (typeof value.toDate === "function") {
                const date = value.toDate();
                if (date instanceof Date) {
                    const ms = date.getTime();
                    if (Number.isFinite(ms)) return ms;
                }
            }
        } catch { }
        const seconds = Number(value.seconds);
        if (Number.isFinite(seconds)) {
            const nanos = Number(value.nanoseconds ?? value.nanos ?? 0);
            const extra = Number.isFinite(nanos) ? Math.floor(nanos / 1e6) : 0;
            return seconds * 1000 + extra;
        }
    }
    return null;
};

const workoutIdentityKey = (workout) => {
    if (!workout || typeof workout !== "object") return null;
    const wid =
        workout?.wid ??
        workout?.id ??
        workout?.workoutId ??
        workout?.sessionId ??
        workout?.workoutUid ??
        null;
    if (wid !== null && wid !== undefined) {
        return `wid:${String(wid)}`;
    }

    const createdMs =
        toMillisSafe(workout?.completedAt) ??
        toMillisSafe(workout?.finishedAt) ??
        toMillisSafe(workout?.created) ??
        null;

    if (createdMs !== null) {
        const owner =
            workout?.creatorUID ??
            workout?.creatorUid ??
            workout?.uid ??
            workout?.ownerUid ??
            "";
        const name = typeof workout?.name === "string" ? workout.name.toLowerCase() : "";
        return `time:${createdMs}:${owner}:${name}`;
    }

    try {
        return `json:${JSON.stringify(workout)}`;
    } catch {
        return null;
    }
};

const normalizeWorkoutMedia = (workout) => {
    const output = [];
    const seen = new Set();

    const pushEntry = (uri, type = "image") => {
        if (!uri) return;
        const trimmed = String(uri).trim();
        if (!trimmed) return;
        const key = `${trimmed}|${type}`;
        if (seen.has(key)) return;
        seen.add(key);
        output.push({ uri: trimmed, type: type === "video" ? "video" : "image" });
    };

    const processEntry = (entry) => {
        if (!entry) return;
        if (typeof entry === "string") {
            pushEntry(entry, "image");
            return;
        }
        if (typeof entry === "object") {
            const uri =
                entry?.uri ??
                entry?.url ??
                entry?.image ??
                entry?.photoURL ??
                entry?.photoUrl ??
                entry?.source ??
                null;
            if (!uri) return;
            const rawType = (entry?.type ?? entry?.mediaType ?? entry?.kind ?? "").toString().toLowerCase();
            const type = rawType.includes("video") ? "video" : "image";
            pushEntry(uri, type);
        }
    };

    if (Array.isArray(workout?.media)) workout.media.forEach(processEntry);
    if (Array.isArray(workout?.images)) workout.images.forEach(processEntry);

    return output;
};

const sanitizeWorkoutSnapshot = (workout) => {
    if (!workout || typeof workout !== "object") return null;
    try {
        const clone = JSON.parse(JSON.stringify(workout));
        if (!clone) return null;
        const createdMs = toMillisSafe(clone.created);
        if (createdMs !== null) {
            clone.created = createdMs;
        } else {
            delete clone.created;
        }
        if (clone.wid !== undefined && clone.wid !== null) {
            clone.wid = String(clone.wid);
        }
        if (clone.id !== undefined && clone.id !== null && clone.wid === undefined) {
            clone.id = String(clone.id);
        }
        if (!clone.privacyMode || typeof clone.privacyMode !== "string" || !clone.privacyMode.trim()) {
            clone.privacyMode = "global";
        }
        return clone;
    } catch {
        const fallback = {
            wid: workout?.wid ?? workout?.id ?? null,
            name: workout?.name ?? workout?.templateName ?? null,
            created: toMillisSafe(workout?.created) ?? Date.now(),
        };
        if (!fallback.privacyMode) fallback.privacyMode = "global";
        if (fallback.wid !== null && fallback.wid !== undefined) {
            fallback.wid = String(fallback.wid);
        }
        return fallback;
    }
};

const resolveUserHandle = (userData, fallbackUid) => {
    const candidates = [userData?.handle, userData?.username, userData?.tag, userData?.name];
    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim();
        }
    }
    if (fallbackUid) {
        const suffix = String(fallbackUid).slice(-6) || String(fallbackUid);
        return `user-${suffix}`;
    }
    return "user";
};

const resolveUserAvatar = (userData) => {
    const candidates = [userData?.pfp, userData?.pfpUrl, userData?.image, userData?.photoURL, userData?.photoUrl];
    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim();
        }
    }
    return "";
};

export const onCompletedWorkoutAutoPost = onDocumentWritten(
    "users/{uid}",
    async (event) => {
        const uid = event.params?.uid ? String(event.params.uid) : "";
        if (!uid) return;

        try {
            const afterSnap = event.data?.after;
            if (!afterSnap || !afterSnap.exists) return;
            const afterData = afterSnap.data() || {};
            const beforeData = event.data?.before?.data() || {};

            const afterWorkouts = Array.isArray(afterData?.completedWorkouts)
                ? afterData.completedWorkouts
                : [];
            if (afterWorkouts.length === 0) return;

            const beforeWorkouts = Array.isArray(beforeData?.completedWorkouts)
                ? beforeData.completedWorkouts
                : [];

            const seenKeys = new Set();
            beforeWorkouts.forEach((workout) => {
                const key = workoutIdentityKey(workout);
                if (key) seenKeys.add(key);
            });

            const newWorkouts = [];
            afterWorkouts.forEach((workout) => {
                const key = workoutIdentityKey(workout);
                if (!key) return;
                if (seenKeys.has(key)) return;
                seenKeys.add(key);
                newWorkouts.push(workout);
            });

            if (!newWorkouts.length) return;

            const handle = resolveUserHandle(afterData, uid);
            const avatar = resolveUserAvatar(afterData);
            const postsCollection = adminDb.collection("posts");
            const batch = adminDb.batch();
            const postIds = [];
            const postIdByWorkoutKey = new Map();

            newWorkouts.forEach((workout) => {
                const workoutSnapshot = sanitizeWorkoutSnapshot(workout);
                if (!workoutSnapshot) return;

                const privacy = typeof workoutSnapshot?.privacyMode === "string"
                    ? workoutSnapshot.privacyMode.trim().toLowerCase()
                    : "";
                if (privacy === "hidden") return;

                const media = normalizeWorkoutMedia(workoutSnapshot);
                const createdMs =
                    toMillisSafe(workoutSnapshot?.completedAt) ??
                    toMillisSafe(workoutSnapshot?.finishedAt) ??
                    toMillisSafe(workoutSnapshot?.created) ??
                    Date.now();

                if (workoutSnapshot.created === undefined || workoutSnapshot.created === null) {
                    workoutSnapshot.created = createdMs;
                } else {
                    const normalizedCreated = toMillisSafe(workoutSnapshot.created);
                    workoutSnapshot.created = normalizedCreated ?? createdMs;
                }

                if (workoutSnapshot.privacyMode === undefined || workoutSnapshot.privacyMode === null) {
                    workoutSnapshot.privacyMode = "global";
                }

                const caption = (() => {
                    if (typeof workoutSnapshot?.name === "string" && workoutSnapshot.name.trim()) {
                        return workoutSnapshot.name.trim();
                    }
                    if (typeof workoutSnapshot?.templateName === "string" && workoutSnapshot.templateName.trim()) {
                        return workoutSnapshot.templateName.trim();
                    }
                    if (typeof workoutSnapshot?.template?.name === "string" && workoutSnapshot.template.name.trim()) {
                        return workoutSnapshot.template.name.trim();
                    }
                    return "";
                })();

                const comments = caption
                    ? [
                        {
                            content: caption,
                            handle,
                            isCaption: true,
                            pfp: avatar,
                            timestamp: createdMs,
                            uid,
                        },
                    ]
                    : [];

                const postRef = postsCollection.doc();
                const pid = postRef.id;
                const rawWorkoutKey = workoutIdentityKey(workout);
                const snapshotWorkoutKey = workoutIdentityKey(workoutSnapshot);
                if (rawWorkoutKey) {
                    postIdByWorkoutKey.set(rawWorkoutKey, pid);
                }
                if (snapshotWorkoutKey) {
                    postIdByWorkoutKey.set(snapshotWorkoutKey, pid);
                }

                workoutSnapshot.postPid = pid;
                if (!workoutSnapshot.pid) {
                    workoutSnapshot.pid = pid;
                }

                const postPayload = {
                    pid,
                    uid,
                    handle,
                    pfp: avatar,
                    created: createdMs,
                    caption,
                    workout: workoutSnapshot,
                    media,
                    likes: [],
                    comments,
                    tagged: [],
                    tags: [],
                    likeCount: 0,
                    commentCount: comments.length,
                    shareCount: 0,
                    autoGenerated: true,
                };

                if (workoutSnapshot?.wid || workoutSnapshot?.id) {
                    postPayload.workoutWid = String(workoutSnapshot?.wid ?? workoutSnapshot?.id);
                }

                batch.set(postRef, postPayload);
                postIds.push(pid);
            });

            if (!postIds.length) return;

            await batch.commit();

            if (postIdByWorkoutKey.size > 0) {
                const userRefLink = adminDb.doc(`users/${uid}`);
                const linkedAt = Date.now();
                try {
                    await adminDb.runTransaction(async (txn) => {
                        const snap = await txn.get(userRefLink);
                        if (!snap.exists) return;
                        const workoutsArr = Array.isArray(snap.get("completedWorkouts"))
                            ? snap.get("completedWorkouts")
                            : [];
                        let changed = false;
                        const updatedArr = workoutsArr.map((entry) => {
                            const key = workoutIdentityKey(entry);
                            if (!key) return entry;
                            const pid = postIdByWorkoutKey.get(key);
                            if (!pid) return entry;
                            if (entry?.postPid === pid) return entry;
                            changed = true;
                            const patched = {
                                ...entry,
                                postPid: pid,
                                postPidLinkedAt: linkedAt,
                            };
                            if (patched.pid !== pid) {
                                patched.pid = pid;
                            }
                            return patched;
                        });
                        if (changed) {
                            txn.update(userRefLink, { completedWorkouts: updatedArr });
                        }
                    });
                } catch (error) {
                    logger.warn("onCompletedWorkoutAutoPost: failed to attach postPid to completedWorkouts", {
                        uid,
                        error,
                    });
                }
            }

            const userRef = adminDb.doc(`users/${uid}`);
            try {
                await userRef.set(
                    {
                        posts: FieldValue.arrayUnion(...postIds),
                        postCount: FieldValue.increment(postIds.length),
                    },
                    { merge: true }
                );
            } catch (error) {
                logger.warn("onCompletedWorkoutAutoPost: failed to update user posts array", {
                    uid,
                    error,
                });
            }

            try {
                await adminDb.doc("global/posts").set(
                    {
                        PIDs: FieldValue.arrayUnion(...postIds),
                    },
                    { merge: true }
                );
            } catch (error) {
                logger.warn("onCompletedWorkoutAutoPost: failed to append to global posts", {
                    error,
                });
            }

            logger.info("onCompletedWorkoutAutoPost: created posts", {
                uid,
                count: postIds.length,
            });
        } catch (error) {
            logger.error("onCompletedWorkoutAutoPost: unexpected error", { uid, error });
        }
    }
);

// ---------------- Chat: Push Notifications on New Messages ---------------- //

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

export const onChatMessageCreated = onDocumentCreated(
    "messages/{cid}/content/{mid}",
    async (event) => {
        try {
            const snap = event.data;
            if (!snap) return;
            const message = snap.data();
            const { params } = event;
            const cid = params?.cid;
            if (!cid || !message) return;

            const senderUid =
                message?.sender?.uid || message?.senderUid || message?.uid || null;
            if (!senderUid) return;

            // Load parent chat to find all participants
            const chatDoc = await adminDb.doc(`messages/${cid}`).get();
            if (!chatDoc.exists) return;
            const chat = chatDoc.data() || {};
            const memberUids = Array.isArray(chat?.memberUids)
                ? chat.memberUids
                : (Array.isArray(chat?.users) ? chat.users.map((u) => u?.uid).filter(Boolean) : []);
            const isGroup = !!(chat?.isGroup || (memberUids?.length > 2));

            const recipients = (memberUids || []).filter((uid) => uid && uid !== senderUid);
            if (!recipients.length) return;

            // Fetch recipient push tokens and preferences
            const userDocs = await Promise.all(
                recipients.map((uid) => adminDb.doc(`users/${uid}`).get().catch(() => null))
            );
            const targets = [];
            userDocs.forEach((d, i) => {
                try {
                    if (!d || !d.exists) return;
                    const data = d.data() || {};
                    const wantsPush = data?.settings?.push !== false;
                    const token = (data?.expoPushToken || "").trim();
                    if (wantsPush && token && token.startsWith("ExponentPushToken")) {
                        targets.push({
                            uid: recipients[i],
                            token,
                        });
                    }
                } catch { }
            });

            // Build notification payload
            const senderName = message?.sender?.name || message?.sender?.handle || "Someone";
            const hasMedia = Array.isArray(message?.media) && message.media.length > 0;
            const bodyText = (message?.text || "").trim();
            const preview = bodyText
                ? bodyText.slice(0, 120)
                : (hasMedia ? "Sent a photo/video" : "Sent a message");
            const title = isGroup ? `${senderName} in chat` : `${senderName}`;

            // Send via Expo Push API in chunks
            const messages = targets.map((t) => ({
                to: t.token,
                sound: "default",
                title,
                body: preview,
                data: { type: "chat", cid, senderUid },
                priority: "high",
            }));

            for (const grp of chunk(messages, 90)) {
                try {
                    await fetch("https://exp.host/--/api/v2/push/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Accept: "application/json" },
                        body: JSON.stringify(grp),
                    });
                } catch (e) {
                    logger.error("Expo push send error", e);
                }
            }

            // Increment simple unread aggregate for recipients
            await Promise.all(
                recipients.map((uid) =>
                    adminDb.doc(`users/${uid}`).set({ unreadMessagesCount: FieldValue.increment(1) }, { merge: true })
                        .catch(() => { })
                )
            );
        } catch (err) {
            logger.error("onChatMessageCreated error", err);
        }
    }
);

// ---------------- Workouts: Append Per-Set History ---------------- //

function toDayKey(input) {
    try {
        const d = input instanceof Date ? input : new Date(Number(input) || Date.now());
        d.setHours(0, 0, 0, 0);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } catch {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
}

export const appendWorkoutSets = onCall({ region: "us-central1" }, async (request) => {
    const authUid = request?.auth?.uid || null;
    if (!authUid) throw new HttpsError("unauthenticated", "Must be signed in.");

    const { wid, created, exercises } = request.data || {};
    if (!wid || !Array.isArray(exercises)) {
        throw new HttpsError("invalid-argument", "Missing 'wid' or 'exercises' array.");
    }

    const day = toDayKey(created);
    const ref = adminDb.doc(`users/${authUid}`);

    // Build a single update payload with dotted paths + arrayUnion for each exercise
    const updatePayload = {};

    exercises.forEach((ex) => {
        try {
            const name = String(ex?.name || "").trim();
            if (!name) return;
            const sets = Array.isArray(ex?.sets) ? ex.sets : [];
            const clean = sets
                .map((s) => ({ reps: Number(s?.reps) || 0, weight: Number(s?.weight) || 0 }))
                .filter((s) => s.reps > 0 && s.weight > 0)
                .map((s) => ({ ...s, date: day, wid: String(wid) }));
            if (!clean.length) return;

            // Use arrayUnion to append without overwriting other fields; create nested map if absent
            updatePayload[`statsExercises.${name}.sets`] = FieldValue.arrayUnion(...clean);
        } catch { }
    });

    // If nothing to append, short-circuit
    if (Object.keys(updatePayload).length === 0) return { ok: true, appended: 0 };

    // Apply update with field transforms
    await ref.update(updatePayload);

    // Optionally recompute hex using updated stats (best-effort)
    try {
        const snap = await ref.get();
        if (snap.exists) {
            const zeroHex = {
                shoulders: 0,
                chest: 0,
                arms: 0,
                legs: 0,
                back: 0,
                abs: 0,
                overall: 0,
            };
            await ref.set({ statsHexagon: zeroHex }, { merge: true });
        }
    } catch (e) {
        logger.warn("appendWorkoutSets: hexagon recompute skipped", e?.message || e);
    }

    return { ok: true, appended: Object.keys(patch.statsExercises).length };
});
