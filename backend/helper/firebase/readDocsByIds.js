import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '../../../firebase.config';

// Fetch up to 10 docs per request using an `in` query. Preserves order of `ids`.
export default async function readDocsByIds(col, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];

  const chunks = [];
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

  const map = new Map();
  await Promise.all(
    chunks.map(async (group) => {
      const q = query(collection(db, col), where(documentId(), 'in', group));
      const snap = await getDocs(q);
      snap.forEach((docSnap) => map.set(docSnap.id, docSnap.data()));
    })
  );

  return ids.map((id) => map.get(id)).filter(Boolean);
}

