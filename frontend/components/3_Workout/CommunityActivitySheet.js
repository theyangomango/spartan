// components/3_Workout/CommunityActivitySheet.jsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Animated,
  Dimensions,
  ActivityIndicator,
  InteractionManager,
  Easing,
} from "react-native";
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import theme from "../../theme/mfpDark";
import NewWorkoutModal from "./NewWorkout/NewWorkoutModal";
import { getPfpUrl } from "../../pfpCache";
import { onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase.config";
import calculate1RM from "../../helper/calculate1RM";
import { useNavigation } from "@react-navigation/native";

import scaleSize from "../../helper/scaleSize";
import WorkoutPanelCard from "./ui/WorkoutPanelCard";
import { canViewWorkout, sanitizeStatsForViewer } from "../../utils/workoutPrivacy";
import { buildExerciseSummaries } from "../../utils/workoutSummary";

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");
const scale = screenHeight / 844;
const s = (n) => Math.round(n * scale);

// Static separators to avoid re-creating functions each render
const CARD_GAP = 14;
const ItemSeparator = () => <View style={{ height: scaleSize(CARD_GAP) }} />;
const SectionSeparator = () => <View style={{ height: scaleSize(CARD_GAP) }} />;

const COLORS = {
  bg: theme.bg,
  card: theme.surface,
  text: theme.textPrimary,
  subtext: theme.textSecondary,
  hairline: theme.hairline,
  iconBg: theme.field,
  statBg: theme.field,
  statBorder: theme.hairline,
};

const HANDLE_SELF = "#D0D7E2";
const HANDLE_FRIEND_ACCENT = "#E0A500";
const HANDLE_FRIEND_BACKGROUND = "#e0a4002c";
const EDGE_BACK_GESTURE_WIDTH = 200; // px — left-edge zone to trigger back
const BACK_SWIPE_TRIGGER = 36;      // px — horizontal drag to confirm back

/* ---------------- utils ---------------- */
const toMillis = (v) => {
  if (!v && v !== 0) return undefined;
  if (typeof v === "number") return v;
  if (v?.toMillis) return v.toMillis();
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : undefined;
};
const bestTimestamp = (it) =>
  Math.max(
    toMillis(it?.created) ?? 0,
    toMillis(it?.startedAt) ?? 0,
    toMillis(it?.finishedAt) ?? 0
  );
const toSec = (x) => {
  const n = Number(x ?? 0);
  return n > 9999 ? Math.round(n / 1000) : Math.round(n);
};
const firstName = (name = "") => {
  const str = String(name).trim();
  if (!str) return "Friend";
  const raw = (str.split(/\s+/)[0] || str).replace(/[.,;:]+$/, "");
  return raw;
};
const initials = (name = "") => {
  const parts = String(name).trim().split(/\s+/);
  const a = (parts[0] || "").charAt(0);
  const b = (parts[1] || "").charAt(0);
  return (a + b).toUpperCase() || "F";
};
const templateName = (item) =>
  item?.templateName ??
  item?.template?.name ??
  item?.template_title ??
  item?.title ??
  item?.workout?.name ??
  "Workout";
const handleText = (item) => {
  const raw =
    item?.handle ??
    item?.username ??
    item?.userName ??
    firstName(item?.name)?.toLowerCase();
  if (!raw) return "Friend";
  const sRaw = String(raw);
  return sRaw.startsWith("@") ? sRaw : `@${sRaw}`;
};
const dateLabel = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const nowYear = new Date().getFullYear();
  const opts =
    d.getFullYear() === nowYear
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "2-digit" };
  return d.toLocaleDateString(undefined, opts);
};
const dateTimeLabel = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  let timePart = "";
  try {
    timePart = d
      .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })
      .toLowerCase()
      .replace(/[\s.]/g, "");
  } catch {
    timePart = "";
  }
  const datePart = dateLabel(ts);
  if (timePart && datePart) return `${timePart}, ${datePart}`;
  return timePart || datePart;
};

/* ---------------- grouping ---------------- */
const startOfToday = (now = new Date()) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; };
const startOfYesterday = (now = new Date()) => { const d = startOfToday(now); d.setDate(d.getDate() - 1); return d; };
const startOfWeekSunday = (now = new Date()) => { const d = startOfToday(now); d.setDate(d.getDate() - d.getDay()); return d; };
const startOfLastWeek = (now = new Date()) => { const d = startOfWeekSunday(now); d.setDate(d.getDate() - 7); return d; };
const minusMonths = (now, months) => { const d = startOfToday(now); d.setMonth(d.getMonth() - months); return d; };
const minusYears = (now, years) => { const d = startOfToday(now); d.setFullYear(d.getFullYear() - years); return d; };

