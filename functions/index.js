// functions/index.js
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";       // ✅

setGlobalOptions({
    region: "us-central1",
    vpcConnector: "projects/spartan-8a55f/locations/us-central1/connectors/serverless-conn",
    vpcConnectorEgressSettings: "ALL_TRAFFIC",
});



// Store secrets in Google Secret Manager via the CLI (shown below)
const FATSECRET_KEY = defineSecret("FATSECRET_KEY");
const FATSECRET_SECRET = defineSecret("FATSECRET_SECRET");

// Simple in-memory token cache (per function instance)
let tokenCache = {
    accessToken: null,
    expiresAt: 0, // epoch ms
};

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
        }),
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
        const message =
            json?.error?.message || `FatSecret request failed: ${resp.status}`;
        throw new HttpsError("internal", message);
    }

    return json;
}

// Whitelist only the FatSecret methods you actually need.
// Add more as required (e.g., "food.get", "recipes.search", etc.).
const ALLOWED_METHODS = new Set(["foods.search"]);

/**
 * Callable: fatsecretMethod
 * Use for any allowed FatSecret method by name.
 * Expects: { method: string, params?: Record<string, any> }
 */
export const fatsecretMethod = onCall(
    {
        region: "us-central1",
        secrets: [FATSECRET_KEY, FATSECRET_SECRET],
    },
    async (request) => {
        // Optional: require signed-in users
        // if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");

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

/**
 * Callable: fatsecretSearchFood
 * Convenience wrapper for foods.search
 * Expects: { query: string, max_results?: number, page_number?: number }
 */
export const fatsecretSearchFood = onCall(
    {
        region: "us-central1",
        secrets: [FATSECRET_KEY, FATSECRET_SECRET],
    },
    async (request) => {
        // Optional: require signed-in users
        // if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");

        const { query, max_results = 10, page_number = 0 } = request.data || {};
        if (!query || typeof query !== "string") {
            throw new HttpsError("invalid-argument", "Missing 'query' string.");
        }

        // keep things sane
        const safeMax = Math.min(Math.max(Number(max_results) || 10, 1), 50);
        const safePage = Math.max(Number(page_number) || 0, 0);

        return await fatSecretRequest("foods.search", {
            search_expression: query,
            max_results: safeMax,
            page_number: safePage,
        });
    }
);
