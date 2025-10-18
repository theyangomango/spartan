import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
    StyleSheet,
    View,
    Modal,
    TouchableOpacity,
    Animated as RNAnimated,
    Text,
    Pressable,
    ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSharedValue } from "react-native-reanimated";
import RNBounceable from "@freakycoder/react-native-bounceable";

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

import useStableSafeAreaInsets from "../../../hooks/useStableSafeAreaInsets";
import rankUsers from "../../../helper/rankUsers";
import getAllUsers from "../../../helper/getAllUsers";
import { db } from "../../../../firebase.config";
import theme from "../../../theme/mfpDark";
import { subscribeUserData, emitUserDataUpdate } from "../../../utils/userDataEvents";
import { canViewerAccessProfile } from "../../../utils/workoutPrivacy";
import { withStrongPress } from "../../../utils/haptics";

import Podium, { PODIUM_HEIGHT } from "../Podium";
import LeaderboardPanel from "../LeaderboardPanel";
import UserStatsBottomSheet from "../UserStats/UserStatsBottomSheet";
import SelectExerciseModal from "../SelectExercise/SelectExerciseModal";
import InfoPanel from "../InfoPanel";
import TribeMenu from "../TribeMenu";
import CreateTribeModal from "../CreateTribeModal";
import JoinTribeModal from "../JoinTribeModal";
import ManageTribeModal from "../ManageTribeModal";
import TribeComparisonModal from "../TribeComparisonModal";
import PersonalInfoSheet from "../../2_MacroTracking/PersonalInfoSheet";
import {
    scaleSize,
    SIZES,
    HEADER_GRADIENT_OVERLAP,
    PODIUM_PULLUP,
    DEVICE_WIDTH,
    DEVICE_HEIGHT,
    scaleFont,
} from "../layoutConstants";

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

const STAGE_VERTICAL_OFFSET = scaleSize(0);

const GLOBAL_KEY = "__competition_state__";
const getPersisted = () =>
    (global[GLOBAL_KEY] && typeof global[GLOBAL_KEY] === "object" ? global[GLOBAL_KEY] : {});
