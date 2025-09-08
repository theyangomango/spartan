// hooks/useHeaderSearchUsers.js
import { useCallback, useEffect, useRef } from "react";
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../../firebase.config";

/**
 * Header search users data source shared by Feed and Workout screens.
 * - Subscribes to global/users for baseline suggestions
 * - Provides mergeUsersIntoRef for adding seeds (from posts, etc.)
 * - Optionally hydrates following and a small prefetch window
 */
export default function useHeaderSearchUsers({ following = [], enablePrefetch = true } = {}) {
  const allUsersRef = useRef([]);

  // Merge utility exposed to screens for seeding from local data
  const mergeUsersIntoRef = useCallback((arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return;
    const map = new Map((allUsersRef.current || []).map((u) => [u.uid, u]));
    for (const u of arr) {
      if (!u?.uid) continue;
      const cur = map.get(u.uid) || {};
      map.set(u.uid, {
        uid: String(u.uid),
        handle: u.handle ?? cur.handle ?? "",
        name: u.name ?? cur.name ?? "",
        pfp: u.pfp ?? cur.pfp ?? "",
      });
    }
    allUsersRef.current = Array.from(map.values());
  }, []);

  // Live baseline list from global/users
  useEffect(() => {
    const ref = doc(db, "global", "users");
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() || {};
      const arr = Array.isArray(data?.all) ? data.all : [];
      const mapped = arr
        .map((u) => ({
          uid: String(u?.uid || u?.id || ""),
          handle: u?.handle || "",
          name: u?.name || "",
          pfp: u?.pfp || u?.photoURL || u?.image || "",
        }))
        .filter((u) => !!u.uid);
      allUsersRef.current = mapped;
    });
    return () => unsub();
  }, []);

  // Fetch missing following user docs to enrich suggestions
  useEffect(() => {
    const run = async () => {
      const list = Array.isArray(following) ? following : [];
      // Normalize to array of uid strings
      const uids = list.map((x) => (typeof x === 'string' ? x : x?.uid)).filter(Boolean);
      if (!uids.length) return;
      const existing = new Set((allUsersRef.current || []).map((u) => String(u.uid)));
      const missing = uids.filter((id) => id && !existing.has(String(id)));
      if (missing.length === 0) return;
      const usersCol = collection(db, "users");
      const chunks = [];
      for (let i = 0; i < missing.length; i += 10) chunks.push(missing.slice(i, i + 10));
      const fetched = [];
      await Promise.all(
        chunks.map(async (ids) => {
          const q = query(usersCol, where("__name__", "in", ids));
          const snap = await getDocs(q);
          snap.forEach((d) => {
            const data = d.data();
            fetched.push({
              uid: d.id,
              handle: data?.handle ?? "",
              name: data?.name ?? "",
              pfp: data?.pfp ?? "",
            });
          });
        })
      );
      mergeUsersIntoRef(fetched);
    };
    run().catch(() => {});
  }, [mergeUsersIntoRef, JSON.stringify(following)]);

  // Small alphabetical prefetch for fast-first-search in empty states
  useEffect(() => {
    if (!enablePrefetch) return;
    if ((allUsersRef.current?.length || 0) > 25) return;
    const prefetch = async () => {
      const usersCol = collection(db, "users");
      const q = query(usersCol, orderBy("handle_lower"), limit(100));
      const snap = await getDocs(q);
      const arr = [];
      snap.forEach((d) => {
        const data = d.data();
        arr.push({ uid: d.id, handle: data?.handle ?? "", name: data?.name ?? "", pfp: data?.pfp ?? "" });
      });
      mergeUsersIntoRef(arr);
    };
    prefetch().catch(() => {});
  }, [mergeUsersIntoRef, enablePrefetch]);

  return { allUsersRef, mergeUsersIntoRef };
}
