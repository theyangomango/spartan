import { db } from '../../firebase.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const normalize = (value) => String(value || '').trim();
const FAVORITES_CACHE_PREFIX = 'favoriteFoods:v1:';
const memoryFavoritesByUid = new Map();
const MAX_FAVORITES = 500;

export const makeFoodFavoriteKey = ({ foodId, name, brand } = {}) => {
  const id = normalize(foodId);
  if (id) return id;
  const n = normalize(name).toLowerCase();
  const b = normalize(brand).toLowerCase();
  if (!n && !b) return '';
  return `${n}|${b}`;
};

const toDocId = (key) => encodeURIComponent(String(key || ''));
const cacheKeyForUid = (uid) => `${FAVORITES_CACHE_PREFIX}${String(uid || '').trim()}`;

const toMillis = (value) => {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value?.toMillis === 'function') {
    try {
      return value.toMillis();
    } catch {
      return 0;
    }
  }
  if (typeof value === 'object') {
    const sec = Number(value.seconds ?? value._seconds);
    if (Number.isFinite(sec)) {
      const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
      const extra = Number.isFinite(nanos) ? Math.floor(nanos / 1e6) : 0;
      return sec * 1000 + extra;
    }
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeFavoriteItem = (item = {}) => {
  const payload = item && typeof item === 'object' ? item : {};
  const key = normalize(payload.key || makeFoodFavoriteKey(payload));
  if (!key) return null;
  const foodId = normalize(payload.foodId ?? payload.food_id);
  const name = normalize(payload.name ?? payload.food_name);
  const brand = normalize(payload.brand ?? payload.brand_name);
  const description = normalize(payload.description ?? payload.food_description ?? payload.desc);
  const favoritedAtMs = toMillis(payload.favoritedAtMs ?? payload.favoritedAt ?? payload.updatedAt) || Date.now();
  return {
    key,
    id: toDocId(key),
    foodId,
    name,
    brand,
    description,
    favoritedAtMs,
  };
};

const sortFavorites = (items = []) =>
  [...items].sort((a, b) => (Number(b?.favoritedAtMs) || 0) - (Number(a?.favoritedAtMs) || 0));

const dedupeFavorites = (items = []) => {
  const map = new Map();
  items.forEach((item) => {
    const normalizedItem = normalizeFavoriteItem(item);
    if (!normalizedItem) return;
    const existing = map.get(normalizedItem.key);
    if (!existing || normalizedItem.favoritedAtMs >= existing.favoritedAtMs) {
      map.set(normalizedItem.key, normalizedItem);
    }
  });
  return sortFavorites(Array.from(map.values())).slice(0, MAX_FAVORITES);
};

async function readFavoritesCache(uid) {
  const safeUid = String(uid || '').trim();
  if (!safeUid) return [];
  if (memoryFavoritesByUid.has(safeUid)) {
    return memoryFavoritesByUid.get(safeUid) || [];
  }
  try {
    const raw = await AsyncStorage.getItem(cacheKeyForUid(safeUid));
    const parsed = raw ? JSON.parse(raw) : [];
    const normalizedList = dedupeFavorites(Array.isArray(parsed) ? parsed : []);
    memoryFavoritesByUid.set(safeUid, normalizedList);
    return normalizedList;
  } catch {
    memoryFavoritesByUid.set(safeUid, []);
    return [];
  }
}

export function getCachedFavoriteStatus(uid, key) {
  const safeUid = String(uid || '').trim();
  const normalizedKey = String(key || '').trim();
  if (!safeUid || !normalizedKey) return null;
  const cached = memoryFavoritesByUid.get(safeUid);
  if (!Array.isArray(cached)) return null;
  return cached.some((item) => item?.key === normalizedKey);
}

async function writeFavoritesCache(uid, items = []) {
  const safeUid = String(uid || '').trim();
  if (!safeUid) return [];
  const normalizedList = dedupeFavorites(items);
  memoryFavoritesByUid.set(safeUid, normalizedList);
  try {
    await AsyncStorage.setItem(cacheKeyForUid(safeUid), JSON.stringify(normalizedList));
  } catch {
    // best-effort local cache write
  }
  return normalizedList;
}

async function fetchFavoriteFoodsRemote(uid, max = 200) {
  const safeUid = String(uid || '').trim();
  if (!safeUid) return [];
  try {
    const favoritesRef = collection(db, 'usersPrivate', safeUid, 'favoriteFoods');
    const qy = query(
      favoritesRef,
      orderBy('favoritedAt', 'desc'),
      limit(Math.max(1, Math.min(MAX_FAVORITES, Number(max) || 200)))
    );
    const snap = await getDocs(qy);
    return dedupeFavorites(snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) })));
  } catch {
    return null;
  }
}