const setPersisted = (patch) => {
    const curr = getPersisted();
    global[GLOBAL_KEY] = { ...curr, ...patch };
};

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
        const raw = metric === "1RM" ? ex?.["1RM"] ?? 0
            : metric === "Volume" ? ex?.["Volume"] ?? 0
            : ex?.["Reps"] ?? 0;

        if (normalizeByBodyweight) {
            const weight = Number(safeBodyweight(u)) || 0;
            const hasWeight = weight > 0;
            const val = hasWeight ? Number(raw) / weight : NaN;
            return {
                ...u,
                _tribeValue: hasWeight && Number.isFinite(val) ? val : null,
                __noWeightForBW: !hasWeight,
            };
        }

        const val = Number(raw);
        return { ...u, _tribeValue: Number.isFinite(val) ? val : 0, __noWeightForBW: false };
    });

    list.sort((a, b) => {
        if (comparison?.normalizeByBodyweight) {
            const an = !!a.__noWeightForBW;
            const bn = !!b.__noWeightForBW;
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
    const metricLabel = c.metric === "1RM" ? "1RM (Adj)" : c.metric;
    const parts = [c.exercise, metricLabel];
    if (c.normalizeByBodyweight) parts.push("per lb bodyweight");
    return parts.join(" • ");
};

function filterBlockedVisibility(list) {
    try {
        const meUid = String(global?.userData?.uid || "");
        if (!meUid) return list;
        const myBlocked = Array.isArray(global?.userData?.blocked) ? global.userData.blocked : [];
        const myBlockedSet = new Set(
            myBlocked.map((x) => String((x && (x.uid || x.id)) || x || ""))
        );
        const viewerData = (() => {
            try {
                return global?.userData || null;
            } catch {
                return null;
            }
        })();
        const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";
        const theyBlockedMe = (u) => {
            const arr = Array.isArray(u?.blocked) ? u.blocked : [];
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                const uid = String((item && (item.uid || item.id)) || item || "");
                if (uid === meUid) return true;
            }
            return false;
        };
        return (Array.isArray(list) ? list : []).filter((u) => {
            const uid = String(u?.uid || "");
            if (!uid) return false;
            if (uid === meUid) return true;
            if (myBlockedSet.has(uid)) return false;
            if (theyBlockedMe(u)) return false;
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

export default function LeaderboardsSection({ navigation }) {
    const insets = useStableSafeAreaInsets();
    const podiumSectionHeight = useMemo(() => PODIUM_HEIGHT, []);
    const panelOverlap = useMemo(() => scaleSize(12), []);
    const panelCollapsedHeight = useMemo(
        () => Math.max(1, Math.ceil(DEVICE_HEIGHT - podiumSectionHeight + panelOverlap)),
        [podiumSectionHeight, panelOverlap]
    );
    const scrollBottomPadding = useMemo(
        () => Math.max(scaleSize(32), (insets?.bottom || 0) + scaleSize(12)),
        [insets?.bottom]
    );

    const usersRef = useRef([]);
    const appliedLastViewRef = useRef(false);

    const persisted = getPersisted();

    const [userList, setUserList] = useState(persisted.userList ?? LAST_USERLIST);
    const [comparedExercise, setComparedExercise] = useState("Overall");
    const [scope, setScope] = useState(persisted.scope ?? LAST_SCOPE);

    useEffect(() => {
        if (persisted?.scope === "All Followers") setScope("Following");
    }, [persisted?.scope]);

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
    const scopeToggleAnchorRef = useRef(null);
    const [tribeMenuAnchor, setTribeMenuAnchor] = useState({
        x: SIZES.headerPaddingHorizontal,
        y: 0,
        width: 0,
        height: 0,
    });
    const focusToggleAnchorRef = useRef(null);
    const [focusMenuAnchor, setFocusMenuAnchor] = useState({
        x: SIZES.headerPaddingHorizontal,
        y: 0,
        width: 0,
        height: 0,
    });
    const userStatsSheetProgress = useSharedValue(0);
    const infoPanelOpacityRef = useRef(new RNAnimated.Value(0));

    const [tribes, setTribes] = useState([]);
    const [selectedTribeId, setSelectedTribeId] = useState(
        persisted.selectedTribeId ?? LAST_SELECTED_TRIBE_ID
    );
    const [tribeMenuVisible, setTribeMenuVisible] = useState(false);

    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [joinModalVisible, setJoinModalVisible] = useState(false);
    const [manageModalVisible, setManageModalVisible] = useState(false);

    const [newTribeName, setNewTribeName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [renameInput, setRenameInput] = useState("");

    const [comparisonManagerVisible, setComparisonManagerVisible] = useState(false);
    const [activeCompIndex, setActiveCompIndex] = useState(0);

    useEffect(() => {
        LAST_SCOPE = scope;
        setPersisted({ scope });
    }, [scope]);
    useEffect(() => {
        LAST_SELECTED_TRIBE_ID = selectedTribeId;
        setPersisted({ selectedTribeId });
    }, [selectedTribeId]);
    useEffect(() => {
        LAST_USERLIST = userList;
        setPersisted({ userList });
    }, [userList]);
    useEffect(() => {
        LAST_BODY_FOCUS = bodyFocus;
        setPersisted({ bodyFocus });
    }, [bodyFocus]);

    const [userSignals, setUserSignals] = useState({
        followingKey: "",
        followersKey: "",
        tribeKey: "",
        statsKey: "",
        hexagonKey: "",
        profileKey: "",
    });

    useEffect(
        () =>
            subscribeUserData((data) => {
                const normalizeList = (list) => {
                    if (!Array.isArray(list) || !list.length) return "[]";
                    const mapped = list
                        .map((entry) => {
                            if (!entry) return "";
                            if (typeof entry === "string" || typeof entry === "number")
                                return String(entry);
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
                        })
                        .filter(Boolean);
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
                        const pieces = Object.keys(stats)
                            .sort()
                            .map((exercise) => {
                                const entry = stats[exercise] || {};
                                const best = entry.bestSet
                                    ? `${entry.bestSet.reps || 0}x${entry.bestSet.weight || 0}`
                                    : "";
                                return `${exercise}:${entry["1RM"] || 0}:${
                                    entry.Volume || 0
                                }:${entry.Reps || 0}:${best}`;
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
                        return Object.keys(hex)
                            .sort()
                            .map((k) => `${k}:${hex[k] || 0}`)
                            .join("|");
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
                    return {
                        followingKey,
                        followersKey,
                        tribeKey,
                        statsKey,
                        hexagonKey,
                        profileKey,
                    };
                });
            }),
        []
    );

    const initUsers = useCallback(async () => {
        const allUsers = await getAllUsers();
        usersRef.current = allUsers;
        setUsersLoaded(true);
    }, []);

    useEffect(() => {
        initUsers();
    }, [initUsers]);

    useEffect(() => {
        const hydrateFromLastView = (lastView) => {
            if (appliedLastViewRef.current) return;
            if (!lastView || typeof lastView !== "object") return;
            appliedLastViewRef.current = true;

            const type = String(lastView.type || "").toLowerCase();
            if (type === "tribe" && lastView.tribeId) {
                setScope("Tribe");
                setSelectedTribeId(String(lastView.tribeId));
                if (lastView.comparison) {
                    try {
                        const idx = Number(lastView.comparisonIndex || 0);
                        if (Number.isFinite(idx)) setActiveCompIndex(Math.max(0, idx));
                    } catch {
                        //
                    }
                }
                return;
            }
            if (type === "following" || type === "followers") {
                setScope("Following");
            } else {
                setScope("Global");
            }
            if (lastView.exercise) setComparedExercise(String(lastView.exercise));
            if (lastView.metric) setComparedMetric(String(lastView.metric));
            if (lastView.bodyFocus && BODY_FOCUS_LABEL_MAP[lastView.bodyFocus]) {
                setBodyFocus(String(lastView.bodyFocus));
            }
        };

        const uid = global?.userData?.uid;
        if (!uid) return;
        try {
            const lastView = global?.userData?.competitionLastView;
            hydrateFromLastView(lastView);
        } catch {
            //
        }
    }, []);

    const [blockedReason, setBlockedReason] = useState(null);

    const handleToggleFocusMenu = useCallback(() => {
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
    }, [isBodyFocusMenuVisible]);

    useEffect(() => {
        if (isBodyFocusMenuVisible) return;
        setFocusMenuAnchor({
            x: SIZES.headerPaddingHorizontal,
            y: 0,
            width: 0,
            height: 0,
        });
    }, [isBodyFocusMenuVisible]);
    useEffect(() => {
        if (tribeMenuVisible) return;
        setTribeMenuAnchor({
            x: SIZES.headerPaddingHorizontal,
            y: 0,
            width: 0,
            height: 0,
        });
    }, [tribeMenuVisible]);

    useEffect(() => {
        if (isUserStatsBottomSheetVisible) {
            userStatsSheetProgress.value = 1;
        }
    }, [isUserStatsBottomSheetVisible, userStatsSheetProgress]);

    useEffect(() => {
        const uid = global?.userData?.uid;
        if (!uid) return;
        const tribesRef = collection(db, "tribes");
        const q = query(tribesRef, where("members", "array-contains", uid));
        const unsub = onSnapshot(q, (snap) => {
            const t = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setTribes(t);
            setTribesHydrated(true);
            if (selectedTribeId && !t.find((x) => x.id === selectedTribeId)) {
                setSelectedTribeId(null);
            }
        });
        return unsub;
    }, [selectedTribeId]);

    const isCustomTribe = useMemo(
        () => !!selectedTribeId && !!tribes.find((t) => t.id === selectedTribeId),
        [selectedTribeId, tribes]
    );
    const currentTribe = useMemo(
        () => tribes.find((t) => t.id === selectedTribeId) || null,
        [tribes, selectedTribeId]
    );
    const tribeComparisons = useMemo(() => {
        if (!currentTribe) return [];
        if (Array.isArray(currentTribe.comparisons) && currentTribe.comparisons.length) {
            return currentTribe.comparisons;
        }
        if (currentTribe.comparison) return [currentTribe.comparison];
        return [];
    }, [currentTribe]);
    const activeComparison = useMemo(
        () => tribeComparisons[Math.min(activeCompIndex, Math.max(0, tribeComparisons.length - 1))] || null,
        [tribeComparisons, activeCompIndex]
    );

    const recompute = useCallback(() => {
        const all = usersRef.current || [];
        const hexFocusKey = typeof bodyFocus === "string" && bodyFocus ? bodyFocus : null;

        if (isCustomTribe) {
            if (!tribesHydrated || !currentTribe) return;

            const memberSet = new Set(currentTribe.members || []);
            const tribeUsers = all.filter((u) => memberSet.has(u?.uid));
            const visible = filterBlockedVisibility(tribeUsers);
            const tribeScopeKey = String(currentTribe?.id || selectedTribeId || "");
            if (activeComparison) {
                const ranked = computeTribeRanking(visible, activeComparison);
                setUserList(applyLastRanks(ranked, activeComparison?.exercise, tribeScopeKey));
            } else {
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
            arr.sort(
                (a, b) => (Number(b.__hexValue ?? 0) || 0) - (Number(a.__hexValue ?? 0) || 0)
            );
            setUserList(applyLastRanks(arr, null, scopeKeyLabel));
        };

        if (scope === "Following") {
            const followingSet = new Set((global.userData?.following || []).map((u) => u.uid));
            const base = all.filter(
                (usr) => usr?.uid === global.userData?.uid || followingSet.has(usr?.uid)
            );
            const visible = filterBlockedVisibility(base);
            if (hexFocusKey) {
                buildHexRanking(visible, `following_hex_${hexFocusKey}`);
                return;
            }
            const ranked = rankUsers(visible, comparedExercise, comparedMetric);
            setUserList(applyLastRanks(ranked, comparedExercise, "following"));
        } else {
            const visible = filterBlockedVisibility(all);
            if (hexFocusKey) {
                buildHexRanking(visible, `global_hex_${hexFocusKey}`);
                return;
            }
            const ranked = rankUsers(visible, comparedExercise, comparedMetric);
            setUserList(applyLastRanks(ranked, comparedExercise, "global"));
        }
    }, [
        bodyFocus,
        isCustomTribe,
        tribesHydrated,
        currentTribe,
        activeComparison,
        comparedExercise,
        comparedMetric,
        scope,
        selectedTribeId,
    ]);

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

    useEffect(() => {
        if (activeCompIndex >= tribeComparisons.length) setActiveCompIndex(0);
    }, [tribeComparisons.length, activeCompIndex]);

    const rankedDisplay = useMemo(() => userList || [], [userList]);

    useEffect(() => {
        if (!isCustomTribe) {
            setBlockedReason(null);
            return;
        }
        const needsBW = !!(activeComparison && activeComparison.normalizeByBodyweight);
        if (!needsBW) {
            setBlockedReason(null);
            return;
        }
        const myW = Number(global?.userData?.personalInfo?.weight || 0);
        if (myW > 0) {
            setBlockedReason(null);
        } else {
            setBlockedReason(
                "This tribe’s comparison is normalized by bodyweight. Please enter your weight to view rankings."
            );
        }
    }, [isCustomTribe, selectedTribeId, activeComparison]);

    const openModal = () => setSelectExerciseModalVisible(true);
    const closeModal = () => setSelectExerciseModalVisible(false);
    const showUserStats = (user) => {
        setSelectedUser(user);
        setIsUserStatsBottomSheetVisible(true);
    };

    const handleActiveCompChange = useCallback(
        (nextIndex) => {
            const total = Array.isArray(tribeComparisons) ? tribeComparisons.length : 0;
            const clampedIndex = total > 0 ? Math.min(Math.max(0, nextIndex), total - 1) : 0;
            setActiveCompIndex(clampedIndex);

            if (!isCustomTribe || !currentTribe) return;
            const comp = tribeComparisons[clampedIndex];
            if (!comp) return;

            const all = usersRef.current || [];
            const memberSet = new Set(currentTribe.members || []);
            const tribeUsers = all.filter((x) => memberSet.has(x?.uid));
            const tribeScopeKey = String(currentTribe?.id || selectedTribeId || "");
            const ranked = computeTribeRanking(tribeUsers, comp);
            setUserList(applyLastRanks(ranked, comp?.exercise, tribeScopeKey));
        },
        [tribeComparisons, isCustomTribe, currentTribe, selectedTribeId]
    );

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

    const [personalSheetIndex, setPersonalSheetIndex] = useState(-1);
    const [infoForm, setInfoForm] = useState({
        gender: "male",
        activity: "moderate",
        goal: "maintain",
        weight: "0",
        heightFt: "5",
        heightIn: "6",
    });

    useEffect(() => {
        const pi = global?.userData?.personalInfo;
        if (!pi) return;
        setInfoForm((s) => ({
            ...s,
            gender: pi.gender ?? s.gender,
            activity: pi.activity ?? s.activity,
            goal: pi.goal ?? s.goal,
            weight: pi.weight != null ? String(pi.weight) : s.weight,
            heightFt: pi.heightFt != null ? String(pi.heightFt) : s.heightFt,
            heightIn: pi.heightIn != null ? String(pi.heightIn) : s.heightIn,
        }));
    }, [global?.userData?.personalInfo]);

    const savePersonalInfo = useCallback(async () => {
        const uid = global?.userData?.uid || global?.userData?.id;
        if (!uid) return;
        const clamp = (s, min, max) => {
            const n = parseInt(String(s || "0"), 10);
            if (Number.isNaN(n)) return min;
            return Math.max(min, Math.min(max, n));
        };
        const info = {
            gender: String(infoForm.gender || "male"),
            activity: String(infoForm.activity || "moderate"),
            goal: String(infoForm.goal || "maintain"),
            weight: clamp(infoForm.weight, 0, 2000),
            heightFt: clamp(infoForm.heightFt, 0, 8),
            heightIn: clamp(infoForm.heightIn, 0, 11),
        };
        try {
            await updateDoc(doc(db, "users", uid), {
                personalInfo: info,
                updatedAt: serverTimestamp(),
            });
            try {
                global.userData = { ...(global.userData || {}), personalInfo: info };
                emitUserDataUpdate();
            } catch {
                //
            }
            setBlockedReason(null);
        } catch (e) {
            console.log("savePersonalInfo error", e?.message || e);
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
        await updateDoc(doc(db, "users", uid), { tribeIds: arrayUnion(ref.id) }).catch(() => {});
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
        await updateDoc(doc(db, "users", uid), { tribeIds: arrayUnion(target.id) }).catch(() => {});
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
        await updateDoc(doc(db, "users", uid), { tribeIds: arrayRemove(selectedTribeId) }).catch(() => {});
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

    const lastViewRef = useRef("");
    useEffect(() => {
        const uid = global?.userData?.uid;
        if (!uid) return;

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
        } catch {
            //
        }
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
        if (selectedTribeId) {
            const name = currentTribe?.name;
            return name ? String(name) : null;
        }
        if (scope === "Following") return "People you follow";
        if (scope === "Global") return "All athletes";
        return null;
    }, [selectedTribeId, currentTribe, scope]);

    const hexFocusKey = useMemo(
        () => (typeof bodyFocus === "string" && bodyFocus ? bodyFocus : DEFAULT_BODY_FOCUS),
        [bodyFocus]
    );
    const usingHexFocus = useMemo(
        () => !isCustomTribe && !!hexFocusKey,
        [isCustomTribe, hexFocusKey]
    );

    const dropdownLeft = useMemo(() => {
        const padding = SIZES.headerPaddingHorizontal;
        const anchorX = Number(focusMenuAnchor?.x ?? padding);
        const approxWidth = scaleSize(180, "w");
        const anchorWidth = Number(focusMenuAnchor?.width ?? approxWidth);
        const anchorRight = anchorX + anchorWidth;
        const desiredLeft = anchorRight - approxWidth;
        const maxLeft = Math.max(padding, DEVICE_WIDTH - approxWidth - padding);
        return Math.min(Math.max(desiredLeft, padding), maxLeft);
    }, [focusMenuAnchor?.x, focusMenuAnchor?.width]);

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
    }, [
        rankedDisplay,
        isCustomTribe,
        activeComparison,
        usingHexFocus,
        hexFocusKey,
        comparedExercise,
        exerciseStatKey,
    ]);

    const gradientConfig = useMemo(() => {
        if (isCustomTribe) {
            return {
                colors: ["#05060D", "#161930", "#223561", "#2F4E91", "#3D65BC", theme.bg],
                locations: [0, 0.2, 0.48, 0.7, 0.9, 1],
            };
        }
        return {
            colors: ["#03060C", "#0E1A35", "#1A3361", "#255198", "#2E6BC7", theme.bg],
            locations: [0, 0.22, 0.52, 0.74, 0.92, 1],
        };
    }, [isCustomTribe]);
    const topGradientHeight = useMemo(
        () => podiumSectionHeight + HEADER_GRADIENT_OVERLAP + scaleSize(180, "h"),
        [podiumSectionHeight]
    );

    const leaderboardCanvas = useMemo(() => {
        const lightenColor = (hex, amount = 0.1) => {
            if (typeof hex !== "string") return hex;
            let h = hex.replace("#", "").trim();
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
            const rr = mix(r);
            const gg = mix(g);
            const bb = mix(b);
            return `rgba(${rr}, ${gg}, ${bb}, ${a})`;
        };
        return lightenColor(theme.bg, 0.1);
    }, []);

    const renderHeaderRightContent = () => {
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

    const renderScopeToggle = () => (
        <View style={styles.scopeToggleRow}>
            <RNBounceable
                onPress={withStrongPress(() => {
                    if (tribeMenuVisible) {
                        setTribeMenuVisible(false);
                        return;
                    }
                    const measureAndOpen = () => {
                        try {
                            scopeToggleAnchorRef.current?.measureInWindow?.((x = 0, y = 0, width = 0, height = 0) => {
                                setTribeMenuAnchor({ x, y, width, height });
                                setTribeMenuVisible(true);
                            });
                        } catch {
                            setTribeMenuVisible(true);
                        }
                    };
                    requestAnimationFrame(measureAndOpen);
                })}
                activeScale={0.96}
                hitSlop={{
                    top: SIZES.tribeHitSlop,
                    bottom: SIZES.tribeHitSlop,
                    left: SIZES.tribeHitSlop,
                    right: SIZES.tribeHitSlop,
                }}
                accessibilityRole="button"
                accessibilityLabel="Change leaderboard scope"
            >
                <View ref={scopeToggleAnchorRef} style={{ alignSelf: "flex-start" }} collapsable={false}>
                    <View style={styles.scopeToggleButton}>
                        <View style={styles.scopeToggleContent}>
                            <Text style={styles.tribeLabel} numberOfLines={1} ellipsizeMode="tail">
                                {scopeLabel}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={Math.max(18, SIZES.headerIconSize - SIZES.chevronDelta)}
                                color="rgba(255,255,255,0.95)"
                                style={{ marginLeft: SIZES.chevronML, marginTop: SIZES.chevronMT }}
                            />
                        </View>
                    </View>
                    {scopeSubtitle ? (
                        <Text style={styles.tribeSubtitle} numberOfLines={1} ellipsizeMode="tail">
                            {scopeSubtitle}
                        </Text>
                    ) : null}
                </View>
            </RNBounceable>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                pointerEvents="none"
                colors={gradientConfig.colors}
                locations={gradientConfig.locations}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[styles.topGradient, { height: topGradientHeight }]}
            />
            <Modal
                visible={isBodyFocusMenuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsBodyFocusMenuVisible(false)}
            >
                <View style={styles.focusModalOverlay}>
                    <Pressable
                        style={styles.focusBackdrop}
                        onPress={() => setIsBodyFocusMenuVisible(false)}
                        android_ripple={{ color: "transparent" }}
                    />
                    <View
                        style={[styles.focusDropdown, { top: dropdownTop, left: dropdownLeft }]}
                        pointerEvents="box-none"
                    >
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

            <View style={styles.headerGradientWrapper}>
                <View
                    style={[
                        styles.header,
                        { paddingHorizontal: SIZES.headerPaddingHorizontal + scaleSize(14) },
                        !isCustomTribe && styles.headerCondensed,
                    ]}
                >
                    {isCustomTribe ? (
                        <>
                            <View style={styles.headerLeftContainer}>{renderScopeToggle()}</View>
                            <View style={styles.headerRightContainer}>{renderHeaderRightContent()}</View>
                        </>
                    ) : (
                        <View style={styles.headerPillsRow}>
                            {renderScopeToggle()}
                            {renderHeaderRightContent()}
                        </View>
                    )}
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
                alwaysBounceVertical
                overScrollMode="always"
            >
                <InfoPanel isVisible={false} opacity={infoPanelOpacityRef.current} />
                <View style={[styles.podiumSection, { height: podiumSectionHeight }]}>
                    <Podium
                        data={podiumData}
                        topOffset={STAGE_VERTICAL_OFFSET}
                    />
                </View>
                <View style={{ marginTop: -panelOverlap }}>
                    <LeaderboardPanel
                        userList={rankedDisplay}
                        categoryCompared={comparedExercise}
                        comparedMetric={comparedMetric}
                        scopeKey={scope}
                        onToggleMetric={() =>
                            setComparedMetric((prev) =>
                                prev === "1RM" ? "Volume" : prev === "Volume" ? "Reps" : "1RM"
                            )
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
            </ScrollView>

            <UserStatsBottomSheet
                user={selectedUser}
                navigation={navigation}
                isVisible={isUserStatsBottomSheetVisible}
                setIsVisible={setIsUserStatsBottomSheetVisible}
                sheetProgressSV={userStatsSheetProgress}
            />

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
                anchor={tribeMenuAnchor}
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
                    const comps =
                        Array.isArray(tribe?.comparisons) && tribe.comparisons.length
                            ? tribe.comparisons
                            : tribe?.comparison
                            ? [tribe.comparison]
                            : [];
                    const activeIdx = Math.min(activeCompIndex, Math.max(0, comps.length - 1));
                    const cmp = comps[activeIdx] || null;
                    const needsBW = !!(cmp && cmp.normalizeByBodyweight);

                    setSelectedTribeId(id);
                    setTribeMenuVisible(false);

                    if (needsBW) {
                        const myW = Number(global?.userData?.personalInfo?.weight || 0);
                        if (!(myW > 0)) {
                            setBlockedReason(
                                "This tribe’s comparison is normalized by bodyweight. Please enter your weight to view rankings."
                            );
                            requestAnimationFrame(() => setPersonalSheetIndex(1));
                        } else {
                            setBlockedReason(null);
                        }
                    } else {
                        setBlockedReason(null);
                    }
                }}
                onCreatePress={onOpenCreateFromMenu}
                onJoinPress={onOpenJoinFromMenu}
                onManagePress={onOpenManageFromMenu}
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

            <PersonalInfoSheet
                index={personalSheetIndex}
                onChangeIndex={setPersonalSheetIndex}
                goalForm={infoForm}
                setGoalForm={setInfoForm}
                onClose={() => setPersonalSheetIndex(-1)}
                onSave={async () => {
                    await savePersonalInfo();
                    setPersonalSheetIndex(-1);
                }}
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
    container: { flex: 1, backgroundColor: theme.bg },
    scrollRegion: { flex: 1 },
    scrollContent: { paddingTop: 0, flexGrow: 1 },
    podiumSection: {
        width: "100%",
        position: "relative",
        justifyContent: "flex-end",
        overflow: "hidden",
        marginTop: -PODIUM_PULLUP,
    },
    leaderboardContainer: { alignSelf: "stretch" },
    topGradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
    },
    headerGradientWrapper: {
        width: "100%",
        position: "relative",
        overflow: "visible",
        paddingBottom: HEADER_GRADIENT_OVERLAP,
        marginBottom: -HEADER_GRADIENT_OVERLAP,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        paddingTop: SIZES.headerPaddingTop,
        alignItems: "center",
    },
    headerCondensed: {
        justifyContent: "space-between",
    },
    headerLeftContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        flex: 1,
        marginRight: scaleSize(16),
    },
    headerRightContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        flex: 1,
        marginLeft: scaleSize(16),
    },
    headerPillsRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        alignSelf: "stretch",
        width: "100%",
        paddingTop: scaleSize(2),
    },
    scopeToggleRow: {
        alignSelf: "flex-start",
        alignItems: "flex-start",
        marginTop: scaleSize(4),
    },
    scopeToggleButton: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
    },
    scopeToggleContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    tribeLabel: {
        color: "#fff",
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleFont(14),
        includeFontPadding: false,
        maxWidth: SIZES.tribeLabelMaxWidth,
        letterSpacing: 0.2,
        marginRight: scaleSize(4),
        textAlign: "left",
    },
    tribeSubtitle: {
        color: "rgba(255,255,255,0.72)",
        fontFamily: "Outfit_500Medium",
        fontSize: scaleFont(11.5),
        includeFontPadding: false,
        letterSpacing: 0.2,
        marginTop: scaleSize(1),
        alignSelf: "flex-start",
    },
    focusToggleWrap: {
        position: "relative",
        marginTop: scaleSize(6),
    },
    manageButtonWrap: {
        position: "relative",
        marginTop: scaleSize(6),
    },
    focusToggle: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(8),
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
        fontSize: scaleFont(14),
        includeFontPadding: false,
        letterSpacing: 0.2,
    },
    focusToggleLabel: {
        color: "#fff",
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleFont(13),
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
        minWidth: scaleSize(158, "w"),
        borderRadius: scaleSize(14),
        backgroundColor: theme.surface,
        paddingVertical: scaleSize(8),
        paddingHorizontal: scaleSize(10),
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: scaleSize(10),
        shadowOffset: { width: 0, height: scaleSize(6) },
        elevation: 6,
    },
    focusOption: {
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(14),
        borderRadius: scaleSize(10),
        marginBottom: scaleSize(4),
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "transparent",
    },
    focusOptionActive: {
        backgroundColor: "rgba(45,158,255,0.12)",
    },
    focusOptionLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleFont(12.5),
        color: "#EAEAEA",
        letterSpacing: 0.15,
    },
    focusOptionLabelActive: {
        color: "#fff",
    },
    focusModalOverlay: {
        flex: 1,
    },
    focusBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.35)",
    },
});