const groupByTime = (items, nowMs) => {
  const now = new Date(nowMs || Date.now());
  const T0 = startOfToday(now).getTime();
  const Y0 = startOfYesterday(now).getTime();
  const W0 = startOfWeekSunday(now).getTime();
  const LW0 = startOfLastWeek(now).getTime();
  const M1 = minusMonths(now, 1).getTime();
  const M3 = minusMonths(now, 3).getTime();
  const Y1 = minusYears(now, 1).getTime();

  const live = [];
  const rest = [];
  for (const it of items) (it?.live ? live : rest).push(it);

  const buckets = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    "Last Week": [],
    "Last Month": [],
    "Last Three Months": [],
    "Last Year": [],
    Older: [],
  };

  for (const it of rest) {
    const ts = bestTimestamp(it);
    if (!ts) { buckets["Older"].push(it); continue; }
    if (ts >= T0) buckets["Today"].push(it);
    else if (ts >= Y0) buckets["Yesterday"].push(it);
    else if (ts >= W0) buckets["This Week"].push(it);
    else if (ts >= LW0) buckets["Last Week"].push(it);
    else if (ts >= M1) buckets["Last Month"].push(it);
    else if (ts >= M3) buckets["Last Three Months"].push(it);
    else if (ts >= Y1) buckets["Last Year"].push(it);
    else buckets["Older"].push(it);
  }

  const ordered = [];
  if (live.length) ordered.push({ title: "Live Now", data: live });
  const order = ["Today", "Yesterday", "This Week", "Last Week", "Last Month", "Last Three Months", "Last Year", "Older"];
  for (const key of order) {
    const data = buckets[key];
    if (data.length) ordered.push({ title: key, data });
  }
  return ordered;
};

const sortFriendsItems = (items, liveOverlays) => {
  const overlayMap = liveOverlays || {};
  const src = Array.isArray(items) ? items : [];
  if (src.length <= 1) return src.slice();
  const score = (it) => {
    if (!it) return 0;
    if (it?.live) {
      const uid = String(it?.uid ?? "");
      const overlay = uid ? overlayMap[uid] : undefined;
      return overlay?.ts || toMillis(it?.startedAt) || bestTimestamp(it);
    }
    return bestTimestamp(it);
  };
  const arr = src.slice();
  arr.sort((a, b) => score(b) - score(a));
  return arr;
};

const shallowArrayEqual = (a, b) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const shallowSectionsEqual = (a, b) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const sa = a[i] || {};
    const sb = b[i] || {};
    if (sa.title !== sb.title) return false;
    const da = Array.isArray(sa.data) ? sa.data : [];
    const db = Array.isArray(sb.data) ? sb.data : [];
    if (da.length !== db.length) return false;
    for (let j = 0; j < da.length; j += 1) {
      if (da[j] !== db[j]) return false;
    }
  }
  return true;
};

