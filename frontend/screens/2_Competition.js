// screens/Competition.jsx
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
    StyleSheet,
    View,
    Modal,
    TouchableOpacity,
    Animated as RNAnimated,
    Dimensions,
    Text,
    Image,
    InteractionManager,
    Pressable,
    ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import useStableSafeAreaInsets from "../hooks/useStableSafeAreaInsets";
import { useSharedValue } from "react-native-reanimated";
import Podium, { PODIUM_HEIGHT } from "../components/2_Competition/Podium";
import rankUsers from "../helper/rankUsers";
import LeaderboardPanel from "../components/2_Competition/LeaderboardPanel";
import UserStatsBottomSheet from "../components/2_Competition/UserStats/UserStatsBottomSheet";
import { Ionicons } from "@expo/vector-icons";
import SelectExerciseModal from "../components/2_Competition/SelectExercise/SelectExerciseModal";
import InfoPanel from "../components/2_Competition/InfoPanel";
import {
    doc,
    onSnapshot,
    collection,
    query,
    where,
    addDoc,
    serverTimestamp,
    updateDoc,
    arrayUnion,
    arrayRemove,
    getDocs,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import getAllUsers from "../helper/getAllUsers";

import TribeMenu from "../components/2_Competition/TribeMenu";
import CreateTribeModal from "../components/2_Competition/CreateTribeModal";
import JoinTribeModal from "../components/2_Competition/JoinTribeModal";
import ManageTribeModal from "../components/2_Competition/ManageTribeModal";
import TribeComparisonModal from "../components/2_Competition/TribeComparisonModal";
import RNBounceable from "@freakycoder/react-native-bounceable";
import Footer from "../components/Footer";
import PersonalInfoSheet from "../components/2_MacroTracking/PersonalInfoSheet";
import theme from "../theme/mfpDark";
import { subscribeUserData, emitUserDataUpdate } from "../utils/userDataEvents";
import { canViewerAccessProfile } from "../utils/workoutPrivacy";

import scaleSizeFont, { ts } from "../helper/scaleSize";
import { withStrongPress } from "../utils/haptics";

const { width, height } = Dimensions.get("window");

// -------- scaler (replaces getDynamicStyles) --------
const BASE = { width: scaleSizeFont(390), height: scaleSizeFont(844) }; // iPhone 13 baseline
const scaleSize = (value, axis = "min") => {
    const wRatio = width / BASE.width;
    const hRatio = height / BASE.height;
    const ratio = axis === "w" ? wRatio : axis === "h" ? hRatio : Math.min(wRatio, hRatio);
    return Math.round(value * ratio);
};
// central place for UI sizes
const SIZES = {
    // header
    headerIconSize: scaleSize(21),                  // base icon size
    chevronDelta: scaleSize(6),                     // difference for chevron icon
    headerPaddingHorizontal: scaleSize(30, "w"),    // horizontal padding scales with width
    headerPaddingTop: scaleSize(6),            // top padding aligns with global header spacing

    tribeHitSlop: scaleSize(8),

    tribeLabelFont: scaleSize(15),
    tribeLabelMaxWidth: scaleSize(160),
    tribeLabelMarginRight: scaleSize(2),

    // icon margins
    iconMR: scaleSize(6),
    iconMT: scaleSize(1),
    chevronML: scaleSize(4),
    chevronMT: scaleSize(1),
    selectorOffset: scaleSize(6),
};

const HEADER_GRADIENT_OVERLAP = scaleSize(120);

const EXERCISE_CARD_GAP = scaleSize(12, "w");
const EXERCISE_CARD_ASPECT_RATIO = 0.72;
const EXERCISE_CARD_WIDTH = Math.round(
    (width - (SIZES.headerPaddingHorizontal * 2) - (EXERCISE_CARD_GAP * 2)) / 3
);

const PLACEHOLDER_EXERCISES = [
    {
        key: "bench-press-barbell",
        title: "Bench Press",
        muscle: "Chest",
        image: require("../assets/exercises/bench-press-barbell/final.png"),
    },
    {
        key: "lever-seated-fly",
        title: "Lever Seated Fly",
        muscle: "Chest",
        image: require("../assets/exercises/chest-fly-machine/final.png"),
    },
    {
        key: "incline-bench-press",
        title: "Incline Bench Press",
        muscle: "Chest",
        image: require("../assets/exercises/incline-bench-press-dumbbell/final.png"),
    },
    {
        key: "dumbbell-fly",
        title: "Dumbbell Fly",
        muscle: "Chest",
        image: require("../assets/exercises/chest-fly-dumbbell/final.png"),
    },
    {
        key: "lat-pulldown",
        title: "Lat Pulldown",
        muscle: "Back",
        image: require("../assets/exercises/lat-pulldown-cable/final.png"),
    },
    {
        key: "seated-row",
        title: "Seated Row",
        muscle: "Back",
        image: require("../assets/exercises/seated-row-cable/final.png"),
    },
    {
        key: "shoulder-press",
        title: "Shoulder Press",
        muscle: "Shoulders",
        image: require("../assets/exercises/shoulder-press-dumbbell/final.png"),
    },
    {
        key: "back-squat",
        title: "Back Squat",
        muscle: "Legs",
        image: require("../assets/exercises/back-squat-barbell/final.png"),
    },
    {
        key: "romanian-deadlift",
        title: "Romanian Deadlift",
        muscle: "Hamstrings",
        image: require("../assets/exercises/romanian-deadlift-dumbbell/final.png"),
    },
];

const STAGE_VERTICAL_OFFSET = scaleSize(0);
const PODIUM_PULLUP = scaleSize(20);

const DEFAULT_BODY_FOCUS = "overall";
const BODY_FOCUS_OPTIONS = [
    { label: "Overall", value: "overall" },
    { label: "Chest", value: "chest" },
    { label: "Shoulders", value: "shoulders" },
    { label: "Abs", value: "abs" },
    { label: "Back", value: "back" },
    { label: "Legs", value: "legs" },
    { label: "Arms", value: "arms" },
];
const BODY_FOCUS_LABEL_MAP = BODY_FOCUS_OPTIONS.reduce((acc, opt) => {
    acc[opt.value] = opt.label;
    return acc;
}, {});
const VIEW_TABS = [
    { key: "leaderboard", label: "Leaderboards" },
    { key: "templates", label: "Templates" },
    { key: "exercises", label: "Exercises" },
];

// -------- tiny persistence (no deps) --------
const GLOBAL_KEY = "__competition_state__";
const getPersisted = () =>
    (global[GLOBAL_KEY] && typeof global[GLOBAL_KEY] === "object" ? global[GLOBAL_KEY] : {});
const setPersisted = (patch) => {
    const curr = getPersisted();
    global[GLOBAL_KEY] = { ...curr, ...patch };
};

// module fallbacks (if global gets cleared)
let LAST_SCOPE = "Following";
let LAST_SELECTED_TRIBE_ID = null;
let LAST_USERLIST = null;
let LAST_BODY_FOCUS = DEFAULT_BODY_FOCUS;

const genCode = (len = 6) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
};

function safeBodyweight(u) {
    return (
        u?.personalInfo?.weight ||
        u?.bodyweight ||
        u?.bodyWeight ||
        u?.weight ||
        u?.stats?.bodyweight ||
        u?.stats?.weight ||
        0
    );
}

function computeTribeRanking(users, comparison) {
    const { exercise, metric, normalizeByBodyweight } = comparison || {};
    const list = (users || []).map((u) => {
        const ex = u?.statsExercises?.[exercise] || {};
        const raw = metric === "1RM" ? (ex?.["1RM"] ?? 0)
            : metric === "Volume" ? (ex?.["Volume"] ?? 0)
            : (ex?.["Reps"] ?? 0);

        if (normalizeByBodyweight) {
            const weight = Number(safeBodyweight(u)) || 0;
            const hasWeight = weight > 0;
            const val = hasWeight ? (Number(raw) / weight) : NaN;
            return { ...u, _tribeValue: hasWeight && Number.isFinite(val) ? val : null, __noWeightForBW: !hasWeight };
        }

        const val = Number(raw);
        return { ...u, _tribeValue: Number.isFinite(val) ? val : 0, __noWeightForBW: false };
    });

    list.sort((a, b) => {
        // For BW-normalized lists: users without weight go to the bottom
        if (comparison?.normalizeByBodyweight) {
            const an = !!a.__noWeightForBW, bn = !!b.__noWeightForBW;
            if (an && !bn) return 1;
            if (!an && bn) return -1;
        }
        const av = a._tribeValue ?? -Infinity;
        const bv = b._tribeValue ?? -Infinity;
        return (bv || -Infinity) - (av || -Infinity);
    });
    return list;
}

const summaryOf = (c) => {
    if (!c) return "Not set";
    const metricLabel = c.metric === '1RM' ? '1RM (Adj)' : c.metric;
    const parts = [c.exercise, metricLabel];
    if (c.normalizeByBodyweight) parts.push("per lb bodyweight");
    return parts.join(" • ");
};

// Hide users when either side has blocked the other.
function filterBlockedVisibility(list) {
    try {
        const meUid = String(global?.userData?.uid || '');
        if (!meUid) return list;
        const myBlocked = Array.isArray(global?.userData?.blocked) ? global.userData.blocked : [];
        const myBlockedSet = new Set(
            myBlocked.map((x) => String((x && (x.uid || x.id)) || x || ''))
        );
        const viewerData = (() => {
            try { return global?.userData || null; }
            catch { return null; }
        })();
        const viewerUid = viewerData?.uid ? String(viewerData.uid) : '';
        const theyBlockedMe = (u) => {
            const arr = Array.isArray(u?.blocked) ? u.blocked : [];
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                const uid = String((item && (item.uid || item.id)) || item || '');
                if (uid === meUid) return true;
            }
            return false;
        };
        return (Array.isArray(list) ? list : []).filter((u) => {
            const uid = String(u?.uid || '');
            if (!uid) return false;
            if (uid === meUid) return true; // always include self
            if (myBlockedSet.has(uid)) return false; // I blocked them
            if (theyBlockedMe(u)) return false; // they blocked me
            if (!canViewerAccessProfile(u, viewerUid, viewerData)) return false;
            return true;
        });
    } catch {
        return list;
    }
}

function resolveLastRank(user, exercise, scopeKey) {
    if (!user || !exercise || !scopeKey) return null;
    const perExercise = user?.lastRanks?.[exercise];
    if (!perExercise) return null;
    const raw = perExercise?.[scopeKey];
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return null;
    return num;
}

function applyLastRanks(list, exercise, scopeKey) {
    if (!Array.isArray(list)) return [];
    if (!exercise || !scopeKey) return list.map((u) => ({ ...u, lastRank: null }));
    return list.map((user) => ({
        ...user,
        lastRank: resolveLastRank(user, exercise, scopeKey) ?? null,
    }));
}

