import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
    SafeAreaView,
    View,
    StyleSheet,
    Animated,
    Alert,
    InteractionManager,
    StatusBar,
} from "react-native";

// Header & Footer
import FeedHeader from "../components/1_Feed/FeedHeader";
import Footer from "../components/Footer";

// Sections
// import WeekCalendar from "../components/3_Workout/sections/WeekCalendar";
import TemplatesRail from "../components/3_Workout/sections/TemplatesRail";
import SectionDivider from "../components/3_Workout/ui/SectionDivider";
import HubRow from "../components/3_Workout/sections/HubRow";
import TribeStatsCard from "../components/3_Workout/sections/TribeStatsCard";
import StartCluster from "../components/3_Workout/sections/StartCluster";

// Modals / Sheets
import NewWorkoutBottomSheet from "../components/3_Workout/NewWorkout/NewWorkoutBottomSheet";
import GroupModalBottomSheet from "../components/3_Workout/NewWorkout/Group/GroupModalBottomSheet";
import EditTemplateBottomSheet from "../components/3_Workout/Template/EditTemplateBottomSheet";
import WorkoutSummaryModal from "../components/3_Workout/WorkoutSummaryModal";
import DayDetailsSheet from "../components/3_Workout/DayDetailsSheet";
import FriendsActivitySheet from "../components/3_Workout/FriendsActivitySheet";
import InviteBanner from "../components/3_Workout/InviteBanner";
import NotificationsBottomSheet from "../components/1_Feed/Notifications/NotificationsBottomSheet";
import UserStatsAfterWorkoutSheet from "../components/2_Competition/UserStats/UserStatsAfterWorkoutSheet";
import { onHexagonUpdate } from "../utils/hexagonEvents";

// Theme & Hooks (project)
import { ss, FOOTER_HEIGHT, BTN_SIZE, TPL_BOTTOM_GAP, TPL_HEIGHT } from "../components/3_Workout/sections/workoutTheme";
import theme from "../theme/mfpDark";
// Remove foodLogs dependency; compute macros from global.userData.loggedFoods only
import useResolvedUid from "../hooks/useResolvedUid";
import useUserDoc from "../hooks/useUserDoc";
import useFriendsActivity from "../hooks/useFriendsActivity";
import useTemplates from "../hooks/useTemplates";
import useHeaderSearchUsers from "../hooks/useHeaderSearchUsers";
import useWorkoutInvites from "../hooks/useWorkoutInvites";

// Backend utils
import updateDoc from "../../backend/helper/firebase/updateDoc";
import makeID from "../../backend/helper/makeID";

// Local logic
import useWorkoutManager from "../logic/useWorkoutManager";
import useWorkoutStore from "../state/workoutStore";

// utils
import millisToHoursMinutesSeconds from "../helper/millisToHoursMinutesSeconds";
import { initUserFeed, registerFeedSetters } from "../helper/initUserFeed";

// Firestore (for invites)
import { serverTimestamp } from "firebase/firestore";

// UI
import CopyTemplateToast from "../components/3_Workout/ui/CopyTemplateToast";
import scaleSize from "../helper/scaleSize";
// navigationRef and StackActions no longer needed here with single root stack

// MiniPodium preview derives from user's last Competition view

