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

// Simple in-memory cache per function instance
let tokenCache = { accessToken: null, expiresAt: 0 };

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && now < tokenCache.expiresAt - 60_000) {
    return tokenCache.accessToken;
  }

  const client_id = FATSECRET_KEY.value();
  const client_secret = FATSECRET_SECRET.value();

  const resp = await fetch("https://oauth.fatsecret.com/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "basic",
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

  tokenCache.accessToken = data.access_token;
  tokenCache.expiresAt = now + data.expires_in * 1000;
  return tokenCache.accessToken;
}

async function fatSecretRequest(methodName, params = {}) {
  const token = await getAccessToken();
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
    return await fatSecretRequest(method, params || {});
  }
);

export const fatsecretSearchFood = onCall(
  { region: "us-central1", secrets: [FATSECRET_KEY, FATSECRET_SECRET] },
  async (request) => {
    const { query, max_results = 10, page_number = 0 } = request.data || {};
    if (!query || typeof query !== "string") {
      throw new HttpsError("invalid-argument", "Missing 'query' string.");
    }
    const safeMax = Math.min(Math.max(Number(max_results) || 10, 1), 50);
    const safePage = Math.max(Number(page_number) || 0, 0);
    return await fatSecretRequest("foods.search", {
      search_expression: query,
      max_results: safeMax,
      page_number: safePage,
    });
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