/* ---------------- row ---------------- */
const FriendPanel = memo(({ item, overlay, onSelect, highlight = false }) => {
  const isLive = !!item?.live;

  // Local ticker only for live rows → avoids re-rendering the whole list every second
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => clearInterval(id);
  }, [isLive]);

  const started = isLive ? (toMillis(item?.startedAt) ?? toMillis(item?.created)) : undefined;
  const durationSec = isLive
    ? toSec(Math.max(0, started ? Math.round((Date.now() - started) / 1000) : 0))
    : Math.max(0, Math.round(Number(item?.duration || 0) * 60));

  // Live overlay values (volume/reps/PBs) override base item when present
  let vol = Number((overlay?.volume != null ? overlay.volume : item?.volume) ?? 0);
  let reps = Number((overlay?.reps != null ? overlay.reps : (item?.reps ?? item?.totalReps)) ?? 0);
  const pbs = Number((overlay?.PBs != null ? overlay.PBs : (item?.PBs ?? item?.pbs)) ?? 0);

  // Fallback: compute from workout sets when not provided
  if ((!vol || !Number.isFinite(vol)) || (!reps || !Number.isFinite(reps))) {
    try {
      const exs = Array.isArray(item?.workout?.exercises) ? item.workout.exercises : [];
      if (exs.length) {
        let vSum = 0; let rSum = 0;
        for (const ex of exs) {
          const sets = Array.isArray(ex?.sets) ? ex.sets : [];
          for (const s of sets) {
            const w = Number(s?.weight) || 0;
            const r = Number(s?.reps) || 0;
            vSum += w * r;
            rSum += r;
          }
        }
        if (!vol || !Number.isFinite(vol)) vol = vSum;
        if (!reps || !Number.isFinite(reps)) reps = rSum;
      }
    } catch {}
  }

  const pfpUri =
    item?.pfp ||
    item?.pfpUrl ||
    item?.photoURL ||
    item?.photo ||
    item?.avatar;

  // Only consider it template-based when underlying workout carries a tid
  const hasTemplate = item?.workout && item.workout.tid != null;

  const timestamp = bestTimestamp(item);
  const metaParts = [handleText(item)];
  const dateTime = dateTimeLabel(timestamp);
  if (dateTime) metaParts.push(dateTime);
  const exerciseSummaries = buildExerciseSummaries(item?.workout);

  return (
    <WorkoutPanelCard
      onPress={() => onSelect?.(item, pfpUri)}
      highlight={highlight}
      uid={item?.uid}
      pfpVersion={item?.pfpVersion || 0}
      pfpUri={pfpUri}
      fallbackLabel={initials(item?.name)}
      title={templateName(item)}
      titleStyle={hasTemplate ? styles.templateTitleBlue : null}
      metaParts={metaParts}
      isLive={isLive}
      liveDurationSeconds={durationSec}
      durationSeconds={durationSec}
      volume={vol}
      reps={reps}
      pbs={pbs}
      exerciseSummaries={exerciseSummaries}
    />
  );
}, (prev, next) => {
  // Custom comparator to minimize re-renders
  const a = prev.item || {}; const b = next.item || {};
  const sameId = String(a.id || a.wid || a.uid || '') === String(b.id || b.wid || b.uid || '');
  const sameLive = !!a.live === !!b.live;
  const sameStatic =
    sameId && sameLive &&
    (a.pfpVersion === b.pfpVersion) &&
    (a.pfp === b.pfp) && (a.pfpUrl === b.pfpUrl) && (a.photoURL === b.photoURL) &&
    (a.name === b.name) && (a.handle === b.handle) && (a.templateName === b.templateName) &&
    (a.duration === b.duration) && (a.volume === b.volume) && (a.reps === b.reps) && (a.PBs === b.PBs) &&
    (prev.highlight === next.highlight);
  if (!sameStatic) return false;
  const po = prev.overlay || {}; const no = next.overlay || {};
  return (
    po.volume === no.volume &&
    po.reps === no.reps &&
    po.PBs === no.PBs &&
    (po.exercises?.length || 0) === (no.exercises?.length || 0)
  );
});

