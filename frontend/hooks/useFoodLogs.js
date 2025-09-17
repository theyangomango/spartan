// hooks/useFoodLogs.js
import { useEffect, useRef, useState } from 'react';
import {
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    setDoc,
    serverTimestamp,
    deleteDoc,
    increment,
    onSnapshot,
    updateDoc as fsUpdateDoc,
    deleteField,
} from 'firebase/firestore';
import { db } from '../../firebase.config'; // <-- adjust if needed
import { toDayKey } from '../utils/date';
import { parseMacrosFromDescription } from '../utils/nutrition';

const normalizeMealKey = (t = '') => {
    const s = String(t || '').toLowerCase();
    if (s.startsWith('break')) return 'Breakfast';
    if (s.startsWith('lunch')) return 'Lunch';
    if (s.startsWith('dinn')) return 'Dinner';
    return 'Dinner';
};

const emptyBuckets = () => ({ Breakfast: [], Lunch: [], Dinner: [] });

// Shared, module-level cache so prefetches can be reused across hook instances
// Keyed by `${userId}|${dayKey}`
const globalCache = new Map();
const inflightPrefetch = new Set(); // `${userId}|${dayKey}` currently prefetching
// Memo for parsed macros on legacy entries lacking stored macros
// Keyed by `${docId}|${desc}|${qty}`
const parseMemo = new Map();
// Create a lightweight signature to avoid redundant state updates/renders
const builtHash = (built) => {
    try {
        const t = built?.totals || {};
        const b = built?.meals?.Breakfast || [];
        const l = built?.meals?.Lunch || [];
        const d = built?.meals?.Dinner || [];
        const ids = (arr) => arr.map((x) => x.key).join(',');
        return [
            Math.round(t.calories || 0),
            Math.round(t.protein || 0),
            Math.round(t.carbs || 0),
            Math.round(t.fat || 0),
            b.length, l.length, d.length,
            ids(b), ids(l), ids(d),
        ].join('|');
    } catch { return 'x'; }
};

/**
 * Build meals/totals from a Firestore snapshot of entries.
 * - If the entry already stored `macros`, we trust those (assumed scaled).
 * - Otherwise, we parse and scale by its `quantity` (default 1).
 */
const buildFromSnap = (snap) => {
    const meals = emptyBuckets();
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    snap.forEach((d) => {
        const data = d.data() || {};
        const bucket = normalizeMealKey(data.mealType);

        const qty = typeof data.quantity === 'number' ? data.quantity : 1;
        // Use stored macros if present (they may already be scaled). Otherwise parse+scale now.
        let m;
        if (data.macros) {
            m = {
                calories: Number(data.macros.calories) || 0,
                protein: Number(data.macros.protein) || 0,
                carbs: Number(data.macros.carbs) || 0,
                fat: Number(data.macros.fat) || 0,
            };
        } else {
            const desc = data.description || data.desc || '';
            const key = `${d.id}|${desc}|${qty}`;
            const cached = parseMemo.get(key);
            if (cached) m = cached; else { m = parseMacrosFromDescription(desc, qty); parseMemo.set(key, m); }
        }

        totals.calories += m.calories || 0;
        totals.protein += m.protein || 0;
        totals.carbs += m.carbs || 0;
        totals.fat += m.fat || 0;

        meals[bucket].push({
            key: d.id,
            food_id: data.foodId || '',
            name: data.name || '',
            brand: data.brand || '',
            desc: data.description || data.desc || '',
            macros: m,       // display-ready (scaled if needed)
            quantity: qty,   // keep for badge/UX if desired
            servingId: data.servingId || null,
            servingDesc: data.servingDesc || null,
            extrasPerServing: data.extrasPerServing || null,
        });
    });

    return {
        meals,
        totals: {
            calories: Math.round(totals.calories),
            protein: Math.round(totals.protein),
            carbs: Math.round(totals.carbs),
            fat: Math.round(totals.fat),
        },
    };
};

