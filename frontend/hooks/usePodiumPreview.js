// hooks/usePodiumPreview.js
import { useEffect, useMemo, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import getAllUsers from "../helper/getAllUsers";

function safeBodyweight(u) {
  return (
    u?.bodyweight ||
    u?.bodyWeight ||
    u?.weight ||
    u?.stats?.bodyweight ||
    u?.stats?.weight ||
    0
  );
}

const HEX_KEYS = new Set(["overall", "chest", "shoulders", "abs", "back", "legs", "arms"]);

function top3For(users, exercise, metric = "1RM", normalizeByBodyweight = false) {
  const exerciseKey = typeof exercise === "string" ? exercise.trim() : "";
  const normalized = exerciseKey.toLowerCase();

  if (HEX_KEYS.has(normalized)) {
    const arr = (users || []).map((u) => {
      const val = Number(u?.statsHexagon?.[normalized] ?? 0);
      return {
        uid: u?.uid,
        handle: u?.handle || "",
        image: u?.pfp || u?.image || "",
        value: Number.isFinite(val) ? val : 0,
      };
    });
    arr.sort((a, b) => (b.value || 0) - (a.value || 0));
    return arr.slice(0, 3).map((x) => ({ uid: x.uid, handle: x.handle, stat: x.value, fallbackPfp: x.image }));
  }

  const key = metric === "1RM" ? "1RM" : metric;
  const arr = (users || []).map((u) => {
    const stats = u?.statsExercises?.[exerciseKey] || {};
    const base = Number(stats?.[key] || 0);
    const bw = normalizeByBodyweight ? Math.max(1, Number(safeBodyweight(u)) || 1) : 1;
    const val = base / bw;
    return {
      uid: u?.uid,
      handle: u?.handle || "",
      image: u?.pfp || u?.image || "",
      value: Number.isFinite(val) ? val : 0,
    };
  });
  arr.sort((a, b) => (b.value || 0) - (a.value || 0));
  return arr.slice(0, 3).map((x) => ({ uid: x.uid, handle: x.handle, stat: x.value, fallbackPfp: x.image }));
}

export default function usePodiumPreview(enabled = true) {
  const [top3, setTop3] = useState([]);
  const [label, setLabel] = useState("Overall • Hex");

  const lastView = useMemo(() => (global?.userData?.competitionLastView || null), [global?.userData?.competitionLastView]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const all = await getAllUsers();
        if (cancelled) return;
        const allUsers = Array.isArray(all) ? all : [];

        // Defaults
        let scope = "global";
        let exercise = "Overall";
        let metric = "Hex";
        let normalize = false;
        let tribeId = null;
        let tribeName = null;

        if (lastView && typeof lastView === "object") {
          scope = lastView.type || scope;
          // Backward compatibility: migrate old 'followers' type to 'following'
          if (scope === "followers") scope = "following";
          if (scope === "tribe") {
            tribeId = lastView.tribeId || null;
            const cmp = lastView.comparison || {};
            exercise = cmp.exercise || exercise;
            metric = cmp.metric || metric;
            normalize = !!cmp.normalizeByBodyweight;
            if (tribeId) {
              try {
                const snap = await getDoc(doc(db, "tribes", String(tribeId)));
                if (!cancelled && snap.exists()) {
                  const d = snap.data() || {};
                  tribeName = d?.name || null;
                }
              } catch {}
            }
          } else {
            exercise = lastView.exercise || exercise;
            metric = lastView.metric || metric;
          }
        }

        // Filter user set by scope
        let pool = allUsers;
        if (scope === "following") {
          const me = String(global?.userData?.uid || "");
          const following = Array.isArray(global?.userData?.following) ? global.userData.following : [];
          const followSet = new Set([me, ...following.map((f) => String(f?.uid || f))]);
          pool = allUsers.filter((u) => followSet.has(String(u?.uid)));
        } else if (scope === "tribe" && tribeId) {
          try {
            const snap = await getDoc(doc(db, "tribes", String(tribeId)));
            const d = snap.exists() ? (snap.data() || {}) : {};
            const memberSet = new Set((d?.members || []).map(String));
            pool = allUsers.filter((u) => memberSet.has(String(u?.uid)));
            if (!tribeName) tribeName = d?.name || null;
          } catch {}
        }

        const exerciseKey = typeof exercise === "string" ? exercise.trim() : "";
        const isHex = HEX_KEYS.has(exerciseKey.toLowerCase());
        const effectiveMetric = isHex ? "Hex" : metric;
        const effectiveNormalize = isHex ? false : normalize;

        const nextTop = top3For(pool, exerciseKey, effectiveMetric, effectiveNormalize);
        if (!cancelled) setTop3(nextTop);

        const scopeLabel = scope === "following" ? "Following" : scope === "tribe" ? (tribeName || "Tribe") : null;
        const metricLabel = effectiveMetric === '1RM' ? '1RM (Adj)' : effectiveMetric;
        const nextLabel = scopeLabel ? `${scopeLabel} • ${exerciseKey || exercise} • ${metricLabel}` : `${exerciseKey || exercise} • ${metricLabel}`;
        if (!cancelled) setLabel(nextLabel);
      } catch (e) {
        if (!cancelled) {
          setTop3([]);
          setLabel("Overall • Hex");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [lastView, enabled]);

  return { top3, label };
}
