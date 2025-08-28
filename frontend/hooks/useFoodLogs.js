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
        const m = data.macros
            ? {
                calories: Number(data.macros.calories) || 0,
                protein: Number(data.macros.protein) || 0,
                carbs: Number(data.macros.carbs) || 0,
                fat: Number(data.macros.fat) || 0,
            }
            : parseMacrosFromDescription(data.description || data.desc || '', qty);

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

export function useFoodLogs(dateObj, userIdOverride) {
    const [meals, setMeals] = useState(emptyBuckets());
    const [totals, setTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

    // in-memory cache: Map<dayKey, { meals, totals }>
    const cacheRef = useRef(new Map());
    const unsubRef = useRef(null);

    useEffect(() => {
        const userId = userIdOverride ?? global?.userData?.id ?? global?.userData?.uid;
        if (!userId) return;

        const dk = toDayKey(dateObj);

        // show cached immediately if present
        const cached = cacheRef.current.get(dk);
        if (cached) {
            setMeals(cached.meals);
            setTotals(cached.totals);
        } else {
            // clear view while loading (prevents showing previous day)
            setMeals(emptyBuckets());
            setTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
        }

        // realtime subscribe for focused day
        if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
        }

        const dayRef = doc(db, 'users', userId, 'foodLogs', dk);
        setDoc(dayRef, { dayKey: dk, updatedAt: serverTimestamp() }, { merge: true }).catch(() => { });
        const qy = query(collection(dayRef, 'entries'), orderBy('createdAt', 'asc'));

        unsubRef.current = onSnapshot(
            qy,
            (snap) => {
                const built = buildFromSnap(snap);
                setMeals(built.meals);
                setTotals(built.totals);
                cacheRef.current.set(dk, built);
            },
            () => { }
        );

        // preload neighbors
        preloadNeighbors(userId, dateObj, cacheRef);

        return () => {
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, [dateObj, userIdOverride]);

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

        // Persist in the background
        (async () => {
            try {
                await setDoc(dayRef, { dayKey: dk, updatedAt: serverTimestamp() }, { merge: true });
                await setDoc(entryRef, payload);

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

        // Persist deletion
        const ref = doc(db, 'users', userId, 'foodLogs', dk, 'entries', entry.key);
        await deleteDoc(ref);
    };

    return { meals, totals, addFood, deleteFood };
}

async function preloadNeighbors(userId, centerDate, cacheRef) {
    const days = [-1, +1];
    await Promise.all(
        days.map(async (delta) => {
            const d = new Date(centerDate);
            d.setDate(d.getDate() + delta);
            const dk = toDayKey(d);
            if (cacheRef.current.get(dk)) return;
            try {
                const dayRef = doc(db, 'users', userId, 'foodLogs', dk);
                const qy = query(collection(dayRef, 'entries'), orderBy('createdAt', 'asc'));
                const snap = await getDocs(qy);
                const built = buildFromSnap(snap);
                cacheRef.current.set(dk, built);
            } catch {
                /* ignore */
            }
        })
    );
}