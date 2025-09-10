// components/3_Workout/FriendsActivitySheet.jsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SectionList,
  Animated,
  Dimensions,
  ActivityIndicator,
  InteractionManager,
} from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import theme from "../../theme/mfpDark";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { Clock } from "iconsax-react-native";
import { MaterialCommunityIcons, FontAwesome6 } from "@expo/vector-icons";
import { usePfp } from "../../helper/usePFPs";
import NewWorkoutModal from "./NewWorkout/NewWorkoutModal";
import { getPfpUrl } from "../../pfpCache";
import { onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase.config";
import calculate1RM from "../../helper/calculate1RM";
import { useNavigation } from "@react-navigation/native";

const { height: screenHeight } = Dimensions.get("window");
const scale = screenHeight / 844;
const s = (n) => Math.round(n * scale);

// Static separators to avoid re-creating functions each render
const ItemSeparator = () => <View style={{ height: s(10) }} />;
const SectionSeparator = () => <View style={{ height: s(12) }} />;

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
const formatTimer = (value) => {
  if (value == null) return "00:00";
  if (typeof value === "string") return value;
  const sec = Number(value) || 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
const formatNumber = (n) => {
  if (n === undefined || n === null) return "0";
  try { return Number(n).toLocaleString(); } catch { return String(n); }
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

  const cachedPfp = usePfp(item?.uid, item?.pfpVersion || 0);
  const pfpUri =
    cachedPfp ||
    item?.pfp ||
    item?.pfpUrl ||
    item?.photoURL ||
    item?.photo ||
    item?.avatar;

  const when = dateLabel(bestTimestamp(item));

  return (
    <RNBounceable
      style={[
        styles.panel,
        highlight && { borderColor: 'rgba(45,158,255,0.55)', shadowColor: '#2D9EFF', shadowOpacity: 0.18 }
      ]}
      onPress={() => onSelect?.(item, pfpUri)}
      activeScale={0.965}
    >
      <View style={styles.headerRow}>
        {pfpUri ? (
          <Image source={{ uri: pfpUri }} style={styles.pfp} />
        ) : (
          <View style={[styles.pfp, styles.pfpFallback]}>
            <Text style={styles.pfpInitials}>{initials(item?.name)}</Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.templateTitle} numberOfLines={1} ellipsizeMode="tail">
            {templateName(item)}
          </Text>
          <Text style={styles.handleText}>
            {handleText(item)}
            {when ? ` · ${when}` : ""}
          </Text>
        </View>

        <View style={styles.rightAccessories}>
          {isLive ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Clock color={COLORS.text} size={s(14)} variant="Bold" />
              <Text style={styles.liveText}>{formatTimer(durationSec)}</Text>
            </View>
          ) : (
            pbs > 0 && (
              <View style={styles.prPill}>
                <FontAwesome6 name="trophy" size={s(12)} color="#FACC15" />
                <Text style={styles.prText}>{pbs} PR{pbs === 1 ? "" : "s"}</Text>
              </View>
            )
          )}
          <MaterialCommunityIcons name="chevron-right" size={s(22)} color={COLORS.subtext} />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconWrap}>
            <Clock color={COLORS.text} size={s(15)} variant="Bold" />
          </View>
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={styles.statValue}>{formatTimer(durationSec)}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconWrap}>
            <MaterialCommunityIcons name="weight-lifter" size={s(15)} color={COLORS.text} />
          </View>
          <Text style={styles.statLabel}>Volume</Text>
          <Text style={styles.statValue}>{formatNumber(vol)} lb</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconWrap}>
            <MaterialCommunityIcons name="arm-flex" size={s(15)} color={COLORS.text} />
          </View>
          <Text style={styles.statLabel}>Reps</Text>
          <Text style={styles.statValue}>{formatNumber(reps)}</Text>
        </View>
      </View>
    </RNBounceable>
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
const FriendsActivitySheet = ({ visible, openToggle, items = [], onClose, onViewed, onCopyTemplate, focusUid, focusWid, onConsumedFocus }) => {
  const bottomSheetRef = useRef(null);
  const cacheRef = useRef([]);
  const navigation = useNavigation();

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

  const sortedItems = useMemo(() => {
    const score = (it) => {
      if (it?.live) {
        const ov = it?.uid ? liveOverlays[String(it.uid)] : undefined;
        return (ov?.ts) || toMillis(it?.startedAt) || bestTimestamp(it);
      }
      return bestTimestamp(it);
    };
    const src = Array.isArray(displayItems) ? displayItems : [];
    return [...src].sort((a, b) => (score(b) - score(a)));
  }, [displayItems, liveOverlays]);

  const hasLive = useMemo(() => sortedItems?.some((it) => it?.live), [sortedItems]);
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

  // (moved up above)

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
    };

    const wk = selfActive
      ? (global?.userData?.currentWorkout || fallbackWorkout)
      : ((item?.workout && typeof item.workout === "object") ? item.workout : fallbackWorkout);

    setSelectedItem({
      ...item,
      workout: wk,
      friendPfp: pfpUri || null,
      friendPfpVersion: item?.pfpVersion || 0,
      friendUid: String(item?.uid || item?.userId || item?.user?.uid || ""), // pass concrete friend uid
      selfActive,
      // stream live activity only if this item is marked live
      streamLive: !!item?.live,
    });
    // Mount content right away to minimize perceived delay
    setViewerReady(true);
    // Animate the cross-fade concurrently
    try {
      Animated.parallel([
        Animated.timing(listOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(viewerOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } catch {}
  }, [listOpacity, viewerOpacity]);

  const closeViewer = useCallback(() => {
    Animated.parallel([
      Animated.timing(viewerOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(listOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) { setSelectedItem(null); setViewerReady(false); }
    });
  }, [listOpacity, viewerOpacity]);

  const handleIndicatorColor = selectedItem ? HANDLE_FRIEND_ACCENT : HANDLE_SELF;
  const handleBackgroundColor = selectedItem ? HANDLE_FRIEND_BACKGROUND : "transparent";

  const sections = useMemo(() => groupByTime(sortedItems, Date.now()), [sortedItems]);
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
    if (!selectedItem?.friendUid) { viewerStatsRef.current = null; return; }
    const uid = String(selectedItem.friendUid);
    let cancelled = false;
    const run = () => {
      getDoc(doc(db, 'users', uid))
        .then((snap) => {
          if (cancelled) return;
          const data = snap.exists() ? (snap.data() || {}) : {};
          viewerStatsRef.current = data?.statsExercises || null;
        })
        .catch(() => {});
    };
    try {
      InteractionManager.runAfterInteractions(run);
    } catch {
      run();
    }
    return () => { cancelled = true; };
  }, [selectedItem?.friendUid]);

  return (
    <View style={styles.outer} pointerEvents="box-none">
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={["94%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleStyle={[styles.handleWrap, { backgroundColor: handleBackgroundColor }]}
        handleIndicatorStyle={{ backgroundColor: handleIndicatorColor }}
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
        <Animated.View style={{ flex: 1, opacity: listOpacity }}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Friends training</Text>
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
            ListFooterComponent={<View style={{ height: s(28) }} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No recent activity</Text>
              </View>
            }
          />
        </Animated.View>

        <Animated.View style={[styles.viewerContainer, { opacity: viewerOpacity }]} pointerEvents={selectedItem ? "auto" : "none"}>
          {!selectedItem || !viewerReady ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={{ flex: 1 }}>
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
              </View>
            </View>
          )}
        </Animated.View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  sheetBg: { backgroundColor: COLORS.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  handleWrap: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },

  header: { paddingHorizontal: 16, paddingVertical: 8 },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: COLORS.text },
  headerSub: { marginTop: 2, fontFamily: "Outfit_500Medium", fontSize: 12.5, color: COLORS.subtext },

  listContent: { paddingHorizontal: s(16), paddingBottom: s(24) },

  sectionHeaderWrap: { paddingTop: s(6), paddingBottom: s(4) },
  sectionHeaderText: {
    fontFamily: "Outfit_700Bold",
    fontSize: s(12),
    color: COLORS.subtext,
    letterSpacing: 0.3,
  },

  panel: {
    paddingHorizontal: s(14),
    paddingVertical: s(10),
    borderRadius: s(20),
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.07,
    shadowRadius: s(12),
    elevation: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.hairline,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: s(6), gap: s(10) },
  rightAccessories: { flexDirection: "row", alignItems: "center", gap: s(10) },
  pfp: { width: s(38), height: s(38), borderRadius: s(19), backgroundColor: "#E2E8F0" },
  pfpFallback: { alignItems: "center", justifyContent: "center" },
  pfpInitials: { fontFamily: "Outfit_700Bold", fontSize: s(12), color: COLORS.text, opacity: 0.9 },
  templateTitle: { fontSize: s(12.5), fontFamily: "Outfit_700Bold", color: COLORS.text },
  handleText: { marginTop: s(2), fontSize: s(12), fontFamily: "Outfit_500Medium", color: COLORS.subtext },

  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(6),
    backgroundColor: "rgba(45,158,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(45,158,255,0.35)",
    paddingVertical: s(6),
    paddingHorizontal: s(9),
    borderRadius: s(999),
  },
  liveDot: { width: s(8), height: s(8), borderRadius: s(4), backgroundColor: "#EF4444" },
  liveText: { fontFamily: "Outfit_700Bold", fontSize: s(11.5), color: COLORS.text },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.hairline, marginVertical: s(6) },

  statsRow: { flexDirection: "row", gap: s(8) },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.statBg,
    borderRadius: s(14),
    paddingVertical: s(8),
    paddingHorizontal: s(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.statBorder,
  },
  statIconWrap: {
    width: s(26),
    height: s(26),
    borderRadius: s(13),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.iconBg,
    marginBottom: s(6),
  },
  statLabel: { fontFamily: "Outfit_600SemiBold", fontSize: s(11), color: theme.textSecondary },
  statValue: { marginTop: s(1), fontFamily: "Outfit_800ExtraBold", fontSize: s(14.5), color: COLORS.text },

  viewerContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  emptyWrap: { paddingVertical: s(24), alignItems: "center" },
  emptyText: { fontFamily: "Outfit_600SemiBold", color: "rgba(15,23,42,0.5)", fontSize: s(12) },

  prPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(6),
    backgroundColor: "rgba(250, 204, 21, 0.24)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(250, 204, 21, 0.60)",
    paddingVertical: s(5),
    paddingHorizontal: s(8),
    borderRadius: s(999),
  },
  prText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: s(12),
    color: "#FACC15",
  },
});

export default memo(FriendsActivitySheet);
