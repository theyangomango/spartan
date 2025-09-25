// screens/Competition.jsx
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
    StyleSheet,
    View,
    Modal,
    TouchableOpacity,
    Animated,
    SafeAreaView,
    Dimensions,
    Text,
    InteractionManager,
    Pressable,
} from "react-native";
import Podium from "../components/2_Competition/Podium";
import rankUsers from "../helper/rankUsers";
import LeaderboardBottomSheet from "../components/2_Competition/LeaderboardBottomSheet";
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

import scaleSizeFont from "../helper/scaleSize";
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
    headerPaddingTop: scaleSize(8, "h"),            // top padding scales with height

    tribeHitSlop: scaleSize(8),

    tribeLabelFont: scaleSize(15),
    tribeLabelMaxWidth: scaleSize(160),
    tribeLabelMarginRight: scaleSize(2),

    // icon margins
    iconMR: scaleSize(6),
    iconMT: scaleSize(1),
    chevronML: scaleSize(4),
    chevronMT: scaleSize(1),
};

const STAGE_VERTICAL_OFFSET = scaleSize(25);

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

// -------- tiny persistence (no deps) --------
const GLOBAL_KEY = "__competition_state__";
const getPersisted = () =>
    (global[GLOBAL_KEY] && typeof global[GLOBAL_KEY] === "object" ? global[GLOBAL_KEY] : {});
const setPersisted = (patch) => {
    const curr = getPersisted();
    global[GLOBAL_KEY] = { ...curr, ...patch };
};

// module fallbacks (if global gets cleared)
let LAST_SCOPE = "Global";
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
    const usersRef = useRef([]);
    const userUnsubRef = useRef(null);
    // hydrate leaderboard from last saved view (backend)
    const appliedLastViewRef = useRef(false);
    const pendingTribeCompRef = useRef(null);

    // hydrate from global/module caches
    const persisted = getPersisted();

    const [userList, setUserList] = useState(persisted.userList ?? LAST_USERLIST);
    const [comparedExercise, setComparedExercise] = useState("Bench Press (Barbell)");
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

    const [bodyFocus, setBodyFocus] = useState(
        persisted.bodyFocus ?? LAST_BODY_FOCUS ?? DEFAULT_BODY_FOCUS
    );
    const [isBodyFocusMenuVisible, setIsBodyFocusMenuVisible] = useState(false);
    const focusToggleAnchorRef = useRef(null);
    const [focusMenuAnchor, setFocusMenuAnchor] = useState({ x: SIZES.headerPaddingHorizontal, y: 0, width: 0, height: 0 });

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

    const [userSignals, setUserSignals] = useState({ followingKey: "", followersKey: "", tribeKey: "" });

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

        setUserSignals((prev) => {
            if (prev.followingKey === followingKey && prev.followersKey === followersKey && prev.tribeKey === tribeKey) return prev;
            return { followingKey, followersKey, tribeKey };
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
                if (lastView.exercise) setComparedExercise(lastView.exercise);
                if (lastView.metric) setComparedMetric(lastView.metric);
                if (typeof lastView.bodyFocus === 'string' && lastView.bodyFocus) setBodyFocus(lastView.bodyFocus);
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
                    if (lv.exercise) setComparedExercise(lv.exercise);
                    if (lv.metric) setComparedMetric(lv.metric);
                    if (typeof lv.bodyFocus === 'string' && lv.bodyFocus) setBodyFocus(lv.bodyFocus);
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
    }, [usersLoaded, isCustomTribe, tribesHydrated, currentTribe, comparedExercise, activeComparison, scope, recompute, userSignals.followingKey, userSignals.followersKey, userSignals.tribeKey]);

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
    const openBottomSheet = (user) => {
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
        if (selectedTribeId) return currentTribe?.name || "Tribe";
        return scope === "Following" ? "Following" : "Global";
    }, [selectedTribeId, currentTribe, scope]);

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
                                activeOpacity={0.7}
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
            <SafeAreaView>
                <View
                    style={[
                        styles.header,
                        {
                            paddingHorizontal: SIZES.headerPaddingHorizontal,
                            paddingTop: SIZES.headerPaddingTop,
                        },
                    ]}
                >
                    <View style={styles.headerLeftContainer}>
                        <View ref={focusToggleAnchorRef} collapsable={false} style={styles.focusToggleWrap}>
                            <RNBounceable
                                onPress={withStrongPress(handleToggleFocusMenu)}
                                style={[styles.focusToggle, isCustomTribe && styles.focusToggleDisabled]}
                                activeScale={0.96}
                                accessibilityRole="button"
                                accessibilityLabel="Change leaderboard focus"
                                disabled={isCustomTribe}
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
                    </View>
                    <View style={styles.headerRightContainer}>
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
                            <Text style={styles.tribeLabel} numberOfLines={1} ellipsizeMode="tail">
                                {scopeLabel}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={Math.max(18, SIZES.headerIconSize - SIZES.chevronDelta)}
                                color="rgba(255,255,255,0.95)"
                                style={{ marginLeft: SIZES.chevronML, marginTop: SIZES.chevronMT }}
                            />
                        </RNBounceable>
                    </View>
                </View>
            </SafeAreaView>

            <InfoPanel isVisible={false} opacity={useRef(new Animated.Value(0)).current} />
            <Podium data={podiumData} isTribeFocused={isCustomTribe} topOffset={STAGE_VERTICAL_OFFSET} />

            <LeaderboardBottomSheet
                userList={rankedDisplay}
                categoryCompared={comparedExercise}
                comparedMetric={comparedMetric}
                onToggleMetric={() =>
                    setComparedMetric((prev) => (prev === "1RM" ? "Volume" : prev === "Volume" ? "Reps" : "1RM"))
                }
                openModal={() => setSelectExerciseModalVisible(true)}
                openBottomSheet={(u) => {
                    setSelectedUser(u);
                    setIsUserStatsBottomSheetVisible(true);
                }}
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
                topOffset={STAGE_VERTICAL_OFFSET}
            />

            <UserStatsBottomSheet
                user={selectedUser}
                navigation={navigation}
                isVisible={isUserStatsBottomSheetVisible}
                setIsVisible={setIsUserStatsBottomSheetVisible}
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
                onManagePress={() => {
                    setTribeMenuVisible(false);
                    requestAnimationFrame(() => setManageModalVisible(true));
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
    header: {
        alignItems: "center",
        justifyContent: "space-between",
        flexDirection: "row",
        width: "100%",
    },
    headerLeftContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        minWidth: 0,
    },
    headerRightContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        flexShrink: 0,
    },
    scopeToggle: {
        flexDirection: "row",
        alignItems: "center",
    },
    focusToggleWrap: {
        position: "relative",
    },
    focusToggle: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(14),
        paddingVertical: scaleSize(8),
        borderRadius: scaleSize(18),
        backgroundColor: "rgba(255,255,255,0.14)",
    },
    focusToggleDisabled: {
        opacity: 0.5,
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
        marginRight: SIZES.tribeLabelMarginRight,
        letterSpacing: 0.2,
    },
});
