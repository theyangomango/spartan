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
    Modal,
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
import GroupModalBottomSheet from "../components/3_Workout/NewWorkout/Group/GroupModalBottomSheet";
import EditTemplateBottomSheet from "../components/3_Workout/Template/EditTemplateBottomSheet";
import WorkoutSummaryModal from "../components/3_Workout/WorkoutSummaryModal";
import DayDetailsSheet from "../components/3_Workout/DayDetailsSheet";
import CommunityActivitySheet from "../components/3_Workout/CommunityActivitySheet";
import InviteBanner from "../components/3_Workout/InviteBanner";
import UserStatsAfterWorkoutSheet from "../components/2_Competition/UserStats/UserStatsAfterWorkoutSheet";
import UserStatsBottomSheet from "../components/2_Competition/UserStats/UserStatsBottomSheet";
import { onHexagonUpdate } from "../utils/hexagonEvents";

// Theme & Hooks (project)
import {
    ss,
    FOOTER_HEIGHT,
    BTN_SIZE,
    TPL_BOTTOM_GAP,
    TPL_HEIGHT,
    TPL_DIVIDER_MARGIN_TOP,
    TPL_DIVIDER_MARGIN_BOTTOM,
} from "../components/3_Workout/sections/workoutTheme";
import theme from "../theme/mfpDark";
// Remove foodLogs dependency; compute macros from global.userData.loggedFoods only
import useResolvedUid from "../hooks/useResolvedUid";
import useUserDoc from "../hooks/useUserDoc";
import useCommunityActivity from "../hooks/useCommunityActivity";
import useTemplates from "../hooks/useTemplates";
import useHeaderSearchUsers from "../hooks/useHeaderSearchUsers";
import useWorkoutInvites from "../hooks/useWorkoutInvites";

// Backend utils
import updateDoc from "../../backend/helper/firebase/updateDoc";
import makeID from "../../backend/helper/makeID";

// Local logic
import useWorkoutManager from "../logic/useWorkoutManager";
import useWorkoutStore, { WORKOUT_SHEET_STATES } from "../state/workoutStore";

// utils
import millisToHoursMinutesSeconds from "../helper/millisToHoursMinutesSeconds";
import { initUserFeed, registerFeedSetters } from "../helper/initUserFeed";
import { getMessagesCache, subscribeMessagesCache } from "../state/messagesCache";

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

const makeEmptyMeals = () => ({
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Snacks: [],
});

const makeEmptyTotals = () => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });

const makeEmptyDaySheetSnapshot = () => ({
    meals: makeEmptyMeals(),
    totals: makeEmptyTotals(),
    workouts: [],
});

const normalizeMealBucket = (meal) => {
    const key = String(meal || '').toLowerCase();
    if (key.startsWith('break')) return 'Breakfast';
    if (key.startsWith('lun')) return 'Lunch';
    if (key.startsWith('din')) return 'Dinner';
    return 'Snacks';
};