export default function Competition({ navigation, route }) {
    const insets = useStableSafeAreaInsets();
    const podiumSectionHeight = useMemo(() => PODIUM_HEIGHT, []);
    const panelOverlap = useMemo(() => scaleSize(12), []);
    const panelCollapsedHeight = useMemo(
        () => Math.max(1, Math.ceil(height - podiumSectionHeight + panelOverlap)),
        [height, podiumSectionHeight, panelOverlap]
    );
    const scrollBottomPadding = useMemo(
        () => Math.max(scaleSize(32), (insets?.bottom || 0) + scaleSize(12)),
        [insets?.bottom]
    );
    const usersRef = useRef([]);
    const userUnsubRef = useRef(null);
    // hydrate leaderboard from last saved view (backend)
    const appliedLastViewRef = useRef(false);
    const pendingTribeCompRef = useRef(null);

    // hydrate from global/module caches
    const persisted = getPersisted();

    const [userList, setUserList] = useState(persisted.userList ?? LAST_USERLIST);
    const [comparedExercise, setComparedExercise] = useState("Overall");
    const [scope, setScope] = useState(persisted.scope ?? LAST_SCOPE);
    // Backward compatibility: migrate legacy scope label
    useEffect(() => {
        if (persisted?.scope === "All Followers") setScope("Following");
    }, []);

    // flags to gate recompute
    const [usersLoaded, setUsersLoaded] = useState(false);
    const [tribesHydrated, setTribesHydrated] = useState(false);

    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isUserStatsBottomSheetVisible, setIsUserStatsBottomSheetVisible] = useState(false);

    const [comparedMetric, setComparedMetric] = useState("1RM");
    const exerciseStatKey = comparedMetric === "1RM" ? "1RM" : comparedMetric;

    const [bodyFocus, setBodyFocus] = useState(() => {
        const savedFocus = persisted.bodyFocus ?? LAST_BODY_FOCUS ?? DEFAULT_BODY_FOCUS;
        return BODY_FOCUS_LABEL_MAP[savedFocus] ? savedFocus : DEFAULT_BODY_FOCUS;
    });
    const [isBodyFocusMenuVisible, setIsBodyFocusMenuVisible] = useState(false);
    const focusToggleAnchorRef = useRef(null);
    const [focusMenuAnchor, setFocusMenuAnchor] = useState({ x: SIZES.headerPaddingHorizontal, y: 0, width: 0, height: 0 });
    const userStatsSheetProgress = useSharedValue(0);
    const infoPanelOpacityRef = useRef(new RNAnimated.Value(0));
    const [activeCompetitionTab, setActiveCompetitionTab] = useState("leaderboard");
    const isLeaderboardView = useMemo(() => activeCompetitionTab === "leaderboard", [activeCompetitionTab]);
    const nonLeaderboardMessage = useMemo(() => {
        if (activeCompetitionTab === "leaderboard") return "";
        if (activeCompetitionTab === "templates") return "Templates view coming soon";
        if (activeCompetitionTab === "exercises") return "";
        const fallback = VIEW_TABS.find((tab) => tab.key === activeCompetitionTab)?.label || "This view";
        return `${fallback} coming soon`;
    }, [activeCompetitionTab]);

    useEffect(() => {
        if (isUserStatsBottomSheetVisible) {
            userStatsSheetProgress.value = 1;
        }
    }, [isUserStatsBottomSheetVisible, userStatsSheetProgress]);

    // Tribes
    const [tribes, setTribes] = useState([]);
    const [selectedTribeId, setSelectedTribeId] = useState(
        persisted.selectedTribeId ?? LAST_SELECTED_TRIBE_ID
    );
    const [tribeMenuVisible, setTribeMenuVisible] = useState(false);

    // Tribe modals
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [joinModalVisible, setJoinModalVisible] = useState(false);
    const [manageModalVisible, setManageModalVisible] = useState(false);

    // Inputs
    const [newTribeName, setNewTribeName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [renameInput, setRenameInput] = useState("");

    // Comparison manager
    const [comparisonManagerVisible, setComparisonManagerVisible] = useState(false);
    const [activeCompIndex, setActiveCompIndex] = useState(0);

    // ---- keep caches in sync
    useEffect(() => { LAST_SCOPE = scope; setPersisted({ scope }); }, [scope]);
    useEffect(() => { LAST_SELECTED_TRIBE_ID = selectedTribeId; setPersisted({ selectedTribeId }); }, [selectedTribeId]);
    useEffect(() => { LAST_USERLIST = userList; setPersisted({ userList }); }, [userList]);
    useEffect(() => { LAST_BODY_FOCUS = bodyFocus; setPersisted({ bodyFocus }); }, [bodyFocus]);

    const [userSignals, setUserSignals] = useState({
        followingKey: "",
        followersKey: "",
        tribeKey: "",
        statsKey: "",
        hexagonKey: "",
        profileKey: "",
    });

    useEffect(() => subscribeUserData((data) => {
        const normalizeList = (list) => {
            if (!Array.isArray(list) || !list.length) return "[]";
            const mapped = list.map((entry) => {
                if (!entry) return "";
                if (typeof entry === "string" || typeof entry === "number") return String(entry);
                if (typeof entry === "object") {
                    return String(
                        entry.uid ||
                        entry.id ||
                        entry.userUid ||
                        entry.memberUid ||
                        entry.followerUid ||
                        entry.followUid ||
                        ""
                    );
                }
                return "";
            }).filter(Boolean);
            mapped.sort();
            return mapped.join("|");
        };

        const followingKey = normalizeList(data?.following);
        const followersKey = normalizeList(data?.followers);
        const tribeKey = normalizeList(data?.tribeIds);

        const statsKey = (() => {
            const stats = data?.statsExercises;
            if (!stats || typeof stats !== "object") return "";
            try {
                const pieces = Object.keys(stats).sort().map((exercise) => {
                    const entry = stats[exercise] || {};
                    const best = entry.bestSet ? `${entry.bestSet.reps || 0}x${entry.bestSet.weight || 0}` : "";
                    return `${exercise}:${entry["1RM"] || 0}:${entry.Volume || 0}:${entry.Reps || 0}:${best}`;
                });
                return pieces.join("|");
            } catch {
                return "";
            }
        })();

        const hexagonKey = (() => {
            const hex = data?.statsHexagon;
            if (!hex || typeof hex !== "object") return "";
            try {
                return Object.keys(hex).sort().map((k) => `${k}:${hex[k] || 0}`).join("|");
            } catch {
                return "";
            }
        })();

        const profileKey = (() => {
            const pieces = [
                data?.handle || "",
                data?.displayName || "",
                data?.name || "",
                data?.image || "",
                data?.pfp || "",
                data?.pfpVersion || "",
            ];
            return pieces.join("|");
        })();

        if (data?.uid) {
            usersRef.current = Array.isArray(usersRef.current)
                ? (() => {
                    const next = [...usersRef.current];
                    const idx = next.findIndex((u) => u?.uid === data.uid);
                    if (idx >= 0) {
                        next[idx] = { ...next[idx], ...data };
                        return next;
                    }
                    return next;
                })()
                : usersRef.current;

            setUserList((prev) => {
                if (!Array.isArray(prev)) return prev;
                const next = [...prev];
                const idx = next.findIndex((u) => u?.uid === data.uid);
                if (idx === -1) return prev;
                next[idx] = { ...next[idx], ...data };
                return next;
            });
        }

        setUserSignals((prev) => {
            if (
                prev.followingKey === followingKey &&
                prev.followersKey === followersKey &&
                prev.tribeKey === tribeKey &&
                prev.statsKey === statsKey &&
                prev.hexagonKey === hexagonKey &&
                prev.profileKey === profileKey
            ) {
                return prev;
            }
            return { followingKey, followersKey, tribeKey, statsKey, hexagonKey, profileKey };
        });
    }), []);

    // ---- init users on mount/focus
    const initUsers = useCallback(async () => {
        const allUsers = await getAllUsers();
        usersRef.current = allUsers;
        setUsersLoaded(true); // let recompute effect decide when to run
    }, []);

    // If opened from HubRow, suppress the next navigation animation once
    // No one-off transition suppression; keep other transitions intact

    useEffect(() => { initUsers(); }, [initUsers]);

    useEffect(() => {
        // Helper to apply last saved view once
        const hydrateFromLastView = (lastView) => {
            if (appliedLastViewRef.current) return;
            if (!lastView || typeof lastView !== 'object') return;
            appliedLastViewRef.current = true;

            const type = String(lastView.type || '').toLowerCase();
            if (type === 'tribe' && lastView.tribeId) {
                // Switch to the tribe scope and defer picking the comparison until tribe list arrives
                setSelectedTribeId(lastView.tribeId);
                pendingTribeCompRef.current = lastView.comparison || null;
            } else {
                // Global or Following scopes
                const scopeX = (type === 'following' || type === 'followers') ? 'Following' : 'Global';
                setSelectedTribeId(null);
                setScope(scopeX);
                const focus = typeof lastView.bodyFocus === 'string' && lastView.bodyFocus ? lastView.bodyFocus : null;
                if (typeof lastView.bodyFocus === 'string' && lastView.bodyFocus) setBodyFocus(lastView.bodyFocus);
                if ((focus || DEFAULT_BODY_FOCUS) === 'overall') {
                    setComparedExercise('Overall');
                } else if (lastView.exercise) {
                    setComparedExercise(lastView.exercise);
                }
                if (lastView.metric) setComparedMetric(lastView.metric);
            }
        };

        const navUnsub = navigation.addListener("focus", () => {
            // Re-subscribe on focus without waiting for interactions to settle
            const id = setTimeout(() => {
                if (userUnsubRef.current) userUnsubRef.current();
                userUnsubRef.current = onSnapshot(doc(db, "users", global.userData.uid), async (docSnap) => {
                    const data = docSnap.data();
                    global.userData = data;
                    emitUserDataUpdate();
                    // Apply last saved view once per mount
                    try { hydrateFromLastView(data?.competitionLastView); } catch {}
                    initUsers(); // refresh users; recompute gated elsewhere
                });
            }, 0);
            return () => clearTimeout(id);
        });
        return () => {
            navUnsub && navUnsub();
            if (userUnsubRef.current) {
                userUnsubRef.current();
                userUnsubRef.current = null;
            }
        };
    }, [navigation, initUsers, setSelectedTribeId, setScope, setComparedExercise, setComparedMetric]);

    // If global already holds userData (e.g., warm start), hydrate immediately once
    useEffect(() => {
        if (appliedLastViewRef.current) return;
        try {
            const lv = global?.userData?.competitionLastView;
            if (lv) {
                const type = String(lv.type || '').toLowerCase();
                if (type === 'tribe' && lv.tribeId) {
                    setSelectedTribeId(lv.tribeId);
                    pendingTribeCompRef.current = lv.comparison || null;
                } else {
                    const scopeX = (type === 'following' || type === 'followers') ? 'Following' : 'Global';
                    setSelectedTribeId(null);
                    setScope(scopeX);
                    const focus = typeof lv.bodyFocus === 'string' && lv.bodyFocus ? lv.bodyFocus : null;
                    if (typeof lv.bodyFocus === 'string' && lv.bodyFocus) setBodyFocus(lv.bodyFocus);
                    if ((focus || DEFAULT_BODY_FOCUS) === 'overall') {
                        setComparedExercise('Overall');
                    } else if (lv.exercise) {
                        setComparedExercise(lv.exercise);
                    }
                    if (lv.metric) setComparedMetric(lv.metric);
                }
                appliedLastViewRef.current = true;
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- tribes subscription
    const currentTribe = useMemo(
        () => tribes.find((x) => x.id === selectedTribeId) || null,
        [tribes, selectedTribeId]
    );

    const tribeComparisons = useMemo(() => {
        const arr = currentTribe?.comparisons;
        if (Array.isArray(arr) && arr.length) return arr;
        return currentTribe?.comparison ? [currentTribe.comparison] : [];
    }, [currentTribe]);

    // Once tribe comparisons load, align active index with the last saved comparison (if any)
    useEffect(() => {
        const want = pendingTribeCompRef.current;
        if (!selectedTribeId || !want) return;
        const list = Array.isArray(tribeComparisons) ? tribeComparisons : [];
        if (!list.length) return;
        const idx = list.findIndex((c) =>
            String(c?.exercise || '') === String(want?.exercise || '') &&
            String(c?.metric || '1RM') === String(want?.metric || '1RM') &&
            !!c?.normalizeByBodyweight === !!want?.normalizeByBodyweight
        );
        if (idx >= 0) setActiveCompIndex(idx);
        pendingTribeCompRef.current = null; // apply once
    }, [selectedTribeId, tribeComparisons]);

    const isCustomTribe = !!selectedTribeId;
    const activeComparison =
        isCustomTribe && tribeComparisons.length > 0
            ? tribeComparisons[Math.min(activeCompIndex, tribeComparisons.length - 1)]
            : null;

    useEffect(() => {
        if (isCustomTribe) setIsBodyFocusMenuVisible(false);
    }, [isCustomTribe]);

    useEffect(() => {
        if (isCustomTribe) return;
        if (bodyFocus === 'overall' && comparedExercise !== 'Overall') {
            setComparedExercise('Overall');
        }
    }, [isCustomTribe, bodyFocus, comparedExercise]);

    const handleToggleFocusMenu = useCallback(() => {
        if (isCustomTribe) return;
        if (isBodyFocusMenuVisible) {
            setIsBodyFocusMenuVisible(false);
            return;
        }
        const measureAndOpen = () => {
            try {
                focusToggleAnchorRef.current?.measureInWindow?.((x = 0, y = 0, width = 0, height = 0) => {
                    setFocusMenuAnchor({ x, y, width, height });
                    setIsBodyFocusMenuVisible(true);
                });
            } catch {
                setIsBodyFocusMenuVisible(true);
            }
        };
        requestAnimationFrame(measureAndOpen);
    }, [isCustomTribe, isBodyFocusMenuVisible]);

    const handleCompetitionTabPress = useCallback((key) => {
        setActiveCompetitionTab(key);
    }, []);

    const renderHeaderLeftContent = () => {
        if (!isLeaderboardView) return null;
        if (isCustomTribe && currentTribe) {
            return (
                <View style={styles.manageButtonWrap}>
                    <RNBounceable
                        onPress={withStrongPress(() => setManageModalVisible(true))}
                        style={styles.manageButton}
                        activeScale={0.96}
                        accessibilityRole="button"
                        accessibilityLabel="Manage current tribe"
                    >
                        <Ionicons
                            name="settings-outline"
                            size={15}
                            color="rgba(255,255,255,0.95)"
                            style={styles.manageButtonIcon}
                        />
                        <Text style={styles.manageButtonLabel}>Manage</Text>
                    </RNBounceable>
                </View>
            );
        }

        if (isCustomTribe) return null;

        return (
            <View ref={focusToggleAnchorRef} style={styles.focusToggleWrap} collapsable={false}>
                <RNBounceable
                    onPress={withStrongPress(handleToggleFocusMenu)}
                    style={styles.focusToggle}
                    activeScale={0.96}
                    accessibilityRole="button"
                    accessibilityLabel="Change leaderboard focus"
                >
                    <Text style={styles.focusToggleLabel} numberOfLines={1} ellipsizeMode="tail">
                        {bodyFocusLabel}
                    </Text>
                    <Ionicons
                        name={isBodyFocusMenuVisible ? "chevron-up" : "chevron-down"}
                        size={Math.max(18, SIZES.headerIconSize - SIZES.chevronDelta)}
                        color="rgba(255,255,255,0.95)"
                        style={styles.focusToggleIcon}
                    />
                </RNBounceable>
            </View>
        );
    };

    useEffect(() => {
        const uid = global?.userData?.uid;
        if (!uid) return;
        const tribesRef = collection(db, "tribes");
        const q = query(tribesRef, where("members", "array-contains", uid));
        const unsub = onSnapshot(q, (snap) => {
            const t = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setTribes(t);
            setTribesHydrated(true); // ✅ we now know tribe docs for this user
            if (selectedTribeId && !t.find((x) => x.id === selectedTribeId)) {
                setSelectedTribeId(null);
            }
        });
        return unsub;
    }, [selectedTribeId]);

    // ---- single source of truth recompute (gated)
    const recompute = useCallback(() => {
        const all = usersRef.current || [];
        const hexFocusKey = typeof bodyFocus === 'string' && bodyFocus ? bodyFocus : null;

        if (isCustomTribe) {
            // if we intend to show a tribe, do NOT recompute until tribe docs are ready
            if (!tribesHydrated || !currentTribe) return;

            const memberSet = new Set(currentTribe.members || []);
            const tribeUsers = all.filter((u) => memberSet.has(u?.uid));
            const visible = filterBlockedVisibility(tribeUsers);
            const tribeScopeKey = String(currentTribe?.id || selectedTribeId || '');
            if (activeComparison) {
                const ranked = computeTribeRanking(visible, activeComparison);
                setUserList(applyLastRanks(ranked, activeComparison?.exercise, tribeScopeKey));
            } else {
                // Tribe without custom comparison falls back to exercise-based leaderboard
                const ranked = rankUsers(visible, comparedExercise, comparedMetric);
                setUserList(applyLastRanks(ranked, comparedExercise, tribeScopeKey));
            }
            return;
        }

        const buildHexRanking = (list, scopeKeyLabel) => {
            const arr = Array.isArray(list)
                ? list.map((user) => {
                    const hexVal = Number(user?.statsHexagon?.[hexFocusKey] ?? 0);
                    return {
                        ...user,
                        __hexValue: Number.isFinite(hexVal) ? hexVal : 0,
                    };
                })
                : [];
            arr.sort((a, b) => (Number(b.__hexValue ?? 0) || 0) - (Number(a.__hexValue ?? 0) || 0));
            setUserList(applyLastRanks(arr, null, scopeKeyLabel));
        };

        // fallback scopes
        if (scope === "Following") {
            const followingSet = new Set((global.userData?.following || []).map((u) => u.uid));
            const base = all.filter((usr) => usr?.uid === global.userData?.uid || followingSet.has(usr?.uid));
            const visible = filterBlockedVisibility(base);
            if (hexFocusKey) {
                buildHexRanking(visible, `following_hex_${hexFocusKey}`);
                return;
            }
            const ranked = rankUsers(visible, comparedExercise, comparedMetric);
            setUserList(applyLastRanks(ranked, comparedExercise, 'following'));
        } else {
            const visible = filterBlockedVisibility(all);
            if (hexFocusKey) {
                buildHexRanking(visible, `global_hex_${hexFocusKey}`);
                return;
            }
            const ranked = rankUsers(visible, comparedExercise, comparedMetric);
            setUserList(applyLastRanks(ranked, comparedExercise, 'global'));
        }
    }, [bodyFocus, isCustomTribe, tribesHydrated, currentTribe, activeComparison, comparedExercise, comparedMetric, scope, selectedTribeId]);

    // Run recompute ONLY when ready. Otherwise keep showing cached list.
    useEffect(() => {
        if (!usersLoaded) return;
        if (isCustomTribe && (!tribesHydrated || !currentTribe)) return;
        recompute();
    }, [
        usersLoaded,
        isCustomTribe,
        tribesHydrated,
        currentTribe,
        comparedExercise,
        activeComparison,
        scope,
        recompute,
        userSignals.followingKey,
        userSignals.followersKey,
        userSignals.tribeKey,
        userSignals.statsKey,
        userSignals.hexagonKey,
        userSignals.profileKey,
    ]);

    // keep comp index valid
    useEffect(() => {
        if (activeCompIndex >= tribeComparisons.length) setActiveCompIndex(0);
    }, [tribeComparisons.length, activeCompIndex]);

    const rankedDisplay = useMemo(() => userList || [], [userList]);

    // When comparison or tribe changes, ensure block state is up to date
    useEffect(() => {
        if (!isCustomTribe) { setBlockedReason(null); return; }
        const needsBW = !!(activeComparison && activeComparison.normalizeByBodyweight);
        if (!needsBW) { setBlockedReason(null); return; }
        const myW = Number(global?.userData?.personalInfo?.weight || 0);
        if (myW > 0) { setBlockedReason(null); } else {
            setBlockedReason("This tribe’s comparison is normalized by bodyweight. Please enter your weight to view rankings.");
        }
    }, [isCustomTribe, selectedTribeId, activeComparison]);

    const openModal = () => setSelectExerciseModalVisible(true);
    const closeModal = () => setSelectExerciseModalVisible(false);
    const showUserStats = (user) => {
        setSelectedUser(user);
        setIsUserStatsBottomSheetVisible(true);
    };

    const handleActiveCompChange = useCallback((nextIndex) => {
        const total = Array.isArray(tribeComparisons) ? tribeComparisons.length : 0;
        const clampedIndex = total > 0 ? Math.min(Math.max(0, nextIndex), total - 1) : 0;
        setActiveCompIndex(clampedIndex);

        if (!isCustomTribe || !currentTribe) return;
        const comp = tribeComparisons[clampedIndex];
        if (!comp) return;

        const all = usersRef.current || [];
        const memberSet = new Set(currentTribe.members || []);
        const tribeUsers = all.filter((x) => memberSet.has(x?.uid));
        const tribeScopeKey = String(currentTribe?.id || selectedTribeId || '');
        const ranked = computeTribeRanking(tribeUsers, comp);
        setUserList(applyLastRanks(ranked, comp?.exercise, tribeScopeKey));
    }, [tribeComparisons, isCustomTribe, currentTribe, selectedTribeId]);

    const onOpenCreateFromMenu = useCallback(() => {
        setTribeMenuVisible(false);
        requestAnimationFrame(() => setCreateModalVisible(true));
    }, []);
    const onOpenJoinFromMenu = useCallback(() => {
        setTribeMenuVisible(false);
        requestAnimationFrame(() => setJoinModalVisible(true));
    }, []);
    const onOpenManageFromMenu = useCallback(() => {
        setTribeMenuVisible(false);
        requestAnimationFrame(() => setManageModalVisible(true));
    }, []);

    // ---- personal info flow (for bodyweight-normalized comparisons)
    const [personalSheetIndex, setPersonalSheetIndex] = useState(-1);
    const [infoForm, setInfoForm] = useState(() => ({
        gender: (global?.userData?.personalInfo?.gender || 'male'),
        activity: (global?.userData?.personalInfo?.activity || 'moderate'),
        goal: (global?.userData?.personalInfo?.goal || 'maintain'),
        weight: String(global?.userData?.personalInfo?.weight || ''),
        heightFt: String(global?.userData?.personalInfo?.heightFt || ''),
        heightIn: String(global?.userData?.personalInfo?.heightIn || ''),
    }));
    const [blockedReason, setBlockedReason] = useState(null); // string message shown instead of leaderboard

    useEffect(() => {
        // keep local form in sync when global updates externally
        const pi = global?.userData?.personalInfo;
        if (!pi) return;
        setInfoForm((s) => ({
            ...s,
            gender: pi.gender ?? s.gender,
            activity: pi.activity ?? s.activity,
            goal: pi.goal ?? s.goal,
            weight: (pi.weight != null ? String(pi.weight) : s.weight),
            heightFt: (pi.heightFt != null ? String(pi.heightFt) : s.heightFt),
            heightIn: (pi.heightIn != null ? String(pi.heightIn) : s.heightIn),
        }));
    }, [global?.userData?.personalInfo]);

    const savePersonalInfo = useCallback(async () => {
        const uid = global?.userData?.uid || global?.userData?.id;
        if (!uid) return;
        const clamp = (s, min, max) => {
            const n = parseInt(String(s || '0'), 10);
            if (Number.isNaN(n)) return min;
            return Math.max(min, Math.min(max, n));
        };
        const info = {
            gender: String(infoForm.gender || 'male'),
            activity: String(infoForm.activity || 'moderate'),
            goal: String(infoForm.goal || 'maintain'),
            weight: clamp(infoForm.weight, 0, 2000),
            heightFt: clamp(infoForm.heightFt, 0, 8),
            heightIn: clamp(infoForm.heightIn, 0, 11),
        };
        try {
            await updateDoc(doc(db, 'users', uid), { personalInfo: info, updatedAt: serverTimestamp() });
            try {
                global.userData = { ...(global.userData || {}), personalInfo: info };
                emitUserDataUpdate();
            } catch {}
            setBlockedReason(null);
        } catch (e) {
            console.log('savePersonalInfo error', e?.message || e);
        }
    }, [infoForm]);

    const handleCreateTribe = async () => {
        const uid = global?.userData?.uid;
        if (!uid || !newTribeName.trim()) return;
        const code = genCode(6);
        const ref = await addDoc(collection(db, "tribes"), {
            name: newTribeName.trim(),
            code,
            ownerUid: uid,
            members: [uid],
            comparisons: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "users", uid), { tribeIds: arrayUnion(ref.id) }).catch(() => { });
        setCreateModalVisible(false);
        setNewTribeName("");
        setSelectedTribeId(ref.id);
    };

    const handleJoinTribe = async () => {
        const uid = global?.userData?.uid;
        const code = (joinCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (!uid || !code) return;

        const q = query(collection(db, "tribes"), where("code", "==", code));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const d = snap.docs[0];
        const target = { id: d.id, ...d.data() };

        await updateDoc(doc(db, "tribes", target.id), {
            members: arrayUnion(uid),
            updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "users", uid), { tribeIds: arrayUnion(target.id) }).catch(() => { });
        setJoinModalVisible(false);
        setJoinCode("");
        setSelectedTribeId(target.id);
    };

    const handleLeaveTribe = async () => {
        const uid = global?.userData?.uid;
        if (!uid || !selectedTribeId) return;
        await updateDoc(doc(db, "tribes", selectedTribeId), {
            members: arrayRemove(uid),
            updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "users", uid), { tribeIds: arrayRemove(selectedTribeId) }).catch(() => { });
        setManageModalVisible(false);
        setSelectedTribeId(null);
    };

    const handleRenameTribe = async () => {
        const uid = global?.userData?.uid;
        const t = tribes.find((x) => x.id === selectedTribeId);
        if (!uid || !t || t.ownerUid !== uid || !renameInput.trim()) return;
        await updateDoc(doc(db, "tribes", selectedTribeId), {
            name: renameInput.trim(),
            updatedAt: serverTimestamp(),
        });
        setRenameInput("");
        setManageModalVisible(false);
    };

    const onSaveTribeComparisons = async (list) => {
        if (!selectedTribeId) return;
        await updateDoc(doc(db, "tribes", selectedTribeId), {
            comparisons: list,
            updatedAt: serverTimestamp(),
        });
        setComparisonManagerVisible(false);
        if (activeCompIndex >= list.length) setActiveCompIndex(0);
    };

    // Persist the user's last-viewed comparison for MiniPodium preview (supports Global, Following, Tribe)
    const lastViewRef = useRef("");
    useEffect(() => {
        const uid = global?.userData?.uid;
        if (!uid) return;

        // Build canonical lastView payload
        let payload = null;
        if (selectedTribeId) {
            payload = {
                type: "tribe",
                tribeId: selectedTribeId,
                comparison: activeComparison || null,
            };
        } else {
            payload = {
                type: scope === "Following" ? "following" : "global",
                exercise: comparedExercise,
                metric: comparedMetric || "1RM",
                bodyFocus,
            };
        }

        const key = JSON.stringify(payload);
        if (key === lastViewRef.current) return;
        lastViewRef.current = key;
        try {
            updateDoc(doc(db, "users", uid), { competitionLastView: payload }).catch(() => {});
        } catch { /* ignore */ }
    }, [selectedTribeId, activeComparison, scope, comparedExercise, comparedMetric, bodyFocus]);

    const bodyFocusLabel = useMemo(
        () => BODY_FOCUS_LABEL_MAP[bodyFocus] || BODY_FOCUS_LABEL_MAP[DEFAULT_BODY_FOCUS],
        [bodyFocus]
    );

    const scopeLabel = useMemo(() => {
        if (selectedTribeId) return "Tribe";
        return scope === "Following" ? "Following" : "Global";
    }, [selectedTribeId, scope]);

    const scopeSubtitle = useMemo(() => {
        if (!selectedTribeId) return null;
        const name = currentTribe?.name;
        return name ? String(name) : null;
    }, [selectedTribeId, currentTribe]);

    const hexFocusKey = useMemo(
        () => (typeof bodyFocus === 'string' && bodyFocus ? bodyFocus : DEFAULT_BODY_FOCUS),
        [bodyFocus]
    );
    const usingHexFocus = useMemo(
        () => !isCustomTribe && !!hexFocusKey,
        [isCustomTribe, hexFocusKey]
    );

    const dropdownLeft = useMemo(() => {
        const padding = SIZES.headerPaddingHorizontal;
        const baseX = Number(focusMenuAnchor?.x ?? padding);
        const approxWidth = scaleSize(180, "w");
        const maxLeft = Math.max(padding, width - approxWidth - padding);
        return Math.min(Math.max(baseX, padding), maxLeft);
    }, [focusMenuAnchor?.x, width]);

    const dropdownTop = useMemo(() => {
        const anchorY = Number(focusMenuAnchor?.y ?? 0);
        const anchorHeight = Number(focusMenuAnchor?.height ?? 0);
        return Math.max(0, anchorY + anchorHeight + scaleSize(6));
    }, [focusMenuAnchor?.y, focusMenuAnchor?.height]);

    const podiumData = useMemo(() => {
        if (!rankedDisplay || rankedDisplay.length === 0) return null;
        const top3 = rankedDisplay.slice(0, 3).map((u) => {
            let stat = 0;
            if (isCustomTribe && activeComparison) {
                stat = u?._tribeValue ?? 0;
            } else if (usingHexFocus) {
                const val = Number(u?.__hexValue ?? u?.statsHexagon?.[hexFocusKey] ?? 0);
                stat = Number.isFinite(val) ? val : 0;
            } else {
                const exStats = u?.statsExercises?.[comparedExercise] || {};
                stat = exStats?.[exerciseStatKey] ?? 0;
            }
            return { handle: u?.handle, pfp: u?.image, stat };
        });
        return top3.filter(Boolean);
    }, [rankedDisplay, isCustomTribe, activeComparison, usingHexFocus, hexFocusKey, comparedExercise, exerciseStatKey]);

    const headerGradientColors = useMemo(
        () => (isCustomTribe ? ["#c46f478c", "#3B28578c"] : ["#1B4F8A", "#133A6D", "#0F2743"]),
        [isCustomTribe]
    );

    const headerGradientLocations = useMemo(
        () => (isCustomTribe ? undefined : [0, 0.62, 1]),
        [isCustomTribe]
    );

    // Compute a custom leaderboard canvas color a couple shades lighter
    const leaderboardCanvas = useMemo(() => {
        const lightenColor = (hex, amount = 0.1) => {
            if (typeof hex !== 'string') return hex;
            let h = hex.replace('#', '').trim();
            let a = 1;
            if (h.length === 8) {
                const aa = h.slice(6, 8);
                a = Math.max(0, Math.min(1, parseInt(aa, 16) / 255));
                h = h.slice(0, 6);
            }
            if (h.length !== 6) return hex;
            const r = parseInt(h.slice(0, 2), 16);
            const g = parseInt(h.slice(2, 4), 16);
            const b = parseInt(h.slice(4, 6), 16);
            const mix = (c) => Math.round(c + (255 - c) * amount);
            const rr = mix(r), gg = mix(g), bb = mix(b);
            return `rgba(${rr}, ${gg}, ${bb}, ${a})`;
        };
        return lightenColor(theme.bg, 0.1);
    }, []);

    return (
        <View style={styles.mainContainer}>
            <Modal
                visible={isBodyFocusMenuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsBodyFocusMenuVisible(false)}
            >
                <View style={styles.focusModalOverlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setIsBodyFocusMenuVisible(false)}
                        android_ripple={{ color: "transparent" }}
                    />
                    <View style={[styles.focusDropdown, { top: dropdownTop, left: dropdownLeft }]}>
                        {BODY_FOCUS_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    styles.focusOption,
                                    opt.value === bodyFocus && styles.focusOptionActive,
                                ]}
                                onPress={withStrongPress(() => {
                                    setBodyFocus(opt.value);
                                    setIsBodyFocusMenuVisible(false);
                                })}
                            >
                                <Text
                                    style={[
                                        styles.focusOptionLabel,
                                        opt.value === bodyFocus && styles.focusOptionLabelActive,
                                    ]}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
            <View style={{ paddingTop: insets.top + SIZES.headerPaddingTop }}>
                <View
                    style={[
                        styles.viewTabsContainer,
                        { paddingHorizontal: SIZES.headerPaddingHorizontal },
                    ]}
                >
                    {VIEW_TABS.map((tab) => {
                        const isActive = activeCompetitionTab === tab.key;
                        return (
                            <RNBounceable
                                key={tab.key}
                                onPress={withStrongPress(() => handleCompetitionTabPress(tab.key))}
                                style={styles.viewTabButton}
                                activeScale={0.97}
                                accessibilityRole="button"
                                accessibilityLabel={`Switch to ${tab.label}`}
                            >
                                <Text
                                    style={[
                                        styles.viewTabLabel,
                                        isActive && styles.viewTabLabelActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                                <View
                                    style={[
                                        styles.viewTabIndicator,
                                        isActive && styles.viewTabIndicatorActive,
                                    ]}
                                />
                            </RNBounceable>
                        );
                    })}
                </View>
                <View style={styles.headerGradientWrapper}>
                    <LinearGradient
                        pointerEvents="none"
                        colors={headerGradientColors}
                        locations={headerGradientLocations}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.headerGradient}
                    />
                    <View style={[styles.header, { paddingHorizontal: SIZES.headerPaddingHorizontal }]}>
                        <View style={styles.headerLeftContainer}>
                            {renderHeaderLeftContent()}
                        </View>
                        <View style={styles.headerRightContainer}>
                            {isLeaderboardView && (
                                <RNBounceable
                                    onPress={withStrongPress(() => setTribeMenuVisible(true))}
                                    style={styles.scopeToggle}
                                    activeScale={0.96}
                                    hitSlop={{ top: SIZES.tribeHitSlop, bottom: SIZES.tribeHitSlop, left: SIZES.tribeHitSlop, right: SIZES.tribeHitSlop }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Change leaderboard scope"
                                >
                                    <Ionicons
                                        name="chevron-down"
                                        size={Math.max(18, SIZES.headerIconSize - SIZES.chevronDelta)}
                                        color="rgba(255,255,255,0.95)"
                                        style={{ marginRight: SIZES.chevronML, marginTop: SIZES.chevronMT, opacity: 0 }}
                                    />
                                    {scopeSubtitle ? (
                                        <Text
                                            style={[styles.tribeLabel, styles.tribeLabelTwoLine]}
                                            numberOfLines={2}
                                            ellipsizeMode="tail"
                                        >
                                            {scopeLabel}
                                            {"\n"}
                                            <Text style={styles.tribeSubtitleInline}>{scopeSubtitle}</Text>
                                        </Text>
                                    ) : (
                                        <Text style={styles.tribeLabel} numberOfLines={1} ellipsizeMode="tail">
                                            {scopeLabel}
                                        </Text>
                                    )}
                                    <Ionicons
                                        name="chevron-down"
                                        size={Math.max(18, SIZES.headerIconSize - SIZES.chevronDelta)}
                                        color="rgba(255,255,255,0.95)"
                                        style={{ marginLeft: SIZES.chevronML, marginTop: SIZES.chevronMT }}
                                    />
                                </RNBounceable>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.scrollRegion}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: scrollBottomPadding },
                ]}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="never"
                bounces
            >
                {activeCompetitionTab === "leaderboard" ? (
                    <>
                        <InfoPanel isVisible={false} opacity={infoPanelOpacityRef.current} />
                        <View style={[styles.podiumSection, { height: podiumSectionHeight }]}>
                            <Podium data={podiumData} isTribeFocused={isCustomTribe} topOffset={STAGE_VERTICAL_OFFSET} />
                        </View>
                        <View style={{ marginTop: -panelOverlap }}>
                            <LeaderboardPanel
                                userList={rankedDisplay}
                                categoryCompared={comparedExercise}
                                comparedMetric={comparedMetric}
                                scopeKey={scope}
                                onToggleMetric={() =>
                                    setComparedMetric((prev) => (prev === "1RM" ? "Volume" : prev === "Volume" ? "Reps" : "1RM"))
                                }
                                openModal={() => setSelectExerciseModalVisible(true)}
                                onUserPress={showUserStats}
                                isHexFocus={usingHexFocus}
                                hexFocusKey={hexFocusKey}
                                hexFocusLabel={bodyFocusLabel}
                                isTribeFocused={isCustomTribe}
                                tribeComparisons={tribeComparisons}
                                activeCompIndex={activeCompIndex}
                                onActiveCompChange={handleActiveCompChange}
                                tribeComparisonSummary={activeComparison ? summaryOf(activeComparison) : "Not set"}
                                onOpenTribeComparison={() => setComparisonManagerVisible(true)}
                                blockedMessage={blockedReason}
                                onResolveBlocked={() => setPersonalSheetIndex(1)}
                                canvasColor={leaderboardCanvas}
                                minHeightOverride={panelCollapsedHeight}
                                containerStyle={styles.leaderboardContainer}
                            />
                        </View>
                    </>
                ) : activeCompetitionTab === "exercises" ? (
                    <View style={styles.exercisesSection}>
                        <View style={styles.exerciseGrid}>
                            {PLACEHOLDER_EXERCISES.map((exercise, index) => {
                                const isRowEnd = (index + 1) % 3 === 0;
                                return (
                                    <View
                                        key={exercise.key}
                                        style={[
                                            styles.exerciseCard,
                                            {
                                                width: EXERCISE_CARD_WIDTH,
                                                aspectRatio: EXERCISE_CARD_ASPECT_RATIO,
                                                marginRight: isRowEnd ? 0 : EXERCISE_CARD_GAP,
                                                marginBottom: EXERCISE_CARD_GAP,
                                            },
                                        ]}
                                    >
                                        <View style={styles.exerciseImageWrapper}>
                                            <Image source={exercise.image} style={styles.exerciseImage} />
                                        </View>
                                        <View style={styles.exerciseInfo}>
                                            <Text style={styles.exerciseName} numberOfLines={2}>
                                                {exercise.title}
                                            </Text>
                                            <Text style={styles.exerciseMuscle} numberOfLines={1}>
                                                {exercise.muscle}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                ) : (
                    <View style={styles.altTabPlaceholder}>
                        <Text style={styles.altTabPlaceholderText}>{nonLeaderboardMessage}</Text>
                    </View>
                )}
            </ScrollView>

            <UserStatsBottomSheet
                user={selectedUser}
                navigation={navigation}
                isVisible={isUserStatsBottomSheetVisible}
                setIsVisible={setIsUserStatsBottomSheetVisible}
                sheetProgressSV={userStatsSheetProgress}
            />

            <Footer currentScreenName={"Competition"} navigation={navigation} />

            <Modal
                animationType="fade"
                transparent
                statusBarTranslucent
                visible={selectExerciseModalVisible}
                onRequestClose={closeModal}
                presentationStyle="overFullScreen"
            >
                <SelectExerciseModal closeModal={closeModal} setComparedExercise={setComparedExercise} />
            </Modal>

            <TribeMenu
                visible={tribeMenuVisible}
                tribes={tribes}
                selectedTribeId={selectedTribeId}
                scope={scope}
                onClose={() => setTribeMenuVisible(false)}
                onSelectGlobal={() => {
                    setSelectedTribeId(null);
                    setScope("Global");
                    setTribeMenuVisible(false);
                }}
                onSelectFollowing={() => {
                    setSelectedTribeId(null);
                    setScope("Following");
                    setTribeMenuVisible(false);
                }}
                onSelectTribe={(id) => {
                    const tribe = tribes.find((t) => t.id === id);
                    // Determine the comparison that will be active for this tribe
                    const comps = (Array.isArray(tribe?.comparisons) && tribe.comparisons.length)
                        ? tribe.comparisons
                        : (tribe?.comparison ? [tribe.comparison] : []);
                    const activeIdx = Math.min(activeCompIndex, Math.max(0, comps.length - 1));
                    const cmp = comps[activeIdx] || null;
                    const needsBW = !!(cmp && cmp.normalizeByBodyweight);

                    setSelectedTribeId(id);
                    setTribeMenuVisible(false);

                    if (needsBW) {
                        const myW = Number(global?.userData?.personalInfo?.weight || 0);
                        if (!(myW > 0)) {
                            setBlockedReason("This tribe’s comparison is normalized by bodyweight. Please enter your weight to view rankings.");
                            // prompt immediately
                            requestAnimationFrame(() => setPersonalSheetIndex(1));
                        } else {
                            setBlockedReason(null);
                        }
                    } else {
                        setBlockedReason(null);
                    }
                }}
                onCreatePress={() => {
                    setTribeMenuVisible(false);
                    requestAnimationFrame(() => setCreateModalVisible(true));
                }}
                onJoinPress={() => {
                    setTribeMenuVisible(false);
                    requestAnimationFrame(() => setJoinModalVisible(true));
                }}
            />

            <CreateTribeModal
                visible={createModalVisible}
                value={newTribeName}
                onChangeText={setNewTribeName}
                onCancel={() => setCreateModalVisible(false)}
                onCreate={handleCreateTribe}
            />

            <JoinTribeModal
                visible={joinModalVisible}
                value={joinCode}
                onChangeText={setJoinCode}
                onCancel={() => setJoinModalVisible(false)}
                onJoin={handleJoinTribe}
            />

            <ManageTribeModal
                visible={manageModalVisible}
                tribe={currentTribe}
                isOwner={currentTribe ? currentTribe.ownerUid === global?.userData?.uid : false}
                renameValue={renameInput}
                onChangeRename={setRenameInput}
                onCancel={() => setManageModalVisible(false)}
                onRename={handleRenameTribe}
                onLeave={handleLeaveTribe}
            />

            <TribeComparisonModal
                visible={comparisonManagerVisible}
                onClose={() => setComparisonManagerVisible(false)}
                initialList={tribeComparisons}
                onSaveList={async (list, options) => {
                    if (!selectedTribeId) return;
                    await updateDoc(doc(db, "tribes", selectedTribeId), {
                        comparisons: list,
                        updatedAt: serverTimestamp(),
                    });
                    if (activeCompIndex >= list.length) setActiveCompIndex(0);
                    if (options?.finalize ?? true) setComparisonManagerVisible(false);
                }}
            />

            {/* Personal Info sheet (reused from Macro Tracking) */}
            <PersonalInfoSheet
                index={personalSheetIndex}
                onChangeIndex={setPersonalSheetIndex}
                goalForm={infoForm}
                setGoalForm={setInfoForm}
                onClose={() => setPersonalSheetIndex(-1)}
                onSave={async () => { await savePersonalInfo(); setPersonalSheetIndex(-1); }}
                COLORS={{
                    text: theme.textPrimary,
                    subtext: theme.textSecondary,
                    card: theme.surface,
                    hairline: theme.hairline,
                    accentBlue: theme.primary,
                    fieldBg: theme.field,
                }}
            />
        </View>
    );
}
const styles = StyleSheet.create({
    // Dark mode background for Competition screen (lighter MFP-like)
    mainContainer: { flex: 1, backgroundColor: theme.bg },
    scrollRegion: { flex: 1 },
    scrollContent: { paddingTop: 0, flexGrow: 1 },
    podiumSection: { width: "100%", position: "relative", justifyContent: "flex-end", overflow: "hidden", marginTop: -PODIUM_PULLUP },
    leaderboardContainer: { alignSelf: "stretch" },
    viewTabsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: scaleSize(18),
    },
    viewTabButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(4),
    },
    viewTabLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(14),
        color: "rgba(255,255,255,0.45)",
    },
    viewTabLabelActive: {
        color: "rgba(255,255,255,0.98)",
    },
    viewTabIndicator: {
        marginTop: scaleSize(6),
        height: scaleSize(3),
        width: "55%",
        borderRadius: scaleSize(999),
        backgroundColor: "transparent",
    },
    viewTabIndicatorActive: {
        backgroundColor: "rgba(255,255,255,0.9)",
    },
    exercisesSection: {
        paddingHorizontal: SIZES.headerPaddingHorizontal,
        paddingTop: scaleSize(12),
    },
    exerciseGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    exerciseCard: {
        backgroundColor: theme.surface,
        borderRadius: scaleSize(16),
        overflow: "hidden",
    },
    exerciseImageWrapper: {
        flex: 3,
        backgroundColor: theme.fieldDeep,
        alignItems: "center",
        justifyContent: "center",
    },
    exerciseImage: {
        width: "90%",
        height: "90%",
        resizeMode: "contain",
    },
    exerciseInfo: {
        flex: 2,
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(10),
        justifyContent: "center",
        backgroundColor: theme.surface,
    },
    exerciseName: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: ts(13),
        color: theme.textPrimary,
    },
    exerciseMuscle: {
        fontFamily: "Outfit_500Medium",
        fontSize: ts(11),
        color: theme.textSecondary,
        marginTop: scaleSize(4),
    },
    altTabPlaceholder: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(120),
    },
    altTabPlaceholderText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(16),
        color: "rgba(255,255,255,0.55)",
    },
    headerGradientWrapper: {
        width: "100%",
        position: "relative",
        overflow: "visible",
        paddingBottom: HEADER_GRADIENT_OVERLAP,
        marginBottom: -HEADER_GRADIENT_OVERLAP,
    },
    headerGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        paddingTop: SIZES.headerPaddingTop,
        alignItems: "center",
    },
    headerLeftContainer: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
    },
    headerOverlayRow: {
        width: "100%",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "flex-start",
    },
    headerRightContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        flexShrink: 0,
    },
    headerLeftOverlayContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        alignSelf: "flex-start",
        flexShrink: 1,
    },
    scopeToggle: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "center",
        marginTop: SIZES.selectorOffset,
    },
    tribeLabelTwoLine: {
        textAlign: "center",
        marginRight: SIZES.tribeLabelMarginRight,
        lineHeight: scaleSizeFont(SIZES.tribeLabelFont) + scaleSize(2),
    },
    focusToggleWrap: {
        position: "relative",
        marginTop: SIZES.selectorOffset,
    },
    manageButtonWrap: {
        position: "relative",
        marginTop: SIZES.selectorOffset,
    },
    focusToggle: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(10),
        borderRadius: scaleSize(18),
        backgroundColor: "rgba(178, 199, 243, 0.32)",
    },
    manageButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(8),
        borderRadius: scaleSize(18),
        backgroundColor: "rgba(191, 111, 87, 0.44)",
    },
    manageButtonIcon: {
        marginRight: scaleSize(6),
        marginTop: scaleSize(1),
    },
    manageButtonLabel: {
        color: "#fff",
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSizeFont(14),
        includeFontPadding: false,
        letterSpacing: 0.2,
    },
    focusToggleLabel: {
        color: "#fff",
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSizeFont(14),
        includeFontPadding: false,
        letterSpacing: 0.2,
        maxWidth: scaleSize(140, "w"),
    },
    focusToggleIcon: {
        marginLeft: scaleSize(6),
        marginTop: scaleSize(1),
    },
    focusDropdown: {
        position: "absolute",
        borderRadius: scaleSize(16),
        backgroundColor: "rgba(13, 36, 61, 0.96)",
        paddingVertical: scaleSize(6),
        minWidth: scaleSize(158, "w"),
        borderWidth: scaleSize(1),
        borderColor: "rgba(255,255,255,0.18)",
        shadowColor: "#000",
        shadowOpacity: 0.22,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: scaleSize(6) },
        elevation: 6,
    },
    focusOption: {
        paddingVertical: scaleSize(8),
        paddingHorizontal: scaleSize(14),
        borderRadius: scaleSize(12),
        marginHorizontal: scaleSize(6),
    },
    focusOptionActive: {
        backgroundColor: "rgba(45,158,255,0.18)",
    },
    focusOptionLabel: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSizeFont(13),
        color: "rgba(255,255,255,0.86)",
        letterSpacing: 0.15,
    },
    focusOptionLabelActive: {
        color: "#fff",
    },
    focusModalOverlay: {
        flex: 1,
    },
    tribeLabel: {
        color: "#fff",
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSizeFont(SIZES.tribeLabelFont),
        includeFontPadding: false,
        maxWidth: SIZES.tribeLabelMaxWidth,
        letterSpacing: 0.2,
        marginRight: SIZES.tribeLabelMarginRight,
        textAlign: "center",
    },
    tribeSubtitleInline: {
        color: "rgba(255,255,255,0.72)",
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSizeFont(12.5),
        includeFontPadding: false,
        letterSpacing: 0.2,
    },
});