export function useFoodLogs(dateObj, userIdOverride, shouldSubscribe = true) {
    const [meals, setMeals] = useState(emptyBuckets());
    const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

    // in-memory cache: Map<dayKey, { meals, totals }>
    const cacheRef = useRef(new Map());
    const unsubRef = useRef(null);
    const pendingFetchRef = useRef(new Set()); // track in-flight getDocs per user|day
    const currentKeyRef = useRef('');
    const lastHashRef = useRef('');

    // Track current key so async fetches avoid updating when the day changed mid-flight
    useEffect(() => {
        const dk = toDayKey(dateObj);
        currentKeyRef.current = dk;
    }, [dateObj]);

    // Lightweight sync from global cache even when not subscribing
    useEffect(() => {
        const userId = userIdOverride ?? global?.userData?.id ?? global?.userData?.uid;
        if (!userId) return;
        const dk = toDayKey(dateObj);
        const ckey = `${userId}|${dk}`;
        const cached = globalCache.get(ckey);
        if (cached) {
            setMeals(cached.meals);
            setTotals(cached.totals);
            lastHashRef.current = builtHash(cached);
        }
    }, [dateObj, userIdOverride]);

    useEffect(() => {
        if (!shouldSubscribe) return;
        const userId = userIdOverride ?? global?.userData?.id ?? global?.userData?.uid;
        if (!userId) return;

        const dk = toDayKey(dateObj);
        const ckey = `${userId}|${dk}`;

        // show cached immediately if present (prefer global cache so prefetches from other places are reused)
        const cached = globalCache.get(ckey) || cacheRef.current.get(dk);
        if (cached) {
            setMeals(cached.meals);
            setTotals(cached.totals);
            lastHashRef.current = builtHash(cached);
        } else {
            // Keep previous UI while we fetch to avoid shimmer
            // Kick off a fast one-off fetch to fill immediately, then establish the live subscription
            (async () => {
                pendingFetchRef.current.add(ckey);
                try {
                    const dayRef = doc(db, 'users', userId, 'foodLogs', dk);
                    const qy = query(collection(dayRef, 'entries'), orderBy('createdAt', 'asc'));
                    const snap = await getDocs(qy);
                    const built = buildFromSnap(snap);
                    cacheRef.current.set(dk, built);
                    globalCache.set(ckey, built);
                    // Only update if we are still viewing this dk
                    if (currentKeyRef.current === dk) {
                        const h = builtHash(built);
                        if (h !== lastHashRef.current) {
                            setMeals(built.meals);
                            setTotals(built.totals);
                            lastHashRef.current = h;
                        }
                    }
                } catch { /* ignore */ }
                finally {
                    pendingFetchRef.current.delete(ckey);
                }
            })();
        }

        // realtime subscribe for focused day
        if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
        }

        const dayRef = doc(db, 'users', userId, 'foodLogs', dk);
        const qy = query(collection(dayRef, 'entries'), orderBy('createdAt', 'asc'));

        unsubRef.current = onSnapshot(
            qy,
            (snap) => {
                const built = buildFromSnap(snap);
                const isEmpty =
                    (!built.meals?.Breakfast?.length) &&
                    (!built.meals?.Lunch?.length) &&
                    (!built.meals?.Dinner?.length);
                // If a fast fetch is pending and snapshot is empty, avoid clearing the UI to prevent flicker
                if (pendingFetchRef.current.has(ckey) && isEmpty) return;

                const h = builtHash(built);
                if (h !== lastHashRef.current) {
                    setMeals(built.meals);
                    setTotals(built.totals);
                    lastHashRef.current = h;
                }
                cacheRef.current.set(dk, built);
                globalCache.set(ckey, built);
            },
            () => { }
        );

        // preload neighbors (store to both local + global caches)
        preloadNeighborsForUser(userId, dateObj, (neighborKey, built) => {
            cacheRef.current.set(neighborKey, built);
            globalCache.set(`${userId}|${neighborKey}`, built);
        });

        return () => {
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, [dateObj, userIdOverride, shouldSubscribe]);

    /**
      * Add a food entry.
      * - Expects `food` in FatSecret shape.
      * - If `food.__portionMultiplier` is provided, we pass it to parseMacrosFromDescription
      *   so numbers are already scaled when saved & displayed.
      */
    const addFood = async (mealName, food) => {
        const userId = global?.userData?.id || global?.userData?.uid;
        if (!userId || !mealName) return;

        const dk = toDayKey(dateObj);
        const dayRef = doc(db, 'users', userId, 'foodLogs', dk);

        const factor = food?.__portionMultiplier ?? 1;

        // Parse & SCALE macros directly here (per the new utils behavior)
        const macros = parseMacrosFromDescription(food.food_description || '', factor);

        const payload = {
            mealType: String(mealName || '').toLowerCase(), // 'breakfast'|'lunch'|'dinner'
            name: food.food_name || '',
            brand: food.brand_name || '',
            foodId: String(food.food_id ?? ''),
            description: food.food_description || '',
            source: 'fatsecret',
            quantity: factor,                 // store chosen portion
            macros,                           // store scaled macros for fast reads
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // Pre-generate a doc ID so UI updates instantly
        const entryRef = doc(collection(dayRef, 'entries'));
        const newId = entryRef.id;

        // Optimistic UI entry
        const entry = {
            key: newId,
            food_id: payload.foodId,
            name: payload.name,
            brand: payload.brand,
            desc: payload.description,
            macros,          // scaled
            quantity: factor,
        };

        setMeals((prev) => ({
            ...prev,
            [mealName]: [...(prev[mealName] || []), entry],
        }));

        setTotals((prev) => ({
            calories: Math.round(prev.calories + (macros.calories || 0)),
            protein: Math.round(prev.protein + (macros.protein || 0)),
            carbs: Math.round(prev.carbs + (macros.carbs || 0)),
            fat: Math.round(prev.fat + (macros.fat || 0)),
        }));

        // Update cache immediately
        {
            const existing = cacheRef.current.get(dk) || {
                meals: emptyBuckets(),
                totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            };
            const updated = {
                meals: {
                    ...existing.meals,
                    [mealName]: [...(existing.meals[mealName] || []), entry],
                },
                totals: {
                    calories: Math.round((existing.totals.calories || 0) + (macros.calories || 0)),
                    protein: Math.round((existing.totals.protein || 0) + (macros.protein || 0)),
                    carbs: Math.round((existing.totals.carbs || 0) + (macros.carbs || 0)),
                    fat: Math.round((existing.totals.fat || 0) + (macros.fat || 0)),
                },
            };
            cacheRef.current.set(dk, updated);
        }

        // Mirror to global.userData.loggedFoods immediately (nested by dayKey) for instant UI
        try {
            const g = global || {};
            g.userData = g.userData || {};
            g.userData.loggedFoods = g.userData.loggedFoods || {};
            g.userData.loggedFoods[dk] = g.userData.loggedFoods[dk] || {};
            g.userData.loggedFoods[dk][newId] = {
                dayKey: dk,
                meal: normalizeMealKey(mealName),
                name: payload.name,
                brand: payload.brand,
                desc: payload.description,
                foodId: payload.foodId,
                quantity: factor,
                macros,
                createdAt: Date.now(),
            };
        } catch { /* non-fatal */ }

        // Persist in the background
        (async () => {
            try {
                await setDoc(dayRef, { dayKey: dk, updatedAt: serverTimestamp() }, { merge: true });
                await setDoc(entryRef, payload);

                // Also surface this entry on the user document under `loggedFoods.<entryId>`
                try {
                    const uref = doc(db, 'users', userId);
                    // Nest by dayKey so it mirrors foodLogs: loggedFoods.<dayKey>.<entryId>
                    const fieldPath = `loggedFoods.${dk}.${newId}`;
                    const flat = {
                        dayKey: dk,
                        meal: normalizeMealKey(mealName),
                        name: payload.name,
                        brand: payload.brand,
                        desc: payload.description,
                        foodId: payload.foodId,
                        quantity: factor,
                        macros, // scaled
                        createdAt: serverTimestamp(),
                    };
                    await fsUpdateDoc(uref, { [fieldPath]: flat });
                } catch { /* best-effort */ }

                // best-effort recent-foods
                try {
                    const recentRef = doc(db, 'users', userId, 'recentFoods', String(payload.foodId || payload.name));
                    await setDoc(
                        recentRef,
                        {
                            foodId: payload.foodId,
                            name: payload.name,
                            brand: payload.brand,
                            description: payload.description,
                            usedCount: increment(1),
                            lastUsedAt: serverTimestamp(),
                        },
                        { merge: true }
                    );
                } catch { }
            } catch (e) {
                // Roll back UI if persist fails
                setMeals((prev) => ({
                    ...prev,
                    [mealName]: (prev[mealName] || []).filter((x) => x.key !== newId),
                }));
                setTotals((prev) => ({
                    calories: Math.max(0, Math.round(prev.calories - (macros.calories || 0))),
                    protein: Math.max(0, Math.round(prev.protein - (macros.protein || 0))),
                    carbs: Math.max(0, Math.round(prev.carbs - (macros.carbs || 0))),
                    fat: Math.max(0, Math.round(prev.fat - (macros.fat || 0))),
                }));

                const existing = cacheRef.current.get(dk);
                if (existing) {
                    const rolled = {
                        meals: {
                            ...existing.meals,
                            [mealName]: (existing.meals[mealName] || []).filter((x) => x.key !== newId),
                        },
                        totals: {
                            calories: Math.max(0, Math.round((existing.totals.calories || 0) - (macros.calories || 0))),
                            protein: Math.max(0, Math.round((existing.totals.protein || 0) - (macros.protein || 0))),
                            carbs: Math.max(0, Math.round((existing.totals.carbs || 0) - (macros.carbs || 0))),
                            fat: Math.max(0, Math.round((existing.totals.fat || 0) - (macros.fat || 0))),
                        },
                    };
                    cacheRef.current.set(dk, rolled);
                }
            }
        })();

        // Return immediately so caller can close overlay without delay
        return entry;
    };

    const deleteFood = async (mealName, entry) => {
        const userId = global?.userData?.id || global?.userData?.uid;
        if (!userId) return;

        const dk = toDayKey(dateObj);

        // Try to get the authoritative entry (with scaled macros) from cache
        const findCachedEntry = () => {
            const existing = cacheRef.current.get(dk);
            const list = existing?.meals?.[mealName] || [];
            return list.find((x) => x.key === entry.key);
        };

        // Choose the best source of truth for macros
        let chosen = findCachedEntry() || entry;

        // Use stored (scaled) macros if present; otherwise parse + scale using quantity
        const m =
            (chosen && chosen.macros) ||
            parseMacrosFromDescription(
                chosen?.desc || entry?.desc || '',
                typeof chosen?.quantity === 'number' ? chosen.quantity : (typeof entry?.quantity === 'number' ? entry.quantity : 1)
            );

        // Optimistic UI removal
        setMeals((prev) => ({
            ...prev,
            [mealName]: (prev[mealName] || []).filter((x) => x.key !== entry.key),
        }));
        setTotals((prev) => ({
            calories: Math.max(0, Math.round(prev.calories - (m.calories || 0))),
            protein: Math.max(0, Math.round(prev.protein - (m.protein || 0))),
            carbs: Math.max(0, Math.round(prev.carbs - (m.carbs || 0))),
            fat: Math.max(0, Math.round(prev.fat - (m.fat || 0))),
        }));

        // Keep cache in sync immediately
        const existing = cacheRef.current.get(dk);
        if (existing) {
            const updated = {
                meals: {
                    ...existing.meals,
                    [mealName]: (existing.meals[mealName] || []).filter((x) => x.key !== entry.key),
                },
                totals: {
                    calories: Math.max(0, Math.round((existing.totals.calories || 0) - (m.calories || 0))),
                    protein: Math.max(0, Math.round((existing.totals.protein || 0) - (m.protein || 0))),
                    carbs: Math.max(0, Math.round((existing.totals.carbs || 0) - (m.carbs || 0))),
                    fat: Math.max(0, Math.round((existing.totals.fat || 0) - (m.fat || 0))),
                },
            };
            cacheRef.current.set(dk, updated);
        }

        // Reflect immediately in global cache as well (nested by dayKey)
        try { if (global?.userData?.loggedFoods?.[dk]) delete global.userData.loggedFoods[dk][entry.key]; } catch {}

        // Persist deletion (loggedFoods.<dayKey>.<entryId>)
        const ref = doc(db, 'users', userId, 'foodLogs', dk, 'entries', entry.key);
        await deleteDoc(ref);

        // Also remove from the user's `loggedFoods` map
        try {
            const uref = doc(db, 'users', userId);
            const fieldPath = `loggedFoods.${dk}.${entry.key}`;
            await fsUpdateDoc(uref, { [fieldPath]: deleteField() });
        } catch { /* best-effort */ }
    };

    return { meals, totals, addFood, deleteFood };
}

async function preloadNeighborsForUser(userId, centerDate, onBuilt) {
    const days = [];
    for (let i = 1; i <= 7; i += 1) { days.push(-i, +i); }
    await Promise.all(
        days.map(async (delta) => {
            try {
                const d = new Date(centerDate);
                d.setDate(d.getDate() + delta);
                d.setHours(0, 0, 0, 0);
                const dk = toDayKey(d);
                const ckey = `${userId}|${dk}`;
                if (globalCache.get(ckey) || inflightPrefetch.has(ckey)) return;
                inflightPrefetch.add(ckey);
                const dayRef = doc(db, 'users', userId, 'foodLogs', dk);
                const qy = query(collection(dayRef, 'entries'), orderBy('createdAt', 'asc'));
                const snap = await getDocs(qy);
                const built = buildFromSnap(snap);
                globalCache.set(ckey, built);
                if (typeof onBuilt === 'function') onBuilt(dk, built);
                inflightPrefetch.delete(ckey);
            } catch {
                // best-effort cleanup
                try { inflightPrefetch.delete(`${userId}|${toDayKey(new Date(centerDate))}`); } catch {}
                /* ignore */
            }
        })
    );
}

// Explicit prefetch API for screens to warm the cache ahead of opening views
export async function primeFoodLogsCache(userId, centerDate, radius = 2) {
    // Default to a broader warm radius (±7) for smoother UX
    if (radius == null) radius = 7;
    try {
        const days = [];
        for (let i = 1; i <= Math.max(1, radius); i += 1) { days.push(-i, +i); }
        const now = new Date(centerDate);
        now.setHours(0, 0, 0, 0);
        const centerKey = `${userId}|${toDayKey(now)}`;
        // also ensure center is present
        await Promise.all([
            (async () => {
                if (globalCache.get(centerKey)) return;
                if (inflightPrefetch.has(centerKey)) return;
                inflightPrefetch.add(centerKey);
                const dayRef = doc(db, 'users', userId, 'foodLogs', toDayKey(now));
                const qy = query(collection(dayRef, 'entries'), orderBy('createdAt', 'asc'));
                const snap = await getDocs(qy);
                const built = buildFromSnap(snap);
                globalCache.set(centerKey, built);
                inflightPrefetch.delete(centerKey);
            })(),
            ...days.map(async (delta) => {
                const d = new Date(now);
                d.setDate(d.getDate() + delta);
                const dk = toDayKey(d);
                const k = `${userId}|${dk}`;
                if (globalCache.get(k) || inflightPrefetch.has(k)) return;
                inflightPrefetch.add(k);
                const dayRef = doc(db, 'users', userId, 'foodLogs', dk);
                const qy = query(collection(dayRef, 'entries'), orderBy('createdAt', 'asc'));
                const snap = await getDocs(qy);
                const built = buildFromSnap(snap);
                globalCache.set(k, built);
                inflightPrefetch.delete(k);
            })
        ]);
    } catch { /* ignore */ }
}

// Read-only cache peek for pre-render (used by DayDetailsSheet transitions)
export function peekFoodLogsCache(userId, dateObj) {
    try {
        const d = new Date(dateObj);
        if (Number.isNaN(d.getTime())) return null;
        d.setHours(0, 0, 0, 0);
        const dk = toDayKey(d);
        const key = `${userId}|${dk}`;
        return globalCache.get(key) || null;
    } catch { return null; }
}