/* ---------------- helpers ---------------- */
const toMillis = (v) => {
    if (typeof v === "number") return v;
    if (v instanceof Date) return v.getTime();
    if (v?.toMillis) return v.toMillis();
    if (typeof v?.seconds === "number") return v.seconds * 1000;
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
};
const toDayKey = (d) => {
    if (!d && d !== 0) return "";
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "";
    x.setHours(0, 0, 0, 0);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

const ACTIVITY_WEEKLY_GOAL = Object.freeze({
    sedentary: 1,
    light: 3,
    moderate: 4,
    active: 5,
    athlete: 7,
});
const DEFAULT_WEEKLY_GOAL = 4;
const DIVIDER_ADJUST = scaleSize(6);

export default function Workout({ navigation, route }) {
    /* ---------- resolve uid & user ---------- */
    const uid = useResolvedUid(route);
    const [messages, setMessages] = useState(null);
    const [footerKeyDummy, setFooterKeyDummy] = useState(0);
    const feedInitOnceRef = useRef(false);
    useEffect(() => {
        // Register setters immediately to keep header hooks consistent across screens
        registerFeedSetters({ setMessages, setFooterKey: setFooterKeyDummy });
        if (!uid) return;
        // Defer expensive feed preloading until after navigation/animations
        if (!feedInitOnceRef.current) {
            const task = InteractionManager.runAfterInteractions(() => {
                initUserFeed(uid).catch(() => { });
                feedInitOnceRef.current = true;
            });
            return () => task?.cancel?.();
        }
    }, [uid]);
    const user = useUserDoc(uid, { ignoreKeys: ['currentWorkout'] }); // avoid rerenders on workout typing

    const markFriendsViewed = React.useCallback(async () => {
        try {
            if (!uid) return;
            await updateDoc("users", uid, { friendsActivityLastViewedAt: serverTimestamp() });
        } catch (e) {
            console.log("markFriendsViewed error", e);
        }
    }, [uid]);

    /* ---------- first paint guard ---------- */
    const [afterPaint, setAfterPaint] = useState(false);
    const hubRowReadyNotifiedRef = useRef(false);
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => setAfterPaint(true));
        });
        return () => task?.cancel?.();
    }, []);

    useEffect(() => {
        if (!afterPaint || hubRowReadyNotifiedRef.current) return;
        hubRowReadyNotifiedRef.current = true;
        requestAnimationFrame(() => {
            try { global.__markHubRowReady?.(); } catch {}
        });
    }, [afterPaint]);

    /* ---------- prevent phantom “00:00” ---------- */
    useEffect(() => {
        try { global.isCurrentlyWorkingOut = false; } catch { /* ignore */ }
    }, []);

    /* ---------- Invite picker (screen-level) ---------- */
    const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
    const inviteHandlerRef = useRef(null);

    /* ---------- UI/anim ---------- */
    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }).start();
    }, []);

    /* ---------- calories (today) ---------- */
    const stableToday = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
    const buildTotalsFromLoggedFoods = useCallback((d) => {
        const dk = toDayKey(d);
        const map = global?.userData?.loggedFoods || {};
        const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        try {
            const looksNested = map && typeof map === 'object' && map[dk] && !('dayKey' in (Object.values(map)[0] || {}));
            const source = looksNested ? (map[dk] || {}) : map;
            Object.values(source || {}).forEach((e) => {
                const sameDay = looksNested ? true : (String(e?.dayKey || '') === dk);
                if (!sameDay) return;
                const qty = typeof e?.quantity === 'number' ? e.quantity : 1;
                const m = e?.macros || {};
                const macros = {
                    calories: Number(m.calories) || 0,
                    protein: Number(m.protein) || 0,
                    carbs: Number(m.carbs) || 0,
                    fat: Number(m.fat) || 0,
                };
                totals.calories += macros.calories;
                totals.protein += macros.protein;
                totals.carbs += macros.carbs;
                totals.fat += macros.fat;
            });
        } catch {}
        return {
            calories: Math.round(totals.calories),
            protein: Math.round(totals.protein),
            carbs: Math.round(totals.carbs),
            fat: Math.round(totals.fat),
        };
    }, []);
    const todayTotals = useMemo(() => buildTotalsFromLoggedFoods(stableToday), [buildTotalsFromLoggedFoods, stableToday, global?.__loggedFoodsSig]);
    const todayCalories = Math.round(Math.max(0, todayTotals?.calories || 0));
    const caloriesGoal = useMemo(
        () => user?.macroGoals?.calories ?? user?.macrosGoal?.calories ?? 2340,
        [user?.macroGoals?.calories, user?.macrosGoal?.calories]
    );
    const fill = Math.min(100, (todayCalories / Math.max(1, caloriesGoal)) * 100);

    const { workoutsThisWeek, weeklyGoal } = useMemo(() => {
        const workouts = (() => {
            try {
                const arr = global?.userData?.completedWorkouts;
                return Array.isArray(arr) ? arr : [];
            } catch {
                return [];
            }
        })();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        const startMs = start.getTime();
        const endMs = end.getTime();

        let completed = 0;
        for (const wk of workouts) {
            const ts = toMillis(wk?.created || 0);
            if (!ts) continue;
            if (ts >= startMs && ts < endMs) completed += 1;
        }

        const activityKey = String(user?.personalInfo?.activity || "").toLowerCase();
        const derivedGoal = ACTIVITY_WEEKLY_GOAL[activityKey] ?? DEFAULT_WEEKLY_GOAL;
        return {
            workoutsThisWeek: completed,
            weeklyGoal: derivedGoal,
        };
    }, [user?.completedWorkouts, user?.personalInfo?.activity]);

    /* ---------- templates (state & CRUD via hook) ---------- */
    const {
        templatesWithNone,
        activeIdx,
        setActiveIdx,
        isEditVisible: isEditTemplateVisible,
        setIsEditVisible: setIsEditTemplateVisible,
        openedTemplateRef,
        initTemplate,
        openEditTemplate,
        updateTemplate,
        deleteTemplate,
    } = useTemplates({ uid, userTemplates: user?.templates });
    const [editSheetToggle, setEditSheetToggle] = useState(false);
    const initTemplateAndToggle = useCallback(() => { initTemplate(); setEditSheetToggle((t) => !t); }, [initTemplate]);
    const openEditTemplateAndToggle = useCallback((tpl) => { openEditTemplate(tpl); setEditSheetToggle((t) => !t); }, [openEditTemplate]);

    /* ---------- Copy template (from friend's completed workout) ---------- */
    const toastAnim = useRef(new Animated.Value(0)).current; // 0 hidden, 1 visible
    const [toastMsg, setToastMsg] = useState("");
    const showTemplateToast = useCallback((msg) => {
        setToastMsg(msg || "Template added");
        Animated.sequence([
            Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.delay(1800),
            Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
    }, [toastAnim]);

    const handleCopyTemplate = useCallback((wk) => {
        try {
            if (!wk || !uid) return;
            const tid = makeID();
            const name = wk?.templateName || wk?.template?.name || "Copied Template";
            const exercises = (Array.isArray(wk?.exercises) ? wk.exercises : []).map((ex) => ({
                name: ex?.name || "",
                muscle: ex?.muscle || "",
                sets: (Array.isArray(ex?.sets) ? ex.sets : []).map((s) => ({
                    weight: Number(s?.weight) || 0,
                    reps: Number(s?.reps) || 0,
                    type: (() => {
                        const raw = typeof s?.type === 'string' ? s.type.toLowerCase() : '';
                        return raw === 'warmup' || raw === 'dropset' || raw === 'failure' ? raw : null;
                    })(),
                })),
            }));
            const newTemplate = { id: tid, tid, name, exercises, lastDate: null };
            const prev = Array.isArray(user?.templates) ? user.templates : [];
            const next = [...prev, newTemplate];
            // Update backend and local global copy + dirty signature
            updateDoc("users", uid, { templates: next }).catch(() => { });
            try {
                global.userData = { ...(global.userData || {}), templates: next };
                global.__templatesLocalSig = JSON.stringify(next || []);
                global.__templatesDirty = true;
            } catch {}
            showTemplateToast("Template copied ✓");
        } catch (e) {
            console.log("handleCopyTemplate error", e);
        }
    }, [uid, user?.templates, showTemplateToast]);

    /* ---------- friends activity ---------- */
    const { items: friendsActivity, refresh: refreshFriends, loading: friendsLoading } = useFriendsActivity(user, afterPaint);
    const [friendsSheetVisible, setFriendsSheetVisible] = useState(false);
    const [friendsSheetToggle, setFriendsSheetToggle] = useState(false);
    const [focusFriendUid, setFocusFriendUid] = useState(null);
    const [focusWorkoutWid, setFocusWorkoutWid] = useState(null);
    useEffect(() => { refreshFriends(); }, [refreshFriends]);
    useEffect(() => { if (friendsSheetVisible) refreshFriends(); }, [friendsSheetVisible, refreshFriends]);

    // Avoid "flash of new" before user doc loads by gating on user readiness.
    const userLoaded = user != null; // useUserDoc returns null until first snapshot
    const lastViewedAtMs = userLoaded
        ? ((user?.friendsActivityLastViewedAt?.toMillis?.() ||
            new Date(user?.friendsActivityLastViewedAt || 0).getTime()) || 0)
        : Number.POSITIVE_INFINITY; // while loading, treat as already up-to-date so nothing appears new

    const [notificationsBottomSheetExpandFlag, setNotificationsBottomSheetExpandFlag] = useState(false);

    /* ---------- Workout Manager (state + persistence + timer) ---------- */
    // Track last consumed global open signal
    const openSignalRef = useRef(0);
    const {
        timerRef,
        isNewWorkoutVisible,
        setIsNewWorkoutVisible,
        isSummaryModalVisible,
        setIsSummaryModalVisible,
        completedWorkout,
        startNewWorkoutFromTemplate,
        updateNewWorkout,
        cancelWorkout,
        finishWorkout,
        postWorkout,
        joinExternalWorkout, // used by InviteBanner accept
    } = useWorkoutManager({ uid, navigation, millisToHMS: millisToHoursMinutesSeconds });

    // Expose imperative opener for Footer when already on Workout
    useEffect(() => {
        const openFn = () => {
            try { setIsNewWorkoutVisible(true); } catch { }
        };
        try { global.openWorkoutModal = openFn; } catch { }
        return () => {
            try { if (global.openWorkoutModal === openFn) global.openWorkoutModal = null; } catch { }
        };
    }, [setIsNewWorkoutVisible]);

    // Hexagon change modal state (shown after WorkoutSummaryModal closes)
    const [hexChangeVisible, setHexChangeVisible] = useState(false);
    const [hexFrom, setHexFrom] = useState(null);
    const [hexTo, setHexTo] = useState(null);

    // When the summary opens, capture 'from'. When the sheet opens, capture 'to' and subscribe to updates.
    useEffect(() => {
        if (isSummaryModalVisible) {
            try { setHexFrom(global?.__hexChangeFrom || global?.userData?.statsHexagon || null); } catch { setHexFrom(global?.userData?.statsHexagon || null); }
        }
    }, [isSummaryModalVisible]);

    useEffect(() => {
        if (!hexChangeVisible) return;
        // Prime both from and to on open (in case we navigated quickly)
        try { setHexFrom(global?.__hexChangeFrom || hexFrom || global?.userData?.statsHexagon || null); } catch { }
        try { setHexTo(global?.__hexChangeTo || hexTo || global?.userData?.statsHexagon || null); } catch { }
        const unsub = onHexagonUpdate(() => {
            try { setHexTo(global?.userData?.statsHexagon || null); } catch { }
        });
        return () => { try { unsub && unsub(); } catch { } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hexChangeVisible]);

    const handleSummaryClose = useCallback(() => {
        // Prime from/to immediately so labels render on first frame
        try { setHexFrom(global?.__hexChangeFrom || global?.userData?.statsHexagon || null); } catch { }
        try { setHexTo(global?.__hexChangeTo || global?.userData?.statsHexagon || null); } catch { }
        // Close summary, then open the stats sheet on the very next frame
        setIsSummaryModalVisible(false);
        requestAnimationFrame(() => setHexChangeVisible(true));
    }, [setIsSummaryModalVisible]);

    const hasActiveWorkout = useWorkoutStore((s) => !!s.workout);
    const workoutWid = useWorkoutStore((s) => (s.workout ? s.workout.wid : null));
    // Header search users (shared hook)
    const { allUsersRef, mergeUsersIntoRef } = useHeaderSearchUsers({ following: global?.userData?.following, enablePrefetch: true });

    /* ---------- Auto-open current workout or friends sheet when navigated with intent ---------- */
    useEffect(() => {
        const shouldOpenWorkout = !!route?.params?.openCurrent;
        if (shouldOpenWorkout && hasActiveWorkout) {
            const id = setTimeout(() => setIsNewWorkoutVisible(true), 60);
            navigation.setParams({ openCurrent: false });
            return () => clearTimeout(id);
        }

        if (route?.params?.openFriends) {
            const id = setTimeout(() => {
                setFriendsSheetVisible(true);
                setFriendsSheetToggle((f) => !f);
                const uidHint = route?.params?.focusFriendUid;
                if (uidHint) setFocusFriendUid(String(uidHint));
                const widHint = route?.params?.focusWorkoutWid;
                if (widHint) setFocusWorkoutWid(String(widHint));
            }, 30);
            navigation.setParams({ openFriends: false, focusFriendUid: undefined, focusWorkoutWid: undefined });
            return () => clearTimeout(id);
        }
    }, [route?.params?.openCurrent, route?.params?.openFriends, route?.params?.focusFriendUid, route?.params?.focusWorkoutWid, route?.params?._t, hasActiveWorkout, navigation, setIsNewWorkoutVisible]);

    // Also react immediately on focus transitions (e.g., when tab is already mounted)
    useFocusEffect(
        useCallback(() => {
            // Param-based trigger
            if (route?.params?.openCurrent && hasActiveWorkout) {
                const id = setTimeout(() => setIsNewWorkoutVisible(true), 30);
                navigation.setParams({ openCurrent: false });
                return () => clearTimeout(id);
            }
            if (route?.params?.openFriends) {
                setFriendsSheetVisible(true);
                setFriendsSheetToggle((f) => !f);
                const uidHint = route?.params?.focusFriendUid;
                if (uidHint) setFocusFriendUid(String(uidHint));
                const widHint = route?.params?.focusWorkoutWid;
                if (widHint) setFocusWorkoutWid(String(widHint));
                navigation.setParams({ openFriends: false, focusFriendUid: undefined, focusWorkoutWid: undefined });
            }
            // Global signal trigger (fallback when params don't propagate)
            const lastRef = openSignalRef.current || 0;
            const sig = Number(global?.openCurrentWorkoutSignal || 0);
            if (sig && sig !== lastRef && hasActiveWorkout) {
                openSignalRef.current = sig;
                const id = setTimeout(() => setIsNewWorkoutVisible(true), 30);
                return () => clearTimeout(id);
            }
        }, [route?.params?.openCurrent, route?.params?.openFriends, route?.params?.focusFriendUid, route?.params?.focusWorkoutWid, hasActiveWorkout, navigation])
    );

    /* ---------- New workout from current template selection ---------- */
    const onStartWorkout = useCallback(() => {
        const selected = templatesWithNone[Math.max(0, Math.min(activeIdx, templatesWithNone.length - 1))];
        startNewWorkoutFromTemplate(selected?.isNone ? null : selected);
    }, [activeIdx, templatesWithNone, startNewWorkoutFromTemplate]);

    // Stable handlers to avoid re-rendering StartCluster on every parent render
    const openNewWorkout = useCallback(() => setIsNewWorkoutVisible(true), [setIsNewWorkoutVisible]);
    const openFriends = useCallback(() => {
        setFriendsSheetVisible(true);
        setFriendsSheetToggle((f) => !f);
    }, []);

    const openDayDetailsToday = useCallback(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setDaySheetDate(today);
        setDaySheetSession((prev) => prev + 1);
        setDaySheetVisible(true);
        setDaySheetToggle((f) => !f);
    }, [setDaySheetDate, setDaySheetSession, setDaySheetVisible, setDaySheetToggle]);

    // Header prop identities kept stable to avoid header re-renders
    const headerScrollToTop = useCallback(() => { }, []);
    const headerOpenCurrentWorkout = useCallback(() => setIsNewWorkoutVisible(true), [setIsNewWorkoutVisible]);
    const headerWorkoutObj = useMemo(() => (workoutWid ? { wid: workoutWid } : null), [workoutWid]);
    const onBackPress = useCallback(() => navigation?.goBack?.(), [navigation]);
    const toMessagesScreenCb = useCallback(() => {
        if (global.userData && messages) {
            navigation?.navigate("Messages", { userData: global.userData, messages, returnTo: 'Workout' });
        } else {
            navigation?.navigate("Messages", { returnTo: 'Workout' });
        }
    }, [navigation, messages]);
    const toggleNotifications = useCallback(() => setNotificationsBottomSheetExpandFlag((f) => !f), []);

    const onFriendsClose = useCallback(() => setFriendsSheetVisible(false), []);
    const onFriendsJoin = useCallback((item) => {
        setFriendsSheetVisible(false);
        Alert.alert("Join Workout", `Joining ${item.name}'s live session…`);
    }, []);
    const onFriendsView = useCallback((item) => {
        setFriendsSheetVisible(false);
        Alert.alert("Workout", `Opening ${item.name}'s workout (${item.duration} min)…`);
    }, []);
    const onConsumedFocusCb = useCallback(() => { setFocusFriendUid(null); setFocusWorkoutWid(null); }, []);

    const showGroupModalCb = useCallback(() => setInviteSheetOpen(true), []);
    const registerInviteHandlerCb = useCallback((fn) => { inviteHandlerRef.current = fn; }, []);
    const closeGroupModalCb = useCallback(() => setInviteSheetOpen(false), []);
    const onInviteCb = useCallback((users) => {
        const fn = inviteHandlerRef.current;
        if (typeof fn === 'function') {
            try { fn(users); } catch (e) { console.log('invite error', e); }
        }
        setInviteSheetOpen(false);
    }, []);

    /* ---------- Day sheet + meals ---------- */
    const [daySheetToggle, setDaySheetToggle] = useState(false);
    const [daySheetVisible, setDaySheetVisible] = useState(false);
    const [daySheetSession, setDaySheetSession] = useState(0);
    const [daySheetDate, setDaySheetDate] = useState(null);
    const sheetDate = useMemo(() => daySheetDate ?? stableToday, [daySheetDate, stableToday]);
    const sheetFromGlobal = useMemo(() => {
        const dk = toDayKey(sheetDate);
        const map = global?.userData?.loggedFoods || {};
        const buckets = { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
        const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        try {
            const looksNested = map && typeof map === 'object' && map[dk] && !('dayKey' in (Object.values(map)[0] || {}));
            const source = looksNested ? (map[dk] || {}) : map;
            Object.entries(source || {}).forEach(([id, e]) => {
                const sameDay = looksNested ? true : (String(e?.dayKey || '') === dk);
                if (!sameDay) return;
                const meal = String(e?.meal || '').toLowerCase();
                const bucket = meal.startsWith('break') ? 'Breakfast' : meal.startsWith('lun') ? 'Lunch' : meal.startsWith('din') ? 'Dinner' : 'Snacks';
                const qty = typeof e?.quantity === 'number' ? e.quantity : 1;
                const m = e?.macros || {};
                const macros = {
                    calories: Number(m.calories) || 0,
                    protein: Number(m.protein) || 0,
                    carbs: Number(m.carbs) || 0,
                    fat: Number(m.fat) || 0,
                };
                buckets[bucket].push({ key: id, name: e?.name || 'Food', brand: e?.brand || '', desc: e?.desc || '', quantity: qty, foodId: e?.foodId || '', macros });
                totals.calories += macros.calories; totals.protein += macros.protein; totals.carbs += macros.carbs; totals.fat += macros.fat;
            });
        } catch {}
        return { meals: buckets, totals: { calories: Math.round(totals.calories), protein: Math.round(totals.protein), carbs: Math.round(totals.carbs), fat: Math.round(totals.fat) } };
    }, [sheetDate, global?.__loggedFoodsSig]);
    const sheetMeals = sheetFromGlobal.meals;
    const sheetTotals = sheetFromGlobal.totals;
    const dayWorkouts = useMemo(() => {
        const dk = toDayKey(sheetDate);
        const completed = Array.isArray(global?.userData?.completedWorkouts) ? global.userData.completedWorkouts : [];
        const active = global?.userData?.currentWorkout ? [global.userData.currentWorkout] : [];
        return [...completed, ...active]
            .filter((w) => { const when = toMillis(w?.created ?? w?.createdAt); return when && toDayKey(when) === dk; })
            .sort((a, b) => toMillis(b?.created ?? b?.createdAt) - toMillis(a?.created ?? a?.createdAt));
    }, [sheetDate]);

    /* ---------- Header height (for banner anchoring) ---------- */
    const [headerHeight, setHeaderHeight] = useState(0);
    const onHeaderLayout = useCallback((e) => {
        const h = e?.nativeEvent?.layout?.height || 0;
        if (h && h !== headerHeight) setHeaderHeight(h);
    }, [headerHeight]);

    /* ---------- force header rerender when workout clears ---------- */
    // Header renders once; suggestions and timer update via refs and effects

    /* ---------- Invites banner (shared hook) ---------- */
    const {
        currentInvite,
        inviterPfpUri,
        bannerY,
        handleInviteLayout,
        accept: acceptInvite,
        decline: declineInvite,
    } = useWorkoutInvites({
        uid,
        onAccepted: async (wid, seed) => {
            try { global.isCurrentlyWorkingOut = true; } catch { }
            try {
                if (typeof joinExternalWorkout === "function") {
                    // Allow joinExternalWorkout to preserve any existing active workout
                    await joinExternalWorkout({ wid, seedWorkout: seed || null, inviterUid: currentInvite?.fromUid });
                }
            } catch (e) {
                console.log('join onAccepted error', e?.message || e);
            }
        },
    });

    /* ---------------- render ---------------- */
    return (
        <SafeAreaView style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            {/* Header measured for anchoring */}
            <View onLayout={onHeaderLayout}>
                <FeedHeader
                    toMessagesScreen={toMessagesScreenCb}
                    onOpenNotifications={toggleNotifications}
                    backButton={false}
                    onBackPress={onBackPress}
                    scrollToTop={headerScrollToTop}
                    navigation={navigation}
                    allUsersRef={allUsersRef}
                    workout={headerWorkoutObj}
                    timerRef={timerRef}
                    openCurrentWorkout={headerOpenCurrentWorkout}
                />
            </View>
            {/* Invite banner (absolute, anchored below header & within SafeArea) */}
            <Animated.View
                style={[
                    styles.inviteBannerWrap,
                    { top: scaleSize(headerHeight + 10), transform: [{ translateY: bannerY }] },
                ]}
                pointerEvents={currentInvite ? "auto" : "none"}
                onLayout={handleInviteLayout}
            >
                {currentInvite && (
                    <InviteBanner
                        invite={currentInvite}
                        pfpUri={inviterPfpUri}
                        onAccept={acceptInvite}
                        onDecline={declineInvite}
                    />
                )}
            </Animated.View>
            <View style={styles.content}>
                {/* WeekCalendar temporarily disabled */}

                <TribeStatsCard onPress={openFriends} />
                {/* Hub row */}
                <View>
                    <HubRow
                        afterPaint={afterPaint}
                        fill={fill}
                        todayCalories={todayCalories}
                        caloriesGoal={caloriesGoal}
                        workoutsThisWeek={workoutsThisWeek}
                        weeklyGoal={weeklyGoal}
                        onPress={openDayDetailsToday}
                    />
                </View>
                {/* Templates rail relocated near Start cluster */}
            </View>
            <View style={styles.templatesDock} pointerEvents="box-none">
                <View style={styles.templatesWrap} pointerEvents="auto">
                    <View style={styles.templatesDivider}>
                        <SectionDivider
                            containerBg={theme.bg}
                            dashColor="rgba(255,255,255,0.22)"
                            dotColor="#ffffff2d"
                        />
                    </View>
                    {afterPaint && (
                        <View style={styles.templatesRailShell}>
                            <TemplatesRail
                                templates={templatesWithNone}
                                onIndexChange={setActiveIdx}
                                onAddTemplate={initTemplateAndToggle}
                                onOpenTemplate={openEditTemplateAndToggle}
                            />
                        </View>
                    )}
                </View>
            </View>
            {/* START cluster */}
            <View style={styles.clusterWrap} pointerEvents="box-none">
                <StartCluster
                    scaleAnim={scaleAnim}
                    hasActiveWorkout={hasActiveWorkout}
                    onStartWorkout={onStartWorkout}
                    onOpenNewWorkout={openNewWorkout}
                />
            </View>
            <Footer currentScreenName={"Workout"} navigation={navigation} />
            {/* Notifications (same UX as Feed) */}
            {afterPaint && (
                <NotificationsBottomSheet notificationsBottomSheetExpandFlag={notificationsBottomSheetExpandFlag} />
            )}
            {/* Day details (open via History button) */}
            {(afterPaint || daySheetVisible) && (
                <View style={StyleSheet.absoluteFill} pointerEvents={daySheetVisible ? "auto" : "none"}>
                    <DayDetailsSheet
                        visible={daySheetVisible}
                        openToggle={daySheetToggle}
                        date={sheetDate}
                        session={daySheetSession}
                        workouts={dayWorkouts}
                        meals={sheetMeals}
                        totals={sheetTotals}
                        calories={sheetTotals?.calories || 0}
                        workoutOn={(dayWorkouts?.length || 0) > 0}
                        onClose={(closingSession) => {
                            setDaySheetVisible((prev) => {
                                if (closingSession == null) return false;
                                return closingSession === daySheetSession ? false : prev;
                            });
                        }}
                        onChangeDate={(d) => {
                            // No prefetch: macros derive from global.userData.loggedFoods only
                            try {
                                const nd = new Date(d);
                                if (!Number.isNaN(nd.getTime())) nd.setHours(0, 0, 0, 0);
                                setDaySheetDate(nd);
                            } catch { setDaySheetDate(d); }
                            // Keep sheet open; no re-expand
                        }}
                        onStartWorkout={onStartWorkout}
                        onOpenMacros={() => {
                            setDaySheetVisible(false);
                            try {
                                const rootNav = navigation?.getParent?.('ROOT');
                                // Pass the selected day to MacroTracking so it focuses the correct date
                                let focusTs = null;
                                try {
                                    const nd = new Date(sheetDate);
                                    if (!Number.isNaN(nd.getTime())) { nd.setHours(0, 0, 0, 0); focusTs = nd.getTime(); }
                                } catch { }
                                const params = focusTs ? { transition: 'slide-from-left', focusDate: focusTs } : { transition: 'slide-from-left' };
                                if (rootNav?.navigate) rootNav.navigate('MacroTracking', params);
                                else navigation.navigate('MacroTracking', params);
                            } catch { }
                        }}
                    />
                </View>
            )}
            {/* Friends sheet */}
            {(afterPaint || friendsSheetVisible) && (
                <View style={StyleSheet.absoluteFill} pointerEvents={friendsSheetVisible ? "auto" : "none"}>
                    <FriendsActivitySheet
                        visible={friendsSheetVisible}
                        openToggle={friendsSheetToggle}
                        focusUid={focusFriendUid}
                        focusWid={focusWorkoutWid}
                        onConsumedFocus={onConsumedFocusCb}
                        items={friendsActivity}
                        lastViewedAt={user?.friendsActivityLastViewedAt}
                        onViewed={markFriendsViewed}
                        onClose={onFriendsClose}
                        onCopyTemplate={handleCopyTemplate}
                        onJoin={onFriendsJoin}
                        onView={onFriendsView}
                    />
                </View>
            )}
            {/* New Workout sheet */}
            {(afterPaint || isNewWorkoutVisible) && (
                <NewWorkoutBottomSheet
                    cancelNewWorkout={cancelWorkout}
                    updateNewWorkout={updateNewWorkout}
                    finishNewWorkout={finishWorkout}
                    isVisible={isNewWorkoutVisible}
                    setIsVisible={setIsNewWorkoutVisible}
                    timerRef={timerRef}
                    showGroupModal={showGroupModalCb}
                    registerInviteHandler={registerInviteHandlerCb}
                    userWorkoutStats={global?.userData?.statsExercises || {}}
                />
            )}
            {/* Template editor (kept identical behavior) */}
            {(afterPaint || isEditTemplateVisible) && (
                <EditTemplateBottomSheet
                    isVisible={isEditTemplateVisible}
                    setIsVisible={setIsEditTemplateVisible}
                    openToggle={editSheetToggle}
                    openedTemplateRef={openedTemplateRef}
                    updateTemplate={updateTemplate}
                    deleteTemplate={deleteTemplate}
                />
            )}
            {isSummaryModalVisible && (
                <WorkoutSummaryModal
                    isVisible={isSummaryModalVisible}
                    workout={completedWorkout}
                    onClose={handleSummaryClose}
                    postWorkout={postWorkout}
                />
            )}
            {/* Stats after workout bottom sheet (exact UserStats UI, animated numbers) */}
            {hexChangeVisible && (
                <UserStatsAfterWorkoutSheet
                    visible={hexChangeVisible}
                    onClose={() => setHexChangeVisible(false)}
                    user={user}
                    fromHexagon={hexFrom}
                    toHexagon={hexTo}
                    heightPercent={0.92}
                />
            )}
            {/* Copy Template toast (above Templates rail) */}
            <Animated.View pointerEvents="none" style={styles.toastWrap}>
                <CopyTemplateToast anim={toastAnim} text={toastMsg || "Template added"} />
            </Animated.View>
            {/* Invite picker mounted at screen level so backdrop covers everything */}
            {(afterPaint || inviteSheetOpen) && (
                <GroupModalBottomSheet
                    groupModalExpandFlag={inviteSheetOpen}
                    closeGroupModal={closeGroupModalCb}
                    onInvite={onInviteCb}
                />
            )}
        </SafeAreaView>
    );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
    // MyFitnessPal-like dark background
    root: { flex: 1, backgroundColor: theme.bg },
    content: { flex: 1, paddingTop: scaleSize(2), paddingBottom: scaleSize(FOOTER_HEIGHT + ss(22) + BTN_SIZE + TPL_BOTTOM_GAP) },

    templatesDock: {
        position: "absolute",
        left: 0,
        right: 0, 
        bottom: scaleSize(FOOTER_HEIGHT + ss(57) + BTN_SIZE + TPL_BOTTOM_GAP),
        alignItems: "center",
    },
    templatesWrap: { width: "100%", alignItems: "center" },
    templatesDivider: { width: "100%", alignItems: "center", marginTop: DIVIDER_ADJUST },
    templatesRailShell: { width: "100%" },
    clusterWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: scaleSize(FOOTER_HEIGHT + ss(37)),
        alignItems: "center",
    },

    // Invite banner wrapper (same positioning/animation as original)
    inviteBannerWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        zIndex: 30,
        alignItems: "center",
    },
    // Toast positioned above Templates rail
    toastWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: scaleSize(FOOTER_HEIGHT + ss(22) + BTN_SIZE + TPL_BOTTOM_GAP + TPL_HEIGHT + ss(10)),
        alignItems: "center",
        zIndex: 40,
    },
});
