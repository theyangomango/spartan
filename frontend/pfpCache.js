// pfpCache.js (JS)
import FastImage from "react-native-fast-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "../firebase.config"; // ← adjust path

// In-memory cache and in-flight request de-dupe
const mem = new Map();            // key -> uri
const pending = new Map();        // key -> Promise<string>
const STORE_KEY = "pfpCache.v1";

let hydrated = false;
async function hydrate() {
    if (hydrated) return;
    hydrated = true;
    try {
        const raw = await AsyncStorage.getItem(STORE_KEY);
        if (raw) {
            const obj = JSON.parse(raw);
            Object.keys(obj).forEach(k => mem.set(k, obj[k]));
        }
    } catch (e) {
        // ignore
    }
}

let saveTimer = null;
function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        try {
            const obj = {};
            mem.forEach((v, k) => { obj[k] = v; });
            await AsyncStorage.setItem(STORE_KEY, JSON.stringify(obj));
        } catch (e) {
            // ignore
        }
    }, 300);
}

export async function getPfpUrl(uid, version = 0) {
    await hydrate();
    const key = `${uid}@${version}`;

    const cached = mem.get(key);
    if (cached) return cached;

    const inflight = pending.get(key);
    if (inflight) return inflight;

    const p = (async () => {
        try {
            const base = await getDownloadURL(ref(storage, `pfps/${uid}.png`));
            const url = base.includes("?") ? `${base}&v=${version}` : `${base}?v=${version}`;
            mem.set(key, url);
            scheduleSave();
            return url;
        } finally {
            pending.delete(key);
        }
    })();

    pending.set(key, p);
    return p;
}

export async function preloadPfps(list) {
    // list: [{ uid, version? }]
    await hydrate();
    const sources = [];
    for (const item of list) {
        const version = item.version != null ? item.version : 0;
        try {
            const uri = await getPfpUrl(item.uid, version);
            sources.push({
                uri,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable,
            });
        } catch (e) {
            // skip broken ones
        }
    }
    if (sources.length) FastImage.preload(sources);
}

// Optional helper if you ever need to wipe persisted map
export async function clearPfpCache() {
    mem.clear();
    pending.clear();
    await AsyncStorage.removeItem(STORE_KEY);
}
