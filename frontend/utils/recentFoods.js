// utils/recentFoods.js
import { db } from '../../firebase.config';
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, increment, deleteDoc } from 'firebase/firestore';

// Read most-recently used foods for a user
export async function fetchRecentFoods(uid, max = 20) {
  if (!uid) return [];
  try {
    const recentRef = collection(db, 'users', uid, 'recentFoods');
    const qy = query(recentRef, orderBy('lastUsedAt', 'desc'), limit(Math.max(1, Math.min(50, max || 20))));
    const snap = await getDocs(qy);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
  } catch {
    return [];
  }
}

// Upsert a recent food entry and bump usage count/lastUsedAt
export async function touchRecentFood(uid, { foodId, name, brand, description } = {}, extrasPS = null) {
  if (!uid) return;
  const idKey = String(foodId || name || '').trim();
  if (!idKey) return;
  try {
    const recentRef = doc(db, 'users', uid, 'recentFoods', idKey);
    await setDoc(
      recentRef,
      {
        foodId: String(foodId || ''),
        name: String(name || ''),
        brand: String(brand || ''),
        description: String(description || ''),
        usedCount: increment(1),
        lastUsedAt: serverTimestamp(),
        ...(extrasPS ? { microsPS: extrasPS, extrasPerServing: extrasPS } : {}),
      },
      { merge: true }
    );
  } catch {
    // best-effort
  }
}

// Remove a recent food entry entirely
export async function deleteRecentFood(uid, foodKey) {
  if (!uid) return;
  const idKey = String(foodKey || '').trim();
  if (!idKey) return;
  try {
    const recentRef = doc(db, 'users', uid, 'recentFoods', idKey);
    await deleteDoc(recentRef);
  } catch {
    // best-effort
  }
}
