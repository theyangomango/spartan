import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
    SafeAreaView,
    View,
    StyleSheet,
    Animated,
    Alert,
    InteractionManager,
} from "react-native";

// Header & Footer
import FeedHeader from "../components/1_Feed/FeedHeader";
import Footer from "../components/Footer";

// Sections
import WeekCalendar from "../components/3_Workout/sections/WeekCalendar";
import TemplatesRail from "../components/3_Workout/sections/TemplatesRail";
import SectionDivider from "../components/3_Workout/ui/SectionDivider";
import HubRow from "../components/3_Workout/sections/HubRow";
import StartCluster from "../components/3_Workout/sections/StartCluster";

// Modals / Sheets
import NewWorkoutBottomSheet from "../components/3_Workout/NewWorkout/NewWorkoutBottomSheet";
import EditTemplateBottomSheet from "../components/3_Workout/Template/EditTemplateBottomSheet";
import WorkoutSummaryModal from "../components/3_Workout/WorkoutSummaryModal";
import DayDetailsSheet from "../components/3_Workout/DayDetailsSheet";
import FriendsActivitySheet from "../components/3_Workout/FriendsActivitySheet";
import InviteBanner from "../components/3_Workout/InviteBanner";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import NotificationsBottomSheet from "../components/1_Feed/Notifications/NotificationsBottomSheet";

// Theme & Hooks (project)
import { ss, FOOTER_HEIGHT, BTN_SIZE, TPL_BOTTOM_GAP, TPL_HEIGHT } from "../components/3_Workout/sections/workoutTheme";
import { useFoodLogs } from "../hooks/useFoodLogs";
import useResolvedUid from "../hooks/useResolvedUid";
import useUserDoc from "../hooks/useUserDoc";
import useFriendsActivity from "../hooks/useFriendsActivity";
import useLiveFollowing from "../hooks/useLiveFollowing";

// Backend utils
import updateDoc from "../../backend/helper/firebase/updateDoc";
import makeID from "../../backend/helper/makeID";

// Local logic
import useWorkoutManager from "../logic/useWorkoutManager";

// utils
import millisToHoursMinutesSeconds from "../helper/millisToHoursMinutesSeconds";
import getAllUsers from "../helper/getAllUsers";
import rankUsers from "../helper/rankUsers";
import { initUserFeed, registerFeedSetters } from "../helper/initUserFeed";

// Firestore (for invites)
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    where,
    serverTimestamp,
    arrayUnion,
    updateDoc as fsUpdateDoc,
    orderBy,
    limit,
    getDocs,
} from "firebase/firestore";
import { db } from "../../firebase.config";

// pfps
import { usePfp } from "../helper/usePFPs";

const PREVIEW_EXERCISE = "Bench Press (Barbell)";
const PREVIEW_LABEL = "Bench Press • 1RM";

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

