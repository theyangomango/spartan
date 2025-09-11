import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { computeHexagonFromStats } from "./computeHexagon.js";

setGlobalOptions({
  region: "us-central1",
  vpcConnector: "projects/spartan-8a55f/locations/us-central1/connectors/serverless-conn",
  vpcConnectorEgressSettings: "ALL_TRAFFIC",
});

// Initialize Admin SDK once per instance
try { initializeApp(); } catch {}
const adminDb = getFirestore();

// Secrets must be configured via Firebase/Google Secret Manager
const FATSECRET_KEY = defineSecret("FATSECRET_KEY");
const FATSECRET_SECRET = defineSecret("FATSECRET_SECRET");

// Simple in-memory cache per scope per function instance
const tokenCacheByScope = new Map(); // scope -> { accessToken, expiresAt }

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
    } catch {}

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

    // A more lenient search strategy:
    // - generate multiple query variants (normalized, token-sorted, per-token)
    // - call foods.search with these variants (limited pages/calls)
    // - merge + de-duplicate results by food_id
    // - score via token overlap + 3-gram Jaccard and return best matches

    // -------------- helpers -------------- //
    const normalize = (s) =>
      String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // strip diacritics
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const toTokens = (s) => normalize(s).split(" ").filter(Boolean);

    const charNGrams = (s, n = 3) => {
      const str = normalize(s).replace(/\s+/g, "");
      const grams = new Set();
      if (!str) return grams;
      for (let i = 0; i <= Math.max(0, str.length - n); i++) {
        grams.add(str.slice(i, i + n));
      }
      // if string shorter than n, add whole string as a gram
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
      const a = new Set(aTokens);
      const b = new Set(bTokens);
      let inter = 0;
      for (const t of a) if (b.has(t)) inter++;
      return (2 * inter) / (a.size + b.size);
    };

    const similarityScore = (queryStr, candidateStr) => {
      const qTokens = toTokens(queryStr);
      const cTokens = toTokens(candidateStr);
      const tokenScore = tokenOverlap(qTokens, cTokens); // 0..1
      const qGrams = charNGrams(queryStr);
      const cGrams = charNGrams(candidateStr);
      const gramScore = jaccard(qGrams, cGrams); // 0..1

      // small boosts
      let boost = 0;
      if (qTokens.length > 0 && cTokens.join(" ").startsWith(qTokens[0])) boost += 0.05;
      const allQueryTokensInName = qTokens.every((t) => cTokens.includes(t));
      if (allQueryTokensInName) boost += 0.1;

      // weighted combo (sum capped at 1)
      const score = 0.6 * tokenScore + 0.4 * gramScore + boost;
      return Math.max(0, Math.min(1, score));
    };

    const buildDisplayName = (food) => {
      const name = String(food?.food_name || "");
      const brand = String(food?.brand_name || "");
      return brand ? `${name} ${brand}` : name;
    };

    // -------------- query generation -------------- //
    const qRaw = String(query || "");
    const qNorm = normalize(qRaw);
    const qTokens = toTokens(qRaw);

    const candidates = new Set();
    if (qRaw.trim()) candidates.add(qRaw.trim());
    if (qNorm && qNorm !== qRaw.trim()) candidates.add(qNorm);
    if (qTokens.length > 1) {
      const sorted = [...qTokens].sort().join(" ");
      if (sorted && sorted !== qNorm) candidates.add(sorted);
    }
    // add individual tokens (length >= 3) to broaden recall
    const STOP = new Set([
      "the","and","for","with","without","of","to","in","on","a","an","per",
      // very generic units (avoid exploding results)
      "cup","cups","tbsp","tsp","tablespoon","tablespoons","teaspoon","teaspoons",
      "oz","ml","l","g","kg","gram","grams","milliliter","milliliters","liter","liters",
    ]);
    for (const t0 of qTokens) {
      const t = t0.toLowerCase();
      if (STOP.has(t)) continue;
      if (t.length >= 3) candidates.add(t);
      // add prefixes to help with misspellings (e.g., 'chikn' -> 'chi')
      if (t.length >= 4) candidates.add(t.slice(0, 3));
      if (t.length >= 5) candidates.add(t.slice(0, 4));
    }

    // -------------- fetch + merge -------------- //
    const MAX_PAGES_PER_EXPR = 2;
    const RESULTS_PER_PAGE = Math.min(50, Math.max(safeMax, 20));
    const MAX_TOTAL_CALLS = 8;

    const byId = new Map(); // id -> { item, bestScore }
    let calls = 0;

    for (const expr of candidates) {
      if (calls >= MAX_TOTAL_CALLS) break;

      for (let page = 0; page < MAX_PAGES_PER_EXPR; page++) {
        if (calls >= MAX_TOTAL_CALLS) break;
        calls++;
        try {
          const res = await fatSecretRequest("foods.search", {
            search_expression: expr,
            max_results: RESULTS_PER_PAGE,
            page_number: page,
          }, "basic");
          const foods = res?.foods?.food;
          if (!foods) break;
          const list = Array.isArray(foods) ? foods : [foods];
          if (!list.length) break;

          for (const item of list) {
            const fid = String(item?.food_id || "");
            if (!fid) continue;
            const display = buildDisplayName(item);
            const score = similarityScore(qRaw, display);
            const prev = byId.get(fid);
            if (!prev || score > prev.bestScore) {
              byId.set(fid, { item, bestScore: score });
            }
          }

          // If we already have a healthy pool, we can stop early for this expr
          if (byId.size >= safeMax * 3) break;
        } catch (e) {
          // continue with next expr/page
          logger.warn("fatsecretSearchFood: variant search failed", { expr, page, message: e?.message || e });
          break;
        }
      }

      // If we already collected enough, stop iterating variants
      if (byId.size >= safeMax * 3) break;
    }

    // Score-sort and take top N
    const ranked = Array.from(byId.values())
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, safeMax)
      .map((x) => x.item);

    // Return in FatSecret-like shape; keep minimal fields used by clients
    return {
      foods: {
        food: ranked,
        max_results: String(safeMax),
        page_number: String(safePage),
        total_results: String(byId.size),
      },
    };
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

    // 1) Resolve barcode -> food_id
    const idRes = await fatSecretRequest("food.find_id_for_barcode", { barcode: gtin }, "premier barcode");
    // Response shape can be { food_id: { value: "123" } } or { food_id: "123" }
    const rawId = idRes?.food_id;
    const foodId = rawId && typeof rawId === "object" ? (rawId.value ?? rawId.food_id ?? rawId.id) : rawId;
    const fid = String(foodId || "").trim();
    if (!fid) {
      throw new HttpsError("not-found", "No food found for this barcode");
    }

    // 2) Fetch full food details
    const foodRes = await fatSecretRequest("food.get.v2", { food_id: fid }, "basic");
    const food = foodRes?.food || {};

    // 3) Ensure a FatSecret-like food_description exists (used by client to parse macros)
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
    } catch {}

    return { food };
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
        } catch {}
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
            .catch(() => {})
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
    } catch {}
  });

  // If nothing to append, short-circuit
  if (Object.keys(updatePayload).length === 0) return { ok: true, appended: 0 };

  // Apply update with field transforms
  await ref.update(updatePayload);

  // Optionally recompute hex using updated stats (best-effort)
  try {
    const snap = await ref.get();
    if (snap.exists) {
      const data = snap.data() || {};
      const prevHex = data?.statsHexagon || {};
      const trained = Object.keys(updatePayload).map((k)=>k.split(".")[1]).filter(Boolean);
      const { statsHexagon } = computeHexagonFromStats({
        statsExercises: data?.statsExercises || {},
        prevStatsHexagon: prevHex,
        trainedExerciseNames: trained,
      });
      await ref.set({ statsHexagon }, { merge: true });
    }
  } catch (e) {
    logger.warn("appendWorkoutSets: hexagon recompute skipped", e?.message || e);
  }

  return { ok: true, appended: Object.keys(patch.statsExercises).length };
});