const buildDaySheetSnapshot = ({ date, loggedFoods, completedWorkouts, activeWorkout }) => {
    const dayKey = toDayKey(date);
    const meals = makeEmptyMeals();
    const totals = makeEmptyTotals();

    try {
        const map = loggedFoods && typeof loggedFoods === 'object' ? loggedFoods : {};
        const firstValue = Object.values(map || {})[0] || {};
        const looksNested = map && typeof map === 'object' && map[dayKey] && !('dayKey' in firstValue);
        const source = looksNested ? (map[dayKey] || {}) : map;

        Object.entries(source || {}).forEach(([id, entry]) => {
            const sameDay = looksNested ? true : (String(entry?.dayKey || '') === dayKey);
            if (!sameDay) return;
            const bucket = normalizeMealBucket(entry?.meal);
            const qty = typeof entry?.quantity === 'number' ? entry.quantity : 1;
            const macrosRaw = entry?.macros || {};
            const macros = {
                calories: Number(macrosRaw.calories) || 0,
                protein: Number(macrosRaw.protein) || 0,
                carbs: Number(macrosRaw.carbs) || 0,
                fat: Number(macrosRaw.fat) || 0,
            };
            meals[bucket].push({
                key: id,
                name: entry?.name || 'Food',
                brand: entry?.brand || '',
                desc: entry?.desc || '',
                quantity: qty,
                foodId: entry?.foodId || '',
                macros,
            });
            totals.calories += macros.calories;
            totals.protein += macros.protein;
            totals.carbs += macros.carbs;
            totals.fat += macros.fat;
        });
    } catch {}

    const completed = Array.isArray(completedWorkouts) ? completedWorkouts : [];
    const fallbackActive = (() => {
        try { return global?.userData?.currentWorkout || null; } catch { return null; }
    })();
    const activeList = [];
    if (activeWorkout) activeList.push(activeWorkout);
    else if (fallbackActive) activeList.push(fallbackActive);

    const workouts = [...completed, ...activeList]
        .filter((w) => {
            const created = toMillis(w?.created ?? w?.createdAt ?? w?.finishedAt);
            return created && toDayKey(created) === dayKey;
        })
        .sort((a, b) => toMillis(b?.created ?? b?.createdAt ?? b?.finishedAt) - toMillis(a?.created ?? a?.createdAt ?? a?.finishedAt));

    return {
        meals,
        totals: {
            calories: Math.round(totals.calories),
            protein: Math.round(totals.protein),
            carbs: Math.round(totals.carbs),
            fat: Math.round(totals.fat),
        },
        workouts,
    };
};