/* ---------------- sheet ---------------- */
const CommunityActivitySheet = ({ visible, openToggle, items = [], onClose, onViewed, onCopyTemplate, focusUid, focusWid, onConsumedFocus }) => {
  const bottomSheetRef = useRef(null);
  const cacheRef = useRef([]);
  const navigation = useNavigation();
  const viewerData = (() => {
    try { return global?.userData || null; } catch { return null; }
  })();
  const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";

  useEffect(() => {
    if (Array.isArray(items) && items.length) cacheRef.current = items;
  }, [items]);

  const displayItems = items.length ? items : cacheRef.current;

  // Live overlays: subscribe to users/{uid} for items that are live and update stats inline
  const liveSubsRef = useRef(new Map()); // uid -> unsubscribe
  const [liveOverlays, setLiveOverlays] = useState({}); // uid -> { volume, reps, PBs, exercises? }

  useEffect(() => {
    if (!visible) return;
    const lives = new Set((displayItems || []).filter((it) => it?.live && it?.uid).map((it) => String(it.uid)));

    // unsubscribe removed
    for (const [uid, unsub] of liveSubsRef.current.entries()) {
      if (!lives.has(uid)) { try { unsub && unsub(); } catch {} liveSubsRef.current.delete(uid); }
    }

    // subscribe new
    lives.forEach((uid) => {
      if (liveSubsRef.current.has(uid)) return;
      try {
        const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
          const data = snap.data() || {};
          const cw = data?.currentWorkout || null;
          if (cw) {
            setLiveOverlays((prev) => {
              // Derive PBs if missing using friend's statsExercises (1RM comparison), one PB per exercise
              const friendStats = data?.statsExercises || {};
              let derivedPBs = 0;
              try {
                const exsArr = Array.isArray(cw?.exercises) ? cw.exercises : [];
                for (const ex of exsArr) {
                  const prevMax = Number(friendStats?.[ex?.name]?.["1RM"] || 0);
                  let hit = false;
                  const sets = Array.isArray(ex?.sets) ? ex.sets : [];
                  for (const s of sets) {
                    if (hit) break;
                    const r = Number(s?.reps) || 0;
                    const w = Number(s?.weight) || 0;
                    if (r > 0 && w > 0) {
                      const est = calculate1RM(w, r);
                      if (est > prevMax) { derivedPBs += 1; hit = true; }
                    }
                  }
                }
              } catch {}

              const hasPBField = (cw && (Object.prototype.hasOwnProperty.call(cw, 'PBs') || Object.prototype.hasOwnProperty.call(cw, 'pbs')));
              const pbValue = hasPBField ? Number(cw?.PBs ?? cw?.pbs ?? 0) : derivedPBs;

              const nextEntry = {
                volume: Number(cw?.volume || 0),
                reps: Number(cw?.reps || 0),
                PBs: Number.isFinite(pbValue) ? pbValue : 0,
                exercises: Array.isArray(cw?.exercises) ? cw.exercises : undefined,
                ts: Date.now(),
              };
              const curr = prev[uid];
              if (
                curr &&
                curr.volume === nextEntry.volume &&
                curr.reps === nextEntry.reps &&
                curr.PBs === nextEntry.PBs &&
                ((curr.exercises?.length || 0) === (nextEntry.exercises?.length || 0))
              ) {
                return prev; // no change
              }
              return { ...prev, [uid]: nextEntry };
            });
          } else {
            setLiveOverlays((prev) => {
              const next = { ...prev }; delete next[uid]; return next;
            });
          }
        });
        liveSubsRef.current.set(uid, unsub);
      } catch {}
    });

    return () => {
      for (const [, unsub] of liveSubsRef.current.entries()) { try { unsub && unsub(); } catch {} }
      liveSubsRef.current.clear();
    };
  }, [visible, displayItems]);

  const [sortedItems, setSortedItems] = useState(() => sortFriendsItems(displayItems, liveOverlays));

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const next = sortFriendsItems(displayItems, liveOverlays);
      setSortedItems((prev) => (shallowArrayEqual(prev, next) ? prev : next));
    };
    let task;
    try {
      task = InteractionManager.runAfterInteractions(run);
    } catch {
      run();
      return () => { cancelled = true; };
    }
    return () => {
      cancelled = true;
      try { task?.cancel?.(); } catch {}
    };
  }, [displayItems, liveOverlays]);

  // Move viewer-related state above effects that depend on it to avoid TDZ issues
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewerReady, setViewerReady] = useState(false);
  const listOpacity = useRef(new Animated.Value(1)).current;
  const viewerOpacity = useRef(new Animated.Value(0)).current;

  // Removed global per-second ticker to avoid re-rendering the entire list every second

  // Close when parent hides; opening is driven solely by the toggle flag
  useEffect(() => {
    if (!bottomSheetRef.current) return;
    if (!visible) {
      try { bottomSheetRef.current.close(); } catch {}
    }
  }, [visible]);

  // Open via a boolean toggle flag only; independent of `visible` truthiness
  useEffect(() => {
    if (!bottomSheetRef.current) return;
    try { bottomSheetRef.current.expand(); } catch {}
  }, [openToggle]);

  // Fire onViewed each time the sheet is toggled open
  useEffect(() => {
    try { onViewed?.(); } catch {}
  }, [openToggle, onViewed]);

  // Reset focus-consumption guard on each explicit open toggle so we can re-focus
  useEffect(() => {
    try { consumedFocusRef.current = ""; } catch {}
  }, [openToggle]);

  // If a specific friend uid or workout id is provided, auto-open the viewer focused on it
  const consumedFocusRef = useRef("");
  const [highlightWid, setHighlightWid] = useState(null);
  useEffect(() => {
    const uidTarget = String(focusUid || "").trim();
    const widTarget = String(focusWid || "").trim();
    const token = widTarget ? `w:${widTarget}` : (uidTarget ? `u:${uidTarget}` : "");
    if (!token || consumedFocusRef.current === token) return;

    const findByWid = (arr) => arr.find((x) => String(x?.wid || x?.id || x?.workout?.wid || "") === widTarget);
    const findByUid = (arr) => arr.find((x) => String(x?.uid || "") === uidTarget);
    let it = widTarget ? findByWid(sortedItems || []) : findByUid(sortedItems || []);
    // If a wid was provided but not found, gracefully fall back to the user's latest item
    if (!it && widTarget && uidTarget) it = findByUid(sortedItems || []);
    if (!it) return; // wait until items available (or none exists)
    try { bottomSheetRef.current?.expand?.(); } catch {}
    if (widTarget) {
      setHighlightWid(widTarget);
      setTimeout(() => setHighlightWid(null), 1200);
    }

    // Small delay so the sheet starts expanding, but do NOT block on image lookups
    const id = setTimeout(() => {
      try {
        // Open immediately with whatever image we already have
        const immediatePfp = it?.pfp || it?.pfpUrl || it?.photoURL || null;
        openViewer(it, immediatePfp);
        consumedFocusRef.current = token;
        try { onConsumedFocus?.(); } catch {}
        // Kick off a non-blocking PFP fetch; update if still viewing the same friend
        if (it?.uid) {
          getPfpUrl(String(it.uid), it?.pfpVersion || 0)
            .then((uri) => {
              if (!uri) return;
              setSelectedItem((prev) => {
                if (!prev) return prev;
                const same = String(prev?.friendUid || prev?.uid || "") === String(it.uid);
                return same ? { ...prev, friendPfp: uri } : prev;
              });
            })
            .catch(() => {});
        }
      } catch {}
    }, 60);
    return () => clearTimeout(id);
  }, [openToggle, focusUid, focusWid, sortedItems, openViewer, onConsumedFocus]);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    ),
    []
  );

  // Slide-in viewer animation state
  const viewerTranslateX = useRef(new Animated.Value(screenWidth)).current;

  const openViewer = useCallback((item, pfpUri) => {
    const widFromItem = String(item?.wid || item?.id || item?.workout?.wid || "");
    const myActiveWid = String(global?.userData?.currentWorkout?.wid || "");
    const selfActive = !!widFromItem && widFromItem === myActiveWid;

    const createdMs =
      toMillis(item?.startedAt) ??
      toMillis(item?.created) ??
      Date.now();

    const fallbackWorkout = {
      wid: item?.wid || item?.id,
      creatorUID: item?.uid,
      created: createdMs,
      exercises: Array.isArray(item?.exercises) ? item.exercises : [],
      duration: item?.duration,
      volume: item?.volume,
      reps: item?.reps,
      PBs: item?.PBs ?? item?.pbs ?? 0,
      templateName: item?.templateName,
      privacyMode: item?.workout?.privacyMode ?? item?.privacyMode ?? 'hidden',
    };

    const wk = selfActive
      ? (global?.userData?.currentWorkout || fallbackWorkout)
      : ((item?.workout && typeof item.workout === "object") ? item.workout : fallbackWorkout);

    const safeWorkout = wk ? { ...wk, privacyMode: wk?.privacyMode ?? 'hidden' } : null;

    if (!canViewWorkout(safeWorkout, viewerUid, viewerData)) {
      return;
    }

    setSelectedItem({
      ...item,
      workout: safeWorkout,
      friendPfp: pfpUri || null,
      friendPfpVersion: item?.pfpVersion || 0,
      friendUid: String(item?.uid || item?.userId || item?.user?.uid || ""), // pass concrete friend uid
      selfActive,
      // stream live activity only if this item is marked live
      streamLive: !!item?.live,
    });
    // Mount content right away to minimize perceived delay
    setViewerReady(true);
    // Prepare positions and animate slide-in of the viewer
    try { viewerTranslateX.setValue(screenWidth); viewerOpacity.setValue(1); } catch {}
    try {
      Animated.parallel([
        Animated.timing(viewerTranslateX, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(listOpacity, { toValue: 1, duration: 1, useNativeDriver: true }),
      ]).start();
    } catch {}
  }, [listOpacity, viewerOpacity]);

  const closeViewer = useCallback(() => {
    try {
      Animated.parallel([
        Animated.timing(viewerTranslateX, { toValue: screenWidth, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(listOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) { try { viewerOpacity.setValue(0); } catch {} setSelectedItem(null); setViewerReady(false); }
      });
    } catch {
      setSelectedItem(null); setViewerReady(false); try { viewerOpacity.setValue(0); } catch {}
    }
  }, [listOpacity, viewerOpacity]);

  // Interactive back-pan helpers (declared after closeViewer to avoid TDZ issues)
  const onBackUpdateX = useCallback((dx) => {
    try {
      const x = Math.max(0, Math.min(screenWidth, dx || 0));
      viewerTranslateX.setValue(x);
    } catch {}
  }, [viewerTranslateX]);
  const onBackEnd = useCallback((dx, vx) => {
    const x = Math.max(0, Number(dx || 0));
    const v = Number(vx || 0);
    const shouldClose = x > screenWidth * 0.28 || v > 800;
    if (shouldClose) {
      closeViewer();
    } else {
      try {
        Animated.timing(viewerTranslateX, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      } catch {}
    }
  }, [viewerTranslateX, closeViewer]);

  // Animated handle accent opacity follows the viewer slide progress: 0 (closed) → 1 (open)
  const handleAccentOpacity = useMemo(() => (
    viewerTranslateX.interpolate({
      inputRange: [0, screenWidth],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    })
  ), [viewerTranslateX]);

  // Custom handle component with fading yellow accent matching overlay slide progress
  const Handle = useMemo(() => () => (
    <View style={styles.handleWrap}>
      {/* Fading background tint under handle while viewing workout */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: HANDLE_FRIEND_BACKGROUND,
            opacity: handleAccentOpacity,
            borderTopLeftRadius: scaleSize(22),
            borderTopRightRadius: scaleSize(22),
          },
        ]}
        pointerEvents="none"
      />
      <View style={{ alignItems: 'center', paddingVertical: scaleSize(s(8)) }}>
        {/* Base neutral handle bar */}
        <View
          style={{
            width: scaleSize(s(42)),
            height: scaleSize(s(4)),
            borderRadius: scaleSize(s(2)),
            backgroundColor: HANDLE_SELF,
            overflow: 'hidden',
          }}
        >
          {/* Yellow accent fades in as viewer opens */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: HANDLE_FRIEND_ACCENT,
              opacity: handleAccentOpacity,
              borderRadius: scaleSize(s(2)),
            }}
            pointerEvents="none"
          />
        </View>
      </View>
    </View>
  ), [handleAccentOpacity]);

  const [sections, setSections] = useState(() => groupByTime(sortedItems, Date.now()));

  useEffect(() => {
    let cancelled = false;
    const nowMs = Date.now();
    const run = () => {
      if (cancelled) return;
      const next = groupByTime(sortedItems, nowMs);
      setSections((prev) => (shallowSectionsEqual(prev, next) ? prev : next));
    };
    let task;
    try {
      task = InteractionManager.runAfterInteractions(run);
    } catch {
      run();
      return () => { cancelled = true; };
    }
    return () => {
      cancelled = true;
      try { task?.cancel?.(); } catch {}
    };
  }, [sortedItems]);
  const keyExtractor = useCallback((it, i) => String(it.id || it.wid || (it.uid ? `${it.uid}_${bestTimestamp(it) || i}` : i)), []);
  const renderItem = useCallback(
    ({ item }) => {
      const widHere = String(item?.wid || item?.id || item?.workout?.wid || "");
      const isHighlighted = !!highlightWid && widHere === String(highlightWid);
      return <FriendPanel item={item} overlay={item?.uid ? liveOverlays[String(item.uid)] : undefined} onSelect={openViewer} highlight={isHighlighted} />;
    },
    [openViewer, highlightWid, liveOverlays]
  );
  const renderSectionHeader = useCallback(({ section }) => {
    return (
      <View style={styles.sectionHeaderWrap}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
      </View>
    );
  }, []);

  const liveCount = useMemo(() => sortedItems.filter((x) => x?.live).length, [sortedItems]);
  const noop = React.useCallback(() => { }, []);
  const noopCheer = React.useCallback(() => { }, []);
  const handleCopyTemplateCb = React.useCallback((wk) => onCopyTemplate?.(wk), [onCopyTemplate]);
  const timerRef = useRef("");

  // Fetch viewer's statsExercises once per friend when selected (non-blocking, no live stream)
  const viewerStatsRef = useRef(null);
  useEffect(() => {
    if (!selectedItem?.friendUid || !canViewWorkout(selectedItem?.workout, viewerUid, viewerData)) {
      viewerStatsRef.current = null;
      return;
    }
    const uid = String(selectedItem.friendUid);
    let cancelled = false;
    const run = () => {
      getDoc(doc(db, 'users', uid))
        .then((snap) => {
          if (cancelled) return;
          const data = snap.exists() ? (snap.data() || {}) : {};
          viewerStatsRef.current = sanitizeStatsForViewer(data?.statsExercises || null, uid, viewerUid, viewerData);
        })
        .catch(() => {});
    };
    try {
      InteractionManager.runAfterInteractions(run);
    } catch {
      run();
    }
    return () => { cancelled = true; };
  }, [selectedItem?.friendUid, selectedItem?.workout, viewerUid, viewerData]);

  // Edge back-swipe to close the inline viewer (iOS-like)
  const backEligible = useSharedValue(0);
  const backPan = Gesture.Pan()
    .minDistance(8)
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onBegin((e) => {
      'worklet';
      backEligible.value = (e.absoluteX <= EDGE_BACK_GESTURE_WIDTH) ? 1 : 0;
    })
    .onUpdate((e) => {
      'worklet';
      if (!backEligible.value) return;
      runOnJS(onBackUpdateX)(e.translationX);
    })
    .onEnd((e) => { 'worklet'; backEligible.value = 0; runOnJS(onBackEnd)(e.translationX, e.velocityX); })
    .onFinalize(() => { 'worklet'; backEligible.value = 0; });

  return (
    <View style={styles.outer} pointerEvents="box-none">
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={["94%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleComponent={Handle}
        backgroundStyle={styles.sheetBg}
        onClose={() => {
          if (selectedItem) {
            setSelectedItem(null);
            listOpacity.setValue(1);
            viewerOpacity.setValue(0);
          }
          onClose?.();
        }}
      >
        <Animated.View style={{ flex: 1, opacity: listOpacity }} pointerEvents={selectedItem ? 'none' : 'auto'}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Community Training</Text>
            <Text style={styles.headerSub}>
              {sortedItems.length} updates • {liveCount} live
            </Text>
          </View>

          <SectionList
            sections={sections}
            renderSectionHeader={renderSectionHeader}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            style={{ flex: 1 }}
            contentContainerStyle={styles.listContent}
            removeClippedSubviews={false}
            ItemSeparatorComponent={ItemSeparator}
            SectionSeparatorComponent={SectionSeparator}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            windowSize={10}
            maxToRenderPerBatch={12}
            ListFooterComponent={<View style={{ height: scaleSize(s(28)) }} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No recent activity</Text>
              </View>
            }
          />
        </Animated.View>

        <Animated.View style={[styles.viewerContainer, { opacity: viewerOpacity, transform: [{ translateX: viewerTranslateX }] }]} pointerEvents={selectedItem ? "auto" : "none"}>
          {!selectedItem || !viewerReady ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator />
            </View>
          ) : (
            <GestureDetector gesture={backPan}>
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                  {canViewWorkout(selectedItem.workout, viewerUid, viewerData) ? (
                    <NewWorkoutModal
                      timerRef={timerRef}
                      workout={selectedItem.workout}
                      cancelWorkout={noop}
                      updateWorkout={noop}
                      finishWorkout={noop}
                      showGroupModal={noop}
                      userWorkoutStats={viewerStatsRef.current || undefined}
                      onPressBack={closeViewer}
                      onCheer={noopCheer}
                      onCopyTemplate={handleCopyTemplateCb}
                      onPressPfp={() => {
                        try { bottomSheetRef.current?.close(); } catch {}
                        const uid = String(selectedItem?.friendUid || '');
                        if (!uid) return;
                        const meUid = String(global?.userData?.uid || '');
                        const rootNav = navigation?.getParent?.('ROOT');
                        if (uid === meUid) {
                          if (rootNav?.navigate) rootNav.navigate('Profile', { transition: 'slide-from-right' });
                          else navigation.navigate('Profile', { transition: 'slide-from-right' });
                        } else {
                          if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user: { uid } });
                          else navigation.navigate('ViewProfile', { user: { uid } });
                        }
                      }}
                      /* 🔒 LOCK friend view so header/controls don't flip to self */
                      forceViewingFriend={selectedItem.friendUid}
                      friendPfp={selectedItem.friendPfp || null}
                      friendPfpVersion={selectedItem.friendPfpVersion || 0}
                      /* 🚀 Stream live only when the item is live */
                      streamLive={!!selectedItem.streamLive}
                    />
                  ) : (
                    <View style={styles.lockedWrap}>
                      <Text style={styles.lockedTitle}>Workout is private</Text>
                      <Text style={styles.lockedSubtitle}>You do not have permission to view this workout.</Text>
                    </View>
                  )}
                </View>
              </View>
            </GestureDetector>
          )}
        </Animated.View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  sheetBg: { backgroundColor: COLORS.bg, borderTopLeftRadius: scaleSize(22), borderTopRightRadius: scaleSize(22) },
  handleWrap: { borderTopLeftRadius: scaleSize(22), borderTopRightRadius: scaleSize(22) },

  header: { paddingHorizontal: scaleSize(16), paddingVertical: scaleSize(12) },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(16), color: COLORS.text },
  headerSub: { marginTop: scaleSize(2), fontFamily: "Outfit_500Medium", fontSize: scaleSize(12.5), color: COLORS.subtext },

  listContent: { paddingHorizontal: scaleSize(s(16)), paddingBottom: scaleSize(s(24)) },

  sectionHeaderWrap: { paddingTop: scaleSize(s(6)), paddingBottom: scaleSize(s(4)) },
  sectionHeaderText: {
    fontFamily: "Outfit_700Bold",
    fontSize: scaleSize(s(12)),
    color: COLORS.subtext,
    letterSpacing: 0.3,
  },

  panel: {
    paddingHorizontal: scaleSize(s(14)),
    paddingVertical: scaleSize(s(10)),
    borderRadius: scaleSize(s(20)),
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scaleSize(s(6)) },
    shadowOpacity: 0.07,
    shadowRadius: scaleSize(s(12)),
    elevation: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: scaleSize(s(6)), gap: scaleSize(s(10)) },
  rightAccessories: { flexDirection: "row", alignItems: "center", gap: scaleSize(s(10)) },
  pfp: { width: scaleSize(s(38)), height: scaleSize(s(38)), borderRadius: scaleSize(s(19)), backgroundColor: "#E2E8F0" },
  pfpFallback: { alignItems: "center", justifyContent: "center" },
  pfpInitials: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(s(12)), color: COLORS.text, opacity: 0.9 },
  templateTitle: { fontSize: scaleSize(s(12.5)), fontFamily: "Outfit_700Bold", color: COLORS.text },
  templateTitleBlue: { color: theme.primary },
  handleText: { marginTop: scaleSize(s(2)), fontSize: scaleSize(s(12)), fontFamily: "Outfit_500Medium", color: COLORS.subtext },

  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSize(s(6)),
    backgroundColor: "rgba(45,158,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(45,158,255,0.35)",
    paddingVertical: scaleSize(s(6)),
    paddingHorizontal: scaleSize(s(9)),
    borderRadius: scaleSize(s(999)),
  },
  liveDot: { width: scaleSize(s(8)), height: scaleSize(s(8)), borderRadius: scaleSize(s(4)), backgroundColor: "#EF4444" },
  liveText: { fontFamily: "Outfit_700Bold", fontSize: scaleSize(s(11.5)), color: COLORS.text },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.hairline, marginVertical: scaleSize(s(6)) },

  statsRow: { flexDirection: "row", gap: scaleSize(s(6)) },
  statCard: {
    flex: 1,
    paddingVertical: scaleSize(s(6)),
  },
  statIconWrap: {
    width: scaleSize(s(30)),
    height: scaleSize(s(30)),
    borderRadius: scaleSize(s(20)),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#ffffff2e',
    marginBottom: scaleSize(s(6)),
  },
  statLabel: { fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(s(11)), color: theme.textSecondary },
  statValue: { marginTop: scaleSize(s(1)), fontFamily: "Outfit_800ExtraBold", fontSize: scaleSize(s(13)), color: COLORS.text },
  statTextCol: { flex: 1, minWidth: 0 },

  viewerContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bg },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  lockedWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scaleSize(s(28)),
  },
  lockedTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: scaleSize(s(16)),
    color: COLORS.text,
    marginBottom: scaleSize(s(6)),
    textAlign: "center",
  },
  lockedSubtitle: {
    fontFamily: "Outfit_500Medium",
    fontSize: scaleSize(s(13)),
    color: COLORS.subtext,
    textAlign: "center",
  },

  emptyWrap: { paddingVertical: scaleSize(s(24)), alignItems: "center" },
  emptyText: { fontFamily: "Outfit_600SemiBold", color: "rgba(15,23,42,0.5)", fontSize: scaleSize(s(12)) },

  prPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSize(s(6)),
    backgroundColor: "rgba(250, 204, 21, 0.24)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(250, 204, 21, 0.60)",
    paddingVertical: scaleSize(s(5)),
    paddingHorizontal: scaleSize(s(8)),
    borderRadius: scaleSize(s(999)),
  },
  prText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: scaleSize(s(12)),
    color: "#FACC15",
  },
});

export default memo(CommunityActivitySheet);