export async function syncFavoriteFoodsFromBackend(uid, max = 200) {
  const safeUid = String(uid || '').trim();
  if (!safeUid) return [];
  const remoteItems = await fetchFavoriteFoodsRemote(safeUid, max);
  if (!Array.isArray(remoteItems)) {
    const cached = await readFavoritesCache(safeUid);
    return cached.slice(0, Math.max(1, Math.min(MAX_FAVORITES, Number(max) || 200)));
  }
  const cachedItems = await writeFavoritesCache(safeUid, remoteItems);
  return cachedItems.slice(0, Math.max(1, Math.min(MAX_FAVORITES, Number(max) || 200)));
}

export async function fetchFavoriteFoods(uid, max = 200, { preferCache = true, refreshRemote = true } = {}) {
  const safeUid = String(uid || '').trim();
  if (!safeUid) return [];

  const boundedMax = Math.max(1, Math.min(MAX_FAVORITES, Number(max) || 200));
  const cachedItems = await readFavoritesCache(safeUid);

  if (preferCache && cachedItems.length > 0) {
    if (refreshRemote) {
      void syncFavoriteFoodsFromBackend(safeUid, boundedMax);
    }
    return cachedItems.slice(0, boundedMax);
  }

  const remoteItems = await fetchFavoriteFoodsRemote(safeUid, boundedMax);
  if (Array.isArray(remoteItems)) {
    const persisted = await writeFavoritesCache(safeUid, remoteItems);
    return persisted.slice(0, boundedMax);
  }

  return cachedItems.slice(0, boundedMax);
}

export async function upsertFavoriteFood(uid, { foodId, name, brand, description } = {}) {
  if (!uid) return null;
  const key = makeFoodFavoriteKey({ foodId, name, brand });
  if (!key) return null;
  const docId = toDocId(key);

  try {
    const ref = doc(db, 'usersPrivate', uid, 'favoriteFoods', docId);
    await setDoc(
      ref,
      {
        key,
        foodId: normalize(foodId),
        name: normalize(name),
        brand: normalize(brand),
        description: normalize(description),
        favoritedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    const cachedItems = await readFavoritesCache(uid);
    const persisted = await writeFavoritesCache(uid, [
      {
        key,
        foodId: normalize(foodId),
        name: normalize(name),
        brand: normalize(brand),
        description: normalize(description),
        favoritedAtMs: Date.now(),
      },
      ...cachedItems,
    ]);
    const next = persisted.find((item) => item.key === key) || null;
    if (next) return next;
    return { id: docId, key };
  } catch {
    return null;
  }
}

export async function removeFavoriteFood(uid, key) {
  if (!uid) return;
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return;
  const ref = doc(db, 'usersPrivate', uid, 'favoriteFoods', toDocId(normalizedKey));
  try {
    await deleteDoc(ref);
    const cachedItems = await readFavoritesCache(uid);
    const filtered = cachedItems.filter((item) => item?.key !== normalizedKey);
    await writeFavoritesCache(uid, filtered);
  } catch {
    // best-effort
  }
}

export async function isFavoriteFood(uid, key) {
  if (!uid) return false;
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return false;
  const cachedItems = await readFavoritesCache(uid);
  if (cachedItems.some((item) => item?.key === normalizedKey)) {
    return true;
  }

  // Avoid network roundtrips when we already have a populated local cache.
  if (cachedItems.length > 0) {
    return false;
  }

  const remoteItems = await syncFavoriteFoodsFromBackend(uid, 200);
  return remoteItems.some((item) => item?.key === normalizedKey);
}