export default function Workout({ navigation, route }) {
    /* ---------- resolve uid & user ---------- */
    const uid = useResolvedUid(route);
    const [messages, setMessages] = useState(null);
    const [footerKeyDummy, setFooterKeyDummy] = useState(0);
    useEffect(() => {
        // Mirror Feed screen setup so header Messages works the same
        registerFeedSetters({ setMessages, setFooterKey: setFooterKeyDummy });
        if (uid) initUserFeed(uid);
    }, [uid]);
    const user = useUserDoc(uid); // hydrates global.userData

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
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => setAfterPaint(true));
        });
        return () => task?.cancel?.();
    }, []);

    /* ---------- prevent phantom “00:00” ---------- */
    useEffect(() => {
        try { global.isCurrentlyWorkingOut = false; } catch { /* ignore */ }
    }, []);

    /* ---------- UI/anim ---------- */
    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    useEffect(() => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }).start();
    }, []);

    /* ---------- calories (today) ---------- */
    const stableToday = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
    const { totals: todayTotals } = useFoodLogs(stableToday, uid);
    const todayCalories = Math.round(Math.max(0, todayTotals?.calories || 0));
    const caloriesGoal = useMemo(
        () => user?.macroGoals?.calories ?? user?.macrosGoal?.calories ?? 2340,
        [user?.macroGoals?.calories, user?.macrosGoal?.calories]
    );
    const fill = Math.min(100, (todayCalories / Math.max(1, caloriesGoal)) * 100);

    /* ---------- templates (state & CRUD) ---------- */
    const normalizeTemplates = (arr) => {
        const list = Array.isArray(arr) ? arr : [];
        return list.map((t) => {
            const tid = t?.tid || t?.id || makeID();
            return {
                id: t?.id || tid,
                tid,
                name: t?.name || "Untitled Template",
                exercises: Array.isArray(t?.exercises) ? t.exercises : [],
                lastDate: t?.lastDate ?? null
            };
        });
    };
    const [templates, setTemplates] = useState([]);
    useEffect(() => { setTemplates(normalizeTemplates(user?.templates || [])); }, [user?.templates]);

    const templatesWithNone = useMemo(
        () => [{ id: "none", name: "No template selected", exercises: [], lastDate: null, isNone: true }, ...templates],
        [templates]
    );
    const [activeIdx, setActiveIdx] = useState(0);

    // Debounced saving for template edits (same behavior as original)
    const saveDebounceRef = useRef(null);
    const queueSaveTemplates = useCallback((nextTemplates) => {
        if (!uid) return;
        if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = setTimeout(async () => {
            try { await updateDoc("users", uid, { templates: nextTemplates }); }
            catch (e) { console.log("save templates error", e); }
        }, 500);
    }, [uid]);

    const openedTemplateRef = useRef(null);
    const [isEditTemplateVisible, setIsEditTemplateVisible] = useState(false);
    const [editSheetToggle, setEditSheetToggle] = useState(false);

    const initTemplate = useCallback(() => {
        const tid = makeID();
        const newTemplate = { id: tid, tid, name: "Untitled Template", exercises: [], lastDate: null };
        setTemplates((prev) => { const next = [...prev, newTemplate]; queueSaveTemplates(next); return next; });
        openedTemplateRef.current = newTemplate;
        setIsEditTemplateVisible(true);
        setEditSheetToggle((t) => !t);
    }, [queueSaveTemplates]);

    const openEditTemplate = useCallback((tpl) => {
        if (!tpl || tpl.isNone) return;
        openedTemplateRef.current = { ...tpl };
        setIsEditTemplateVisible(true);
        setEditSheetToggle((t) => !t);
    }, []);

    const updateTemplate = useCallback(() => {
        setTemplates((prev) => {
            const idx = prev.findIndex((t) => t.tid === openedTemplateRef.current?.tid);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = { ...openedTemplateRef.current };
            queueSaveTemplates(next);
            return next;
        });
    }, [queueSaveTemplates]);

    const deleteTemplate = useCallback(() => {
        setTemplates((prev) => {
            const next = prev.filter((t) => t.tid !== openedTemplateRef.current?.tid);
            queueSaveTemplates(next);
            return next;
        });
        openedTemplateRef.current = null;
        setIsEditTemplateVisible(false);
    }, [queueSaveTemplates]);

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
            if (!wk) return;
            const tid = makeID();
            const name = wk?.templateName || "Copied Template";
            const exercises = (Array.isArray(wk?.exercises) ? wk.exercises : []).map((ex) => ({
                name: ex?.name || "",
                muscle: ex?.muscle || "",
                sets: (Array.isArray(ex?.sets) ? ex.sets : []).map((s) => ({
                    weight: Number(s?.weight) || 0,
                    reps: Number(s?.reps) || 0,
                })),
            }));
            const newTemplate = { id: tid, tid, name, exercises, lastDate: null };
            setTemplates((prev) => {
                const next = [...prev, newTemplate];
                queueSaveTemplates(next);
                return next;
            });
            // Emphasize addition
            showTemplateToast("Template copied ✓");
        } catch (e) {
            console.log("handleCopyTemplate error", e);
        }
    }, [queueSaveTemplates, showTemplateToast]);

    /* ---------- podium preview ---------- */
    const [top3, setTop3] = useState([]);
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const all = await getAllUsers();
                if (!mounted) return;
                const ranked = rankUsers(Array.isArray(all) ? all : [], PREVIEW_EXERCISE) || [];
                const top = ranked.slice(0, 3).map((u) => ({
                    uid: u?.uid,
                    handle: u?.handle ?? "",
                    stat: u?.statsExercises?.[PREVIEW_EXERCISE]?.["1RM"] ?? 0,
                    fallbackPfp: u?.pfp || u?.image || u?.photoURL || null,
                }));
                setTop3(top);
            } catch (e) {
                console.log("MiniPodium load error", e);
                setTop3([]);
            }
        };
        const id = InteractionManager.runAfterInteractions(() => requestAnimationFrame(load));
        return () => { mounted = false; id?.cancel?.(); };
    }, []);

    /* ---------- friends activity ---------- */
    const { items: friendsActivity, refresh: refreshFriends } = useFriendsActivity(user);
    const [friendsSheetVisible, setFriendsSheetVisible] = useState(false);
    const [friendsSheetToggle, setFriendsSheetToggle] = useState(false);
    useEffect(() => { refreshFriends(); }, [refreshFriends]);
    useEffect(() => { if (friendsSheetVisible) refreshFriends(); }, [friendsSheetVisible, refreshFriends]);

    const lastViewedAtMs =
        (user?.friendsActivityLastViewedAt?.toMillis?.() ||
            new Date(user?.friendsActivityLastViewedAt || 0).getTime()) || 0;

    const itemTs = useCallback(
        (it) => Math.max(
            toMillis(it?.created) || 0,
            toMillis(it?.startedAt) || 0,
            toMillis(it?.finishedAt) || 0
        ),
        []
    );

    // treat as completed only if finishedAt exists and workout has some signal of work
    const looksCompleted = useCallback((it) => {
        const fin = toMillis(it?.finishedAt);
        if (!fin) return false;
        const vol = Number(it?.volume || 0);
        const reps = Number(it?.reps || it?.totalReps || 0);
        const dur = Number(it?.duration || 0);
        const hasSets =
            Array.isArray(it?.exercises) &&
            it.exercises.some((ex) => Array.isArray(ex?.sets) && ex.sets.length > 0);
        return vol > 0 || reps > 0 || dur > 0 || hasSets;
    }, []);

    const newCompletedItems = useMemo(() => {
        const v = lastViewedAtMs || 0;
        const arr = Array.isArray(friendsActivity) ? friendsActivity : [];
        return arr.filter((it) => itemTs(it) > v && looksCompleted(it));
    }, [friendsActivity, lastViewedAtMs, itemTs, looksCompleted]);

    /* ---------- LIVE FOLLOWING: always treat live as new ---------- */
    const liveNow = useLiveFollowing(user); // [{uid,pfp,pfpVersion,isLive:true,_ts}]
    const nonLiveNew = useMemo(() => {
        const liveSet = new Set(liveNow.map((x) => x.uid));
        const uniq = [];
        (Array.isArray(newCompletedItems) ? newCompletedItems : []).forEach((it) => {
            const uidX = it?.uid;
            if (!uidX || liveSet.has(uidX)) return;
            if (uniq.find((u) => u.uid === uidX)) return;
            uniq.push({
                uid: uidX,
                pfp: it?.pfp || it?.pfpUrl || it?.photoURL || it?.image || it?.avatar || "",
                pfpVersion: it?.pfpVersion || 0,
                isLive: false,
                _ts: itemTs(it),
            });
        });
        uniq.sort((a, b) => (b._ts || 0) - (a._ts || 0));
        return uniq;
    }, [newCompletedItems, liveNow, itemTs]);

    const stackUsers = useMemo(() => {
        const merged = [...liveNow, ...nonLiveNew];
        return merged.slice(0, 3);
    }, [liveNow, nonLiveNew]);

    const hasAnyStack = stackUsers.length > 0;
    const [notificationsBottomSheetExpandFlag, setNotificationsBottomSheetExpandFlag] = useState(false);

    /* ---------- Workout Manager (state + persistence + timer) ---------- */
    // Track last consumed global open signal
    const openSignalRef = useRef(0);
    const {
        workout,
        setWorkout,
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

    const hasActiveWorkout = !!workout;
    
    // Prefetch first 100 users for instant search suggestions
    useEffect(() => {
        const prefetch = async () => {
            try {
                const usersCol = collection(db, "users");
                const q = query(usersCol, orderBy("handle_lower"), limit(100));
                const snap = await getDocs(q);
                const arr = [];
                snap.forEach((d) => {
                    const data = d.data();
                    arr.push({ uid: d.id, handle: data?.handle ?? "", name: data?.name ?? "", pfp: data?.pfp ?? "" });
                });
                mergeUsersIntoRef(arr);
            } catch { /* ignore */ }
        };
        if ((allUsersRef.current?.length || 0) < 25) prefetch();
    }, [db, mergeUsersIntoRef]);

    // Seed with people the current user follows (if available via global)
    useEffect(() => {
        const run = async () => {
            try {
                const following = Array.isArray(global.userData?.following) ? global.userData.following : [];
                if (!following || following.length === 0) return;
                const existing = new Set((allUsersRef.current || []).map((u) => u.uid));
                const missing = following.filter((uid) => uid && !existing.has(uid));
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
                            fetched.push({ uid: d.id, handle: data?.handle ?? "", name: data?.name ?? "", pfp: data?.pfp ?? "" });
                        });
                    })
                );
                mergeUsersIntoRef(fetched);
            } catch { /* ignore */ }
        };
        run();
    }, [db, mergeUsersIntoRef, global?.userData?.following]);

    /* ---------- Auto-open current workout when navigated with intent ---------- */
    useEffect(() => {
        const shouldOpen = !!route?.params?.openCurrent;
        if (shouldOpen && hasActiveWorkout) {
            const id = setTimeout(() => setIsNewWorkoutVisible(true), 60);
            navigation.setParams({ openCurrent: false });
            return () => clearTimeout(id);
        }
    }, [route?.params?.openCurrent, route?.params?._t, hasActiveWorkout, navigation, setIsNewWorkoutVisible]);

    // Also react immediately on focus transitions (e.g., when tab is already mounted)
    useFocusEffect(
        useCallback(() => {
            // Param-based trigger
            if (route?.params?.openCurrent && hasActiveWorkout) {
                const id = setTimeout(() => setIsNewWorkoutVisible(true), 30);
                navigation.setParams({ openCurrent: false });
                return () => clearTimeout(id);
            }
            // Global signal trigger (fallback when params don't propagate)
            const lastRef = openSignalRef.current || 0;
            const sig = Number(global?.openCurrentWorkoutSignal || 0);
            if (sig && sig !== lastRef) {
                openSignalRef.current = sig;
                const id = setTimeout(() => setIsNewWorkoutVisible(true), 30);
                return () => clearTimeout(id);
            }
        }, [route?.params?.openCurrent, hasActiveWorkout, navigation])
    );

    /* ---------- New workout from current template selection ---------- */
    const onStartWorkout = useCallback(() => {
        const selected = templatesWithNone[Math.max(0, Math.min(activeIdx, templatesWithNone.length - 1))];
        startNewWorkoutFromTemplate(selected?.isNone ? null : selected);
    }, [activeIdx, templatesWithNone, startNewWorkoutFromTemplate]);

    /* ---------- Day sheet + meals ---------- */
    const [daySheetToggle, setDaySheetToggle] = useState(false);
    const [daySheetVisible, setDaySheetVisible] = useState(false);
    const [daySheetDate, setDaySheetDate] = useState(null);
    const sheetDate = useMemo(() => daySheetDate ?? stableToday, [daySheetDate, stableToday]);
    const { meals: sheetMeals, totals: sheetTotals } = useFoodLogs(sheetDate, uid);
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

    /* ---------- INVITES: subscribe + banner animation ---------- */
    const allUsersRef = useRef([]); // passed to FeedHeader (for search)

    /* ---------- Hydrate allUsersRef for FeedHeader search ---------- */
    const mergeUsersIntoRef = useCallback((arr) => {
        if (!Array.isArray(arr) || arr.length === 0) return;
        const map = new Map((allUsersRef.current || []).map((u) => [u.uid, u]));
        for (const u of arr) {
            if (!u?.uid) continue;
            const cur = map.get(u.uid) || {};
            map.set(u.uid, {
                uid: u.uid,
                handle: u.handle ?? cur.handle ?? "",
                name: u.name ?? cur.name ?? "",
                pfp: u.pfp ?? cur.pfp ?? "",
            });
        }
        allUsersRef.current = Array.from(map.values());
    }, []);

    // Build allUsersRef from global/users: { all: [...] }
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
    }, [db]);
    const [invites, setInvites] = useState([]);           // pending invites for me
    const [currentInvite, setCurrentInvite] = useState(null);

    // animated slide
    const bannerY = useRef(new Animated.Value(0)).current;
    const [bannerHeight, setBannerHeight] = useState(0);
    const handleInviteLayout = useCallback((e) => {
        const h = e?.nativeEvent?.layout?.height || 0;
        if (h && h !== bannerHeight) setBannerHeight(h);
    }, [bannerHeight]);

    // listen for pending invites targeting me
    useEffect(() => {
        const me = String(uid || global?.userData?.uid || "");
        if (!me) return;
        const qInv = query(
            collection(db, "workoutInvites"),
            where("toUid", "==", me),
            where("status", "==", "pending")
        );
        const unsub = onSnapshot(qInv, (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => {
                const ta = a?.createdAt?.seconds || 0;
                const tb = b?.createdAt?.seconds || 0;
                return tb - ta;
            });
            setInvites(list);
        });
        return () => unsub();
    }, [uid]);

    useEffect(() => {
        setCurrentInvite(invites?.[0] || null);
    }, [invites]);

    // animate banner in/out
    useEffect(() => {
        const hidden = -Math.max((bannerHeight || 80) + 12, 92);
        Animated.spring(bannerY, {
            toValue: currentInvite ? 0 : hidden,
            useNativeDriver: true,
            friction: 8,
            tension: 90,
        }).start();
    }, [currentInvite, bannerHeight, bannerY]);

    // derive inviter pfp (exactly as before)
    const inviterPfpUri =
        usePfp(currentInvite?.fromUid || null, currentInvite?.fromPfpVersion || 0) ||
        currentInvite?.fromPfp ||
        "";

    const handleAcceptInvite = useCallback(async () => {
        if (!currentInvite) return;
        try {
            const me = String(uid || global?.userData?.uid || "");
            const wid = String(currentInvite?.wid || "");
            if (!me || !wid) return;

            // 1) backend updates
            await fsUpdateDoc(doc(db, "workouts", wid), {
                members: arrayUnion(me),
                updatedAt: serverTimestamp(),
                active: true,
            });
            await fsUpdateDoc(doc(db, "workoutInvites", currentInvite.id), {
                status: "accepted",
                actedAt: serverTimestamp(),
            });

            // 2) fetch seed from workouts/{wid}
            let seed = null;
            try {
                const wSnap = await getDoc(doc(db, "workouts", wid));
                seed = wSnap.exists() ? wSnap.data() : null;
            } catch { /* ignore */ }

            // 3) build local joined workout (minimal but safe)
            const joined = {
                wid,
                creatorUID: seed?.creatorUid || seed?.creatorUID || currentInvite?.fromUid || me,
                created: Date.now(),
                users: [],
                exercises: [],
                tid: null,
                volume: 0,
                reps: 0,
                PBs: 0,
            };

            // 4) update local/global state so the sheet pops immediately
            try { global.isCurrentlyWorkingOut = true; } catch { }
            try {
                if (global?.userData) {
                    global.userData.currentWorkout = joined;
                }
            } catch { }

            // Prefer your manager helper if provided…
            if (typeof joinExternalWorkout === "function") {
                try {
                    await joinExternalWorkout({ wid, seedWorkout: seed || joined, inviterUid: currentInvite.fromUid });
                } catch (e) {
                    setWorkout(joined);
                }
            } else {
                setWorkout(joined);
            }

            // Force the sheet visible regardless of manager internals
            setIsNewWorkoutVisible(true);

            // 5) slide banner away
            setInvites((prev) => prev.filter((x) => x.id !== currentInvite.id));
        } catch (e) {
            console.log("Accept invite error", e);
            Alert.alert("Couldn't join", "Please try again.");
        }
    }, [currentInvite, uid, joinExternalWorkout, setWorkout, setIsNewWorkoutVisible]);

    const handleDeclineInvite = useCallback(async () => {
        if (!currentInvite) return;
        try {
            await fsUpdateDoc(doc(db, "workoutInvites", currentInvite.id), {
                status: "declined",
                actedAt: serverTimestamp(),
            });
            setInvites((prev) => prev.filter((x) => x.id !== currentInvite.id));
        } catch (e) {
            console.log("Decline invite error", e);
            setInvites((prev) => prev.filter((x) => x.id !== currentInvite.id));
        }
    }, [currentInvite]);

    /* ---------------- render ---------------- */
    return (
        <SafeAreaView style={styles.root}>
            {/* Header measured for anchoring */}
            <View onLayout={onHeaderLayout}>
                <FeedHeader
                    toMessagesScreen={() => {
                        if (global.userData && messages) {
                            navigation?.navigate("Messages", { userData: global.userData, messages, returnTo: 'Workout' });
                        } else {
                            navigation?.navigate("Messages", { returnTo: 'Workout' });
                        }
                    }}
                    onOpenNotifications={() => setNotificationsBottomSheetExpandFlag((f) => !f)}
                    backButton={false}
                    onBackPress={() => navigation?.goBack?.()}
                    scrollToTop={() => { }}
                    navigation={navigation}
                    allUsersRef={allUsersRef}
                    workout={workout}
                    timerRef={timerRef}
                    openCurrentWorkout={() => setIsNewWorkoutVisible(true)}
                />
            </View>

            {/* Invite banner (absolute, anchored below header & within SafeArea) */}
            <Animated.View
                style={[
                    styles.inviteBannerWrap,
                    { top: headerHeight + 6, transform: [{ translateY: bannerY }] },
                ]}
                pointerEvents={currentInvite ? "auto" : "none"}
                onLayout={handleInviteLayout}
            >
                {currentInvite && (
                    <InviteBanner
                        invite={currentInvite}
                        pfpUri={inviterPfpUri}
                        onAccept={handleAcceptInvite}
                        onDecline={handleDeclineInvite}
                    />
                )}
            </Animated.View>

            <View style={styles.content}>
                <WeekCalendar
                    workoutsMap={global?.userData?.workoutsByDate || {}}
                    onDayPress={(d) => {
                        setDaySheetDate(d);
                        setDaySheetVisible(true);
                        setDaySheetToggle((f) => !f);
                    }}
                />

                {/* Hub row */}
                <HubRow
                    navigation={navigation}
                    afterPaint={afterPaint}
                    fill={fill}
                    todayCalories={todayCalories}
                    caloriesGoal={caloriesGoal}
                    top3={top3}
                    PREVIEW_LABEL={PREVIEW_LABEL}
                />

                <SectionDivider />
            </View>

            {/* Templates rail (mount after first paint) */}
            {afterPaint && (
                <View style={styles.templatesDock} pointerEvents="box-none">
                    <TemplatesRail
                        templates={templatesWithNone}
                        onIndexChange={setActiveIdx}
                        onAddTemplate={initTemplate}
                        onOpenTemplate={openEditTemplate}
                    />
                </View>
            )}

            {/* START cluster */}
            <View style={styles.clusterWrap} pointerEvents="box-none">
                <StartCluster
                    navigation={navigation}
                    scaleAnim={scaleAnim}
                    hasActiveWorkout={hasActiveWorkout}
                    onStartWorkout={onStartWorkout}
                    onOpenNewWorkout={() => setIsNewWorkoutVisible(true)}
                    onOpenFriends={() => {
                        setFriendsSheetVisible(true);
                        setFriendsSheetToggle((f) => !f);
                    }}
                    hasNewFriendsUpdates={hasAnyStack}
                    friendsStackUsers={stackUsers}
                />
            </View>

            <Footer navigation={navigation} currentScreenName={"Workout"} />

            {/* Notifications (same UX as Feed) */}
            <NotificationsBottomSheet notificationsBottomSheetExpandFlag={notificationsBottomSheetExpandFlag} />

            {/* Day details */}
            {daySheetVisible && (
                <DayDetailsSheet
                    visible={daySheetVisible}
                    openToggle={daySheetToggle}
                    date={sheetDate}
                    workouts={dayWorkouts}
                    meals={sheetMeals}
                    totals={sheetTotals}
                    calories={sheetTotals?.calories || 0}
                    workoutOn={(dayWorkouts?.length || 0) > 0}
                    onClose={() => setDaySheetVisible(false)}
                    onStartWorkout={onStartWorkout}
                    onOpenMacros={() => { setDaySheetVisible(false); navigation.navigate("MacroTrackingOverlay"); }}
                />
            )}

            {/* Friends sheet */}
            <View style={StyleSheet.absoluteFill} pointerEvents={friendsSheetVisible ? "auto" : "none"}>
                <FriendsActivitySheet
                    visible={friendsSheetVisible}
                    openToggle={friendsSheetToggle}
                    items={friendsActivity}
                    lastViewedAt={user?.friendsActivityLastViewedAt}
                    onViewed={markFriendsViewed}
                    onClose={() => setFriendsSheetVisible(false)}
                    onCopyTemplate={handleCopyTemplate}
                    onJoin={(item) => {
                        setFriendsSheetVisible(false);
                        Alert.alert("Join Workout", `Joining ${item.name}'s live session…`);
                    }}
                    onView={(item) => {
                        setFriendsSheetVisible(false);
                        Alert.alert("Workout", `Opening ${item.name}'s workout (${item.duration} min)…`);
                    }}
                />
            </View>

            {/* New Workout sheet */}
            <NewWorkoutBottomSheet
                workout={workout}
                cancelNewWorkout={cancelWorkout}
                updateNewWorkout={updateNewWorkout}
                finishNewWorkout={finishWorkout}
                isVisible={isNewWorkoutVisible}
                setIsVisible={setIsNewWorkoutVisible}
                timerRef={timerRef}
                showGroupModal={() => { }}
                userWorkoutStats={global?.userData?.statsExercises || {}}
            />

            {/* Template editor (kept identical behavior) */}
            <EditTemplateBottomSheet
                isVisible={isEditTemplateVisible}
                setIsVisible={setIsEditTemplateVisible}
                openToggle={editSheetToggle}
                openedTemplateRef={openedTemplateRef}
                updateTemplate={updateTemplate}
                deleteTemplate={deleteTemplate}
            />

            {isSummaryModalVisible && (
                <WorkoutSummaryModal
                    isVisible={isSummaryModalVisible}
                    workout={completedWorkout}
                    onClose={() => setIsSummaryModalVisible(false)}
                    postWorkout={postWorkout}
                />
            )}

            {/* Copy Template toast (above Templates rail) */}
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.toastWrap,
                    {
                        opacity: toastAnim,
                        transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                    },
                ]}
            >
                <View style={styles.toastInner}>
                    <MaterialCommunityIcons name="check-circle" size={ss(16)} color="#fff" style={{ marginRight: ss(8) }} />
                    <Animated.Text style={styles.toastText}>{toastMsg || "Template added"}</Animated.Text>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F7FAFF" },
    content: { flex: 1 },

    templatesDock: { position: "absolute", left: 0, right: 0, bottom: FOOTER_HEIGHT + ss(22) + BTN_SIZE + TPL_BOTTOM_GAP },
    clusterWrap: { position: "absolute", left: 0, right: 0, bottom: FOOTER_HEIGHT + ss(20), alignItems: "center" },

    // Invite banner wrapper (same positioning/animation as original)
    inviteBannerWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        zIndex: 30,
        alignItems: "center",
        paddingTop: 0,
    },
    // Toast positioned above Templates rail
    toastWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: FOOTER_HEIGHT + ss(22) + BTN_SIZE + TPL_BOTTOM_GAP + TPL_HEIGHT + ss(10),
        alignItems: "center",
        zIndex: 40,
    },
    toastInner: {
        paddingHorizontal: ss(14),
        paddingVertical: ss(10),
        borderRadius: ss(999),
        backgroundColor: "rgba(15,23,42,0.92)",
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.16,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    toastText: { color: "#fff", fontFamily: "Outfit_700Bold", fontSize: ss(12.5) },
});