export default function Workout({ navigation, route }) {
    /* ---------- resolve uid & user ---------- */
    const uid = useResolvedUid(route);
    const [messages, setMessages] = useState(() => getMessagesCache());
    const [footerKeyDummy, setFooterKeyDummy] = useState(0);
    const hubRowRef = useRef(null);
    const dividerRef = useRef(null);
    const templatesRailRef = useRef(null);
    const [hubMetrics, setHubMetrics] = useState(null);
    const [dividerMetrics, setDividerMetrics] = useState(null);
    const [templatesMetrics, setTemplatesMetrics] = useState(null);
    const [dividerSpacing, setDividerSpacing] = useState(() => ({
        top: TPL_DIVIDER_MARGIN_TOP,
        bottom: TPL_DIVIDER_MARGIN_BOTTOM,
    }));
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
    useEffect(() => {
        const unsubscribe = subscribeMessagesCache((snapshot) => {
            setMessages(snapshot);
        });
        return unsubscribe;
    }, []);
    const user = useUserDoc(uid, { ignoreKeys: ['currentWorkout'] }); // avoid rerenders on workout typing

    const measureRef = useCallback((ref, setter) => {
        requestAnimationFrame(() => {
            const node = ref?.current;
            if (!node || typeof node.measure !== 'function') return;
            node.measure((x, y, width, height, pageX, pageY) => {
                setter((prev) => {
                    if (
                        prev
                        && Math.abs(prev.pageY - pageY) < 0.5
                        && Math.abs(prev.height - height) < 0.5
                        && Math.abs(prev.pageX - pageX) < 0.5
                        && Math.abs(prev.width - width) < 0.5
                    ) {
                        return prev;
                    }
                    return { x, y, width, height, pageX, pageY };
                });
            });
        });
    }, []);

    const handleHubLayout = useCallback(() => {
        measureRef(hubRowRef, setHubMetrics);
    }, [measureRef]);

    const handleDividerLayout = useCallback(() => {
        measureRef(dividerRef, setDividerMetrics);
    }, [measureRef]);

    const handleTemplatesLayout = useCallback(() => {
        measureRef(templatesRailRef, setTemplatesMetrics);
    }, [measureRef]);

    useEffect(() => {
        if (!hubMetrics || !templatesMetrics || !dividerMetrics) return;
        const hubBottom = hubMetrics.pageY + hubMetrics.height;
        const templatesTop = templatesMetrics.pageY;
        const dividerHeight = dividerMetrics.height;
        if (!Number.isFinite(hubBottom) || !Number.isFinite(templatesTop) || !Number.isFinite(dividerHeight)) return;

        const gap = templatesTop - hubBottom;
        if (!Number.isFinite(gap) || gap <= 0) return;

        const available = gap - dividerHeight;
        if (!Number.isFinite(available)) return;

        if (available <= 0) {
            setDividerSpacing((prev) => {
                if (!prev || (prev.top === 0 && prev.bottom === 0)) return prev;
                return { top: 0, bottom: 0 };
            });
            return;
        }

        const halfGap = available / 2;
        if (!Number.isFinite(halfGap)) return;

        const nextTop = halfGap;
        const nextBottom = Math.max(0, available - halfGap);

        setDividerSpacing((prev) => {
            if (
                prev
                && Math.abs((prev.top ?? 0) - nextTop) < 0.5
                && Math.abs((prev.bottom ?? 0) - nextBottom) < 0.5
            ) {
                return prev;
            }
            return { top: nextTop, bottom: nextBottom };
        });
    }, [hubMetrics, templatesMetrics, dividerMetrics]);

    const dividerSpacingStyle = useMemo(() => ({
        marginTop: dividerSpacing.top,
        marginBottom: dividerSpacing.bottom,
    }), [dividerSpacing]);

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
    const [hasMountedFriendsSheet, setHasMountedFriendsSheet] = useState(false);
    const [hasMountedEditTemplateSheet, setHasMountedEditTemplateSheet] = useState(false);
    const [hasMountedDaySheet, setHasMountedDaySheet] = useState(false);
    const [hasMountedGroupModal, setHasMountedGroupModal] = useState(false);
    const [isUserStatsVisible, setIsUserStatsVisible] = useState(false);
    const [showTribeCard, setShowTribeCard] = useState(false);
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => setAfterPaint(true));
        });
        return () => task?.cancel?.();
    }, []);

    const handleHubRowReady = useCallback(() => {
        if (hubRowReadyNotifiedRef.current) return;
        hubRowReadyNotifiedRef.current = true;
        requestAnimationFrame(() => {
            try { global.__markHubRowReady?.(); } catch {}
        });
    }, []);

    useEffect(() => {
        if (!afterPaint) return;
        const id = setTimeout(() => setShowTribeCard(true), 0);
        return () => clearTimeout(id);
    }, [afterPaint]);

    useEffect(() => {
        if (!afterPaint) return;
        const timers = [
            setTimeout(() => setHasMountedFriendsSheet(true), 120),
            setTimeout(() => setHasMountedDaySheet(true), 160),
            setTimeout(() => setHasMountedEditTemplateSheet(true), 200),
            setTimeout(() => setHasMountedGroupModal(true), 240),
        ];
        return () => { timers.forEach((id) => clearTimeout(id)); };
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
        const activityGoal = ACTIVITY_WEEKLY_GOAL[activityKey] ?? DEFAULT_WEEKLY_GOAL;
        const storedGoalRaw = Number(user?.weeklyWorkoutGoal);
        const storedGoal = Number.isFinite(storedGoalRaw) ? Math.round(storedGoalRaw) : 0;
        const derivedGoal = storedGoal > 0 ? storedGoal : activityGoal;
        return {
            workoutsThisWeek: completed,
            weeklyGoal: derivedGoal,
        };
    }, [user?.completedWorkouts, user?.personalInfo?.activity, user?.weeklyWorkoutGoal]);

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
    const toastTimeoutRef = useRef(null);
    const [toastPortalVisible, setToastPortalVisible] = useState(false);
    const saveTemplatePendingRef = useRef(false);
    const [toastMsg, setToastMsg] = useState("");
    const showTemplateToast = useCallback((msg) => {
        setToastMsg(msg || "Template added");
        setToastPortalVisible(true);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        Animated.sequence([
            Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.delay(1800),
            Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
        toastTimeoutRef.current = setTimeout(() => {
            setToastPortalVisible(false);
            toastTimeoutRef.current = null;
        }, 2200);
    }, [toastAnim]);

    useEffect(() => () => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }
    }, []);

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

    /* ---------- community activity ---------- */
    const { items: communityActivity, refresh: refreshFriends, loading: friendsLoading } = useCommunityActivity(user, afterPaint);
    const [friendsSheetVisible, setFriendsSheetVisible] = useState(false);
    const [friendsSheetToggle, setFriendsSheetToggle] = useState(false);
    const [focusFriendUid, setFocusFriendUid] = useState(null);
    const [focusWorkoutWid, setFocusWorkoutWid] = useState(null);
    useEffect(() => {
        if (!afterPaint) return;
        let cancelled = false;
        const task = InteractionManager.runAfterInteractions(() => {
            if (!cancelled) refreshFriends();
        });
        return () => {
            cancelled = true;
            try { task?.cancel?.(); } catch { }
        };
    }, [afterPaint, refreshFriends]);
    useEffect(() => {
        if (!friendsSheetVisible) return;
        let cancelled = false;
        const task = InteractionManager.runAfterInteractions(() => {
            if (!cancelled) refreshFriends();
        });
        return () => {
            cancelled = true;
            try { task?.cancel?.(); } catch { }
        };
    }, [friendsSheetVisible, refreshFriends]);

    useEffect(() => {
        if (friendsSheetVisible) setHasMountedFriendsSheet(true);
    }, [friendsSheetVisible]);
    useEffect(() => {
        if (daySheetVisible) setHasMountedDaySheet(true);
    }, [daySheetVisible]);
    useEffect(() => {
        if (isEditTemplateVisible) setHasMountedEditTemplateSheet(true);
    }, [isEditTemplateVisible]);
    useEffect(() => {
        if (inviteSheetOpen) setHasMountedGroupModal(true);
    }, [inviteSheetOpen]);
    // Avoid "flash of new" before user doc loads by gating on user readiness.
    const userLoaded = user != null; // useUserDoc returns null until first snapshot
    const lastViewedAtMs = userLoaded
        ? ((user?.friendsActivityLastViewedAt?.toMillis?.() ||
            new Date(user?.friendsActivityLastViewedAt || 0).getTime()) || 0)
        : Number.POSITIVE_INFINITY; // while loading, treat as already up-to-date so nothing appears new

    /* ---------- Workout Manager (state + persistence + timer) ---------- */
    // Track last consumed global open signal
    const openSignalRef = useRef(0);
    const pendingInviteJoinRef = useRef(0);
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
        joinExternalWorkout, // used by InviteBanner accept
    } = useWorkoutManager({ uid, navigation, millisToHMS: millisToHoursMinutesSeconds });

    const setSheetHandlers = useWorkoutStore((s) => s.setSheetHandlers);

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

    const handleSaveSummaryTemplate = useCallback(async () => {
        const workout = completedWorkout;
        if (!workout || saveTemplatePendingRef.current) return;
        const hasTemplate =
            workout?.tid != null ||
            workout?.templateId != null ||
            (workout?.template && workout.template.tid != null);
        if (hasTemplate || !uid) return;

        saveTemplatePendingRef.current = true;
        try {
            const tid = makeID();
            const exercises = (Array.isArray(workout?.exercises) ? workout.exercises : []).map((ex) => ({
                name: ex?.name || "",
                muscle: ex?.muscle || "",
                sets: (Array.isArray(ex?.sets) ? ex.sets : []).map((s) => ({
                    weight: Number(s?.weight) || 0,
                    reps: Number(s?.reps) || 0,
                    type: (() => {
                        const raw = typeof s?.type === "string" ? s.type.toLowerCase() : "";
                        return raw === "warmup" || raw === "dropset" || raw === "failure" ? raw : null;
                    })(),
                })),
            }));
            const newTemplate = { id: tid, tid, name: "New Template", exercises, lastDate: null };
            const prevFromUser = Array.isArray(user?.templates) ? user.templates : null;
            const prevFromGlobal = (() => {
                try {
                    return Array.isArray(global?.userData?.templates) ? [...global.userData.templates] : null;
                } catch {
                    return null;
                }
            })();
            const prev = prevFromUser || prevFromGlobal || [];
            const next = [...prev, newTemplate];

            try {
                await updateDoc("users", uid, { templates: next });
            } catch (err) {
                console.log("handleSaveSummaryTemplate updateDoc error", err);
            }

            try {
                global.userData = { ...(global.userData || {}), templates: next };
                global.__templatesLocalSig = JSON.stringify(next || []);
                global.__templatesDirty = true;
            } catch {
                // ignore global sync issues
            }

            showTemplateToast("Template saved ✓");
        } catch (err) {
            console.log("handleSaveSummaryTemplate error", err);
        } finally {
            saveTemplatePendingRef.current = false;
            handleSummaryClose();
        }
    }, [completedWorkout, handleSummaryClose, uid, user?.templates, showTemplateToast]);

    const hasActiveWorkout = useWorkoutStore((s) => !!s.workout);
    const workoutWid = useWorkoutStore((s) => (s.workout ? s.workout.wid : null));
    const activeWorkout = useWorkoutStore((s) => s.workout);
    // Header search users (shared hook)
    const headerFollowing = useMemo(() => {
        try {
            const list = global?.userData?.following;
            return Array.isArray(list) ? [...list] : [];
        } catch {
            return [];
        }
    }, [user?.following]);
    const { allUsersRef, mergeUsersIntoRef } = useHeaderSearchUsers({ following: headerFollowing, enablePrefetch: afterPaint });

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

            const pending = (() => {
                try { return global?.__pendingWorkoutJoin || null; } catch { return null; }
            })();
            if (pending && pending.wid) {
                const joinSig = Number(pending.ts || Date.now());
                if (pendingInviteJoinRef.current !== joinSig) {
                    pendingInviteJoinRef.current = joinSig;
                    try { global.__pendingWorkoutJoin = null; } catch {}
                    try {
                        const res = joinExternalWorkout?.({ wid: String(pending.wid), seedWorkout: pending.seedWorkout || null, inviterUid: pending.inviterUid || null });
                        if (res && typeof res.then === 'function') {
                            res.catch?.((err) => console.log('pending workout join error', err?.message || err));
                        }
                    } catch (err) {
                        console.log('pending workout join error', err?.message || err);
                    }
                }
            }
        }, [route?.params?.openCurrent, route?.params?.openFriends, route?.params?.focusFriendUid, route?.params?.focusWorkoutWid, hasActiveWorkout, navigation, joinExternalWorkout])
    );

    /* ---------- New workout from current template selection ---------- */
    const onStartWorkout = useCallback((privacyMode) => {
        const selected = templatesWithNone[Math.max(0, Math.min(activeIdx, templatesWithNone.length - 1))];
        startNewWorkoutFromTemplate(selected?.isNone ? null : selected, { privacyMode });
    }, [activeIdx, templatesWithNone, startNewWorkoutFromTemplate]);

    // Stable handlers to avoid re-rendering StartCluster on every parent render
    const openNewWorkout = useCallback(() => {
        setIsNewWorkoutVisible(true);
        try {
            const store = useWorkoutStore.getState();
            store.setSheetState(WORKOUT_SHEET_STATES.EXPANDED);
        } catch {
            // no-op if store unavailable
        }
    }, [setIsNewWorkoutVisible]);
    const openFriends = useCallback(() => {
        setHasMountedFriendsSheet(true);
        setFriendsSheetVisible(true);
        setFriendsSheetToggle((f) => !f);
    }, [setHasMountedFriendsSheet, setFriendsSheetVisible, setFriendsSheetToggle]);

    const openDayDetailsToday = useCallback(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setHasMountedDaySheet(true);
        setDaySheetDate(today);
        hydrateDaySheetData(today);
        setDaySheetSession((prev) => prev + 1);
        setDaySheetVisible(true);
        setDaySheetToggle((f) => !f);
    }, [setHasMountedDaySheet, setDaySheetDate, hydrateDaySheetData, setDaySheetSession, setDaySheetVisible, setDaySheetToggle]);

    const openUserStats = useCallback(() => {
        setIsUserStatsVisible(true);
    }, []);

    const openCreatePost = useCallback(() => {
        try {
            navigation?.navigate('SelectPhotos', { userData: global?.userData || {} });
        } catch {
            try { navigation?.navigate('SelectPhotos'); } catch { }
        }
    }, [navigation]);

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
    const toggleNotifications = useCallback(() => {
        try {
            navigation?.navigate?.('Notifications', { transition: 'slide-from-right' });
        } catch {}
    }, [navigation]);

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

    const showGroupModalCb = useCallback(() => {
        setHasMountedGroupModal(true);
        setInviteSheetOpen(true);
    }, [setHasMountedGroupModal, setInviteSheetOpen]);
    const registerInviteHandlerCb = useCallback((fn) => { inviteHandlerRef.current = fn; }, []);
    const closeGroupModalCb = useCallback(() => setInviteSheetOpen(false), []);
    const onInviteCb = useCallback((users) => {
        const fn = inviteHandlerRef.current;
        if (typeof fn === 'function') {
            try { fn(users); } catch (e) { console.log('invite error', e); }
        }
        setInviteSheetOpen(false);
    }, []);

    useEffect(() => {
        if (!setSheetHandlers) return;
        setSheetHandlers({
            cancelWorkout,
            updateWorkout: updateNewWorkout,
            finishWorkout,
            showGroupModal: showGroupModalCb,
            registerInviteHandler: registerInviteHandlerCb,
            timerRef,
            setIsVisible: setIsNewWorkoutVisible,
            getUserWorkoutStats: () => global?.userData?.statsExercises || {},
        });
        return () => {
            setSheetHandlers({
                cancelWorkout: () => {},
                updateWorkout: () => {},
                finishWorkout: () => {},
                showGroupModal: () => {},
                registerInviteHandler: () => {},
                timerRef: null,
                setIsVisible: () => {},
                getUserWorkoutStats: () => ({}),
            });
        };
    }, [
        setSheetHandlers,
        cancelWorkout,
        updateNewWorkout,
        finishWorkout,
        showGroupModalCb,
        registerInviteHandlerCb,
        timerRef,
        setIsNewWorkoutVisible,
    ]);

    /* ---------- Day sheet + meals ---------- */
    const [daySheetToggle, setDaySheetToggle] = useState(false);
    const [daySheetVisible, setDaySheetVisible] = useState(false);
    const [daySheetSession, setDaySheetSession] = useState(0);
    const [daySheetDate, setDaySheetDate] = useState(null);
    const [daySheetData, setDaySheetData] = useState(() => makeEmptyDaySheetSnapshot());
    const sheetDate = useMemo(() => daySheetDate ?? stableToday, [daySheetDate, stableToday]);
    const loggedFoodsSig = (() => {
        try { return global?.__loggedFoodsSig; } catch { return undefined; }
    })();
    const completedWorkoutsSig = useMemo(() => {
        try {
            const arr = global?.userData?.completedWorkouts;
            if (!Array.isArray(arr) || arr.length === 0) return 'len:0';
            const last = arr[arr.length - 1];
            const ts = toMillis(last?.created ?? last?.createdAt ?? last?.finishedAt ?? 0);
            return `len:${arr.length}:last:${ts}`;
        } catch {
            return 'len:0';
        }
    }, [user?.completedWorkouts]);
    const hydrateDaySheetData = useCallback((targetDate) => {
        const globalData = (() => {
            try { return global?.userData || {}; } catch { return {}; }
        })();
        const snapshot = buildDaySheetSnapshot({
            date: targetDate,
            loggedFoods: globalData.loggedFoods || {},
            completedWorkouts: Array.isArray(user?.completedWorkouts) ? user.completedWorkouts : globalData.completedWorkouts,
            activeWorkout,
        });
        setDaySheetData(snapshot);
        return snapshot;
    }, [activeWorkout, user?.completedWorkouts, loggedFoodsSig, completedWorkoutsSig]);
    useEffect(() => {
        if (!daySheetVisible) return;
        hydrateDaySheetData(sheetDate);
    }, [daySheetVisible, sheetDate, hydrateDaySheetData]);
    const daySheetMeals = daySheetData.meals || makeEmptyMeals();
    const daySheetTotals = daySheetData.totals || makeEmptyTotals();
    const daySheetWorkouts = Array.isArray(daySheetData.workouts) ? daySheetData.workouts : [];

    const hubRowDataHydrated = (() => {
        try { return !!global?.__userDocHydrated; } catch { return false; }
    })();

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
        enabled: afterPaint,
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
    const shouldRenderDaySheet = daySheetVisible || hasMountedDaySheet;
    const shouldRenderFriendsSheet = friendsSheetVisible || hasMountedFriendsSheet;
    const shouldRenderEditTemplateSheet = isEditTemplateVisible || hasMountedEditTemplateSheet;
    const shouldRenderGroupModal = inviteSheetOpen || hasMountedGroupModal;

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
            {/* Header measured for anchoring */}
            <View onLayout={onHeaderLayout}>
                <FeedHeader
                    toMessagesScreen={toMessagesScreenCb}
                    onOpenNotifications={toggleNotifications}
                    scrollToTop={headerScrollToTop}
                    navigation={navigation}
                    allUsersRef={allUsersRef}
                    workout={headerWorkoutObj}
                    timerRef={timerRef}
                    openCurrentWorkout={headerOpenCurrentWorkout}
                    heightAdjust={-2}
                    topAdjust={-scaleSize(4)}
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
                <View style={styles.mainContent}>
                    {/* WeekCalendar temporarily disabled */}

                    {showTribeCard ? (
                        <TribeStatsCard onPress={openFriends} />
                    ) : (
                        <View style={styles.tribeCardSkeleton} />
                    )}
                    {/* Hub row */}
                    <View ref={hubRowRef} onLayout={handleHubLayout}>
                        <HubRow
                            afterPaint={afterPaint}
                            fill={fill}
                            todayCalories={todayCalories}
                            caloriesGoal={caloriesGoal}
                            workoutsThisWeek={workoutsThisWeek}
                            weeklyGoal={weeklyGoal}
                            dataHydrated={hubRowDataHydrated}
                            onReady={handleHubRowReady}
                            onPress={openDayDetailsToday}
                            onViewStats={openUserStats}
                        />
                    </View>
                </View>

                <View style={styles.bottomStack} pointerEvents="box-none">
                    <View style={styles.templatesDock}>
                        <View
                            ref={dividerRef}
                            onLayout={handleDividerLayout}
                            style={[styles.templatesDivider, dividerSpacingStyle]}
                        >
                            <SectionDivider
                                containerBg={theme.bg}
                                dashColor="rgba(255,255,255,0.22)"
                                dotColor="#ffffff2d"
                            />
                        </View>
                        {afterPaint && (
                            <View
                                ref={templatesRailRef}
                                onLayout={handleTemplatesLayout}
                                style={styles.templatesRailShell}
                            >
                                <TemplatesRail
                                    templates={templatesWithNone}
                                    onIndexChange={setActiveIdx}
                                    onAddTemplate={initTemplateAndToggle}
                                    onOpenTemplate={openEditTemplateAndToggle}
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.clusterWrap}>
                        <StartCluster
                            scaleAnim={scaleAnim}
                            hasActiveWorkout={hasActiveWorkout}
                            onStartWorkout={onStartWorkout}
                            onOpenNewWorkout={openNewWorkout}
                            onOpenCreatePost={openCreatePost}
                            templateFocusIndex={activeIdx}
                        />
                    </View>
                </View>
            </View>
            <Footer currentScreenName={"Workout"} navigation={navigation} />
            {/* Day details (open via History button) */}
            {shouldRenderDaySheet && (
                <View style={StyleSheet.absoluteFill} pointerEvents={daySheetVisible ? "auto" : "none"}>
                    <DayDetailsSheet
                        visible={daySheetVisible}
                        openToggle={daySheetToggle}
                        date={sheetDate}
                        session={daySheetSession}
                        workouts={daySheetWorkouts}
                        meals={daySheetMeals}
                        totals={daySheetTotals}
                        calories={daySheetTotals?.calories || 0}
                        workoutOn={(daySheetWorkouts?.length || 0) > 0}
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
                                hydrateDaySheetData(nd);
                            } catch {
                                setDaySheetDate(d);
                                hydrateDaySheetData(d);
                            }
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
            {/* Community sheet */}
            {shouldRenderFriendsSheet && (
                <View style={StyleSheet.absoluteFill} pointerEvents={friendsSheetVisible ? "auto" : "none"}>
                    <CommunityActivitySheet
                        visible={friendsSheetVisible}
                        openToggle={friendsSheetToggle}
                        focusUid={focusFriendUid}
                        focusWid={focusWorkoutWid}
                        onConsumedFocus={onConsumedFocusCb}
                        items={communityActivity}
                        lastViewedAt={user?.friendsActivityLastViewedAt}
                        onViewed={markFriendsViewed}
                        onClose={onFriendsClose}
                        onCopyTemplate={handleCopyTemplate}
                        onJoin={onFriendsJoin}
                        onView={onFriendsView}
                    />
                </View>
            )}
            {/* Template editor (kept identical behavior) */}
            {shouldRenderEditTemplateSheet && (
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
                    onSaveTemplate={handleSaveSummaryTemplate}
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
            <UserStatsBottomSheet
                user={user}
                navigation={navigation}
                isVisible={isUserStatsVisible}
                setIsVisible={setIsUserStatsVisible}
            />
            {/* Copy Template toast (above Templates rail) */}
            {toastPortalVisible && (
                <Modal
                    visible
                    animationType="none"
                    transparent
                    statusBarTranslucent
                    onRequestClose={() => setToastPortalVisible(false)}
                >
                    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                        <Animated.View pointerEvents="none" style={styles.toastWrap}>
                            <CopyTemplateToast anim={toastAnim} text={toastMsg || "Template added"} />
                        </Animated.View>
                    </View>
                </Modal>
            )}
            {/* Invite picker mounted at screen level so backdrop covers everything */}
            {shouldRenderGroupModal && (
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
    content: {
        flex: 1,
        paddingTop: scaleSize(2),
        paddingBottom: scaleSize(FOOTER_HEIGHT),
    },
    mainContent: { flex: 1, width: "100%" },
    tribeCardSkeleton: {
        height: scaleSize(124),
        marginHorizontal: scaleSize(16),
        marginBottom: scaleSize(6),
        borderRadius: scaleSize(24),
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    bottomStack: {
        width: "100%",
        alignItems: "center",
    },
    templatesDock: {
        width: "100%",
        alignItems: "center",
        marginBottom: TPL_BOTTOM_GAP,
    },
    templatesDivider: {
        width: "100%",
        alignItems: "center",
        marginTop: TPL_DIVIDER_MARGIN_TOP,
        marginBottom: TPL_DIVIDER_MARGIN_BOTTOM,
    },
    templatesRailShell: { width: "100%" },
    clusterWrap: {
        width: "100%",
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
