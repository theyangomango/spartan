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
    Alert,
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
    getDoc,
} from "firebase/firestore";

import useStableSafeAreaInsets from "../../../hooks/useStableSafeAreaInsets";
import rankUsers from "../../../helper/rankUsers";
import { db } from "../../../../firebase.config";
import theme from "../../../theme/mfpDark";
import { subscribeUserData, emitUserDataUpdate } from "../../../utils/userDataEvents";
import { canViewerAccessProfile } from "../../../utils/workoutPrivacy";
import { withStrongPress } from "../../../utils/haptics";
import { getLeaderboardValue } from "../../../helper/getLeaderboardValue";
import { coerceUid, ensureUidArray } from "../../../utils/userRefs";

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

function computeTribeRanking(users, comparison) {
    const { exercise, metric, normalizeByBodyweight } = comparison || {};
    const exerciseKey = typeof exercise === "string" ? exercise.trim() : "";
    const list = (users || []).map((u) => {
        const { value, missingWeightData } = getLeaderboardValue(u, {
            mode: "exercise",
            key: exerciseKey,
            metric: metric || "1RM",
            normalizeByBodyweight: !!normalizeByBodyweight,
        });

        const safeValue = Number.isFinite(value) ? value : 0;
        return {
            ...u,
            _tribeValue: normalizeByBodyweight && missingWeightData ? null : safeValue,
            __noWeightForBW: !!(normalizeByBodyweight && missingWeightData),
        };
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

function buildRankMap(entries) {
    const map = new Map();
    if (!Array.isArray(entries)) return map;
    entries.forEach((entry) => {
        const uid = coerceUid(entry);
        const rank = Number(entry?.rank);
        if (!uid || !Number.isFinite(rank) || rank <= 0) return;
        if (!map.has(uid)) map.set(uid, rank);
    });
    return map;
}

function membershipListsMatch(previousEntries, currentIds) {
    const prev = ensureUidArray(previousEntries);
    const current = ensureUidArray(currentIds);
    if (prev.length !== current.length) return false;
    prev.sort();
    current.sort();
    for (let i = 0; i < prev.length; i++) {
        if (prev[i] !== current[i]) return false;
    }
    return true;
}

function attachGlobalRanks(list, entries, snapshotValid) {
    if (!Array.isArray(list)) return [];
    if (!snapshotValid) return list.map((user) => ({ ...user, lastRank: null }));
    const rankMap = buildRankMap(entries);
    return list.map((user) => {
        const uid = coerceUid(user);
        return { ...user, lastRank: rankMap.get(uid) ?? null };
    });
}

function attachScopedRanks(list, entries, currentIds, snapshotValid) {
    if (!Array.isArray(list)) return [];
    if (!snapshotValid) return list.map((user) => ({ ...user, lastRank: null }));
    if (!membershipListsMatch(entries, currentIds)) {
        return list.map((user) => ({ ...user, lastRank: null }));
    }
    const rankMap = buildRankMap(entries);
    return list.map((user) => {
        const uid = coerceUid(user);
        return { ...user, lastRank: rankMap.get(uid) ?? null };
    });
}

const summaryOf = (c) => {
    if (!c) return "Not set";
    const metricLabel = c.metric === "1RM" ? "1RM (Adj)" : c.metric;
    const parts = [c.exercise, metricLabel];
    if (c.normalizeByBodyweight) parts.push("per lb bodyweight");
    return parts.join(" • ");
};

function filterBlockedVisibility(list, options = {}) {
    const { respectPrivacy = true } = options || {};
    try {
        const meUid = String(global?.userData?.uid || "");
        if (!meUid) return list;
        const myBlocked = ensureUidArray(global?.userData?.blockedUidList || global?.userData?.blocked);
        const myBlockedSet = new Set(myBlocked);
        const viewerData = (() => {
            try {
                return global?.userData || null;
            } catch {
                return null;
            }
        })();
        const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";
        const theyBlockedMe = (u) => {
            const theirs = ensureUidArray(u?.blockedUidList || u?.blocked);
            return theirs.includes(meUid);
        };
        return (Array.isArray(list) ? list : []).filter((u) => {
            const uid = coerceUid(u);
            if (!uid) return false;
            if (uid === meUid) return true;
            if (myBlockedSet.has(uid)) return false;
            if (theyBlockedMe(u)) return false;
            if (respectPrivacy && !canViewerAccessProfile(u, viewerUid, viewerData)) return false;
            return true;
        });
    } catch {
        return list;
    }
}

export default function LeaderboardsSection({ navigation }) {
    const insets = useStableSafeAreaInsets();
    const podiumSectionHeight = useMemo(() => PODIUM_HEIGHT, []);
    const panelOverlap = useMemo(() => scaleSize(12), []);
    const surfaceBackdropTop = useMemo(
        () => Math.max(0, podiumSectionHeight - panelOverlap + scaleSize(8)),
        [podiumSectionHeight, panelOverlap]
    );
    const panelCollapsedHeight = useMemo(
        () => Math.max(1, Math.ceil(DEVICE_HEIGHT - podiumSectionHeight + panelOverlap)),
        [podiumSectionHeight, panelOverlap]
    );
    const scrollBottomPadding = useMemo(
        () => Math.max(scaleSize(32), (insets?.bottom || 0) + scaleSize(12)),
        [insets?.bottom]
    );

    const usersRef = useRef([]);
    const usersSubscriptionRef = useRef(null);
    const recomputeRef = useRef(() => {});
    const appliedLastViewRef = useRef(false);

    const persisted = getPersisted();

    const [userList, setUserList] = useState(persisted.userList ?? LAST_USERLIST);
    const [comparedExercise, setComparedExercise] = useState("Overall");
    const fallbackScope = LAST_SCOPE === "Global" ? "Following" : LAST_SCOPE;
    const sanitizedInitialScope =
        persisted.scope === "Global" ? "Following" : persisted.scope;
    // const [scope, setScope] = useState(persisted.scope ?? LAST_SCOPE);
    const [scope, setScope] = useState(sanitizedInitialScope ?? fallbackScope);

    useEffect(() => {
        if (persisted?.scope === "All Followers" || persisted?.scope === "Global") {
            setScope("Following");
        }
    }, [persisted?.scope]);

    const [usersLoaded, setUsersLoaded] = useState(false);
    const [tribesHydrated, setTribesHydrated] = useState(false);

    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isUserStatsBottomSheetVisible, setIsUserStatsBottomSheetVisible] = useState(false);

    const [snapshotMeta, setSnapshotMeta] = useState(null);
    const [globalSnapshot, setGlobalSnapshot] = useState(null);

    useEffect(() => {
        const ref = doc(db, "leaderboardMeta", "currentSnapshot");
        const unsubscribe = onSnapshot(
            ref,
            (snap) => {
                try {
                    setSnapshotMeta(snap.exists() ? snap.data() || null : null);
                } catch {
                    setSnapshotMeta(null);
                }
            },
            (err) => {
                console.warn("leaderboard snapshot meta subscribe failed", err?.message || err);
            }
        );
        return unsubscribe;
    }, []);

    useEffect(() => {
        const snapshotId = snapshotMeta?.snapshotId;
        if (!snapshotId) {
            setGlobalSnapshot(null);
            return;
        }
        const ref = doc(db, "leaderboardSnapshots", snapshotId);
        getDoc(ref)
            .then((snap) => {
                try {
                    setGlobalSnapshot(snap.exists() ? snap.data() || null : null);
                } catch {
                    setGlobalSnapshot(null);
                }
            })
            .catch((err) => {
                console.warn("failed to load global leaderboard snapshot", err?.message || err);
                setGlobalSnapshot(null);
            });
    }, [snapshotMeta?.snapshotId]);

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

    const initUsers = useCallback(() => {
        if (usersSubscriptionRef.current) {
            try { usersSubscriptionRef.current(); } catch {}
            usersSubscriptionRef.current = null;
        }

        usersSubscriptionRef.current = onSnapshot(collection(db, "users"), (snapshot) => {
            const all = snapshot.docs.map((docSnap) => docSnap.data());
            usersRef.current = all;
            setUsersLoaded(true);
            try { recomputeRef.current?.(); } catch {}
        });
    }, []);

    useEffect(() => {
        initUsers();
    }, [initUsers]);
    useEffect(() => () => {
        if (usersSubscriptionRef.current) {
            try { usersSubscriptionRef.current(); } catch {}
            usersSubscriptionRef.current = null;
        }
    }, []);

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
                // setScope("Global");
                setScope("Following");
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
        const snapshotId = snapshotMeta?.snapshotId || null;
        const globalSnapshotId = globalSnapshot?.snapshotId || null;

        let viewerUid = "";
        try {
            viewerUid = String(global?.userData?.uid || "");
        } catch {
            viewerUid = "";
        }

        const followingSet = new Set();
        if (viewerUid) followingSet.add(viewerUid);
        const followingArr = (() => {
            try {
                return Array.isArray(global?.userData?.following) ? global.userData.following : [];
            } catch {
                return [];
            }
        })();
        followingArr.forEach((entry) => {
            const uid = coerceUid(entry);
            if (uid) followingSet.add(uid);
        });
        const followingIdsArray = Array.from(followingSet);

        const viewerLastRanks =
            global && global.userData && typeof global.userData.lastRanks === "object"
                ? global.userData.lastRanks
                : {};
        const followingSnapshots = viewerLastRanks?.following || {};
        const followingExerciseSnapshots = followingSnapshots?.exercises || {};
        const followingHexSnapshots = followingSnapshots?.hex || {};
        const tribeSnapshots = viewerLastRanks?.tribes || {};

        if (isCustomTribe) {
            if (!tribesHydrated || !currentTribe) return;

            const memberSet = new Set();
            (currentTribe.members || []).forEach((member) => {
                const uid = coerceUid(member);
                if (uid) memberSet.add(uid);
            });
            if (!memberSet.has(viewerUid) && viewerUid) memberSet.add(viewerUid);

            const tribeUsers = all.filter((u) => memberSet.has(coerceUid(u)));
            const visible = filterBlockedVisibility(tribeUsers, { respectPrivacy: false });
            const tribeScopeKey = String(currentTribe?.id || selectedTribeId || "");
            const tribeSnapshot = tribeSnapshots?.[tribeScopeKey] || {};
            const tribeExerciseSnapshots = tribeSnapshot?.exercises || {};
            const tribeHexSnapshots = tribeSnapshot?.hex || {};
            const memberIdsArray = Array.from(memberSet);

            if (activeComparison) {
                const ranked = computeTribeRanking(visible, activeComparison);
                const previous = tribeExerciseSnapshots?.[activeComparison?.exercise || ""];
                const snapshotValid = Boolean(snapshotId && previous?.snapshotId === snapshotId);
                setUserList(attachScopedRanks(ranked, previous?.entries, memberIdsArray, snapshotValid));
            } else if (hexFocusKey) {
                const arr = Array.isArray(visible)
                    ? visible.map((user) => {
                          const { value } = getLeaderboardValue(user, {
                              mode: "hex",
                              key: hexFocusKey,
                          });
                          return {
                              ...user,
                              __hexValue: Number.isFinite(value) ? value : 0,
                          };
                      })
                    : [];
                arr.sort(
                    (a, b) => (Number(b.__hexValue ?? 0) || 0) - (Number(a.__hexValue ?? 0) || 0)
                );
                const previous = tribeHexSnapshots?.[hexFocusKey];
                const snapshotValid = Boolean(snapshotId && previous?.snapshotId === snapshotId);
                setUserList(attachScopedRanks(arr, previous?.entries, memberIdsArray, snapshotValid));
            } else {
                const ranked = rankUsers(visible, comparedExercise, comparedMetric);
                const previous = tribeExerciseSnapshots?.[comparedExercise];
                const snapshotValid = Boolean(snapshotId && previous?.snapshotId === snapshotId);
                setUserList(attachScopedRanks(ranked, previous?.entries, memberIdsArray, snapshotValid));
            }
            return;
        }

        const usingHexFocus = !!hexFocusKey;

        if (scope === "Following") {
            const base = all.filter((usr) => followingSet.has(String(usr?.uid || "")));
            const visible = filterBlockedVisibility(base);
            if (usingHexFocus) {
                const arr = Array.isArray(visible)
                    ? visible.map((user) => {
                          const { value } = getLeaderboardValue(user, {
                              mode: "hex",
                              key: hexFocusKey,
                          });
                          return {
                              ...user,
                              __hexValue: Number.isFinite(value) ? value : 0,
                          };
                      })
                    : [];
                arr.sort(
                    (a, b) => (Number(b.__hexValue ?? 0) || 0) - (Number(a.__hexValue ?? 0) || 0)
                );
                const previous = followingHexSnapshots?.[hexFocusKey];
                const snapshotValid = Boolean(snapshotId && previous?.snapshotId === snapshotId);
                setUserList(attachScopedRanks(arr, previous?.entries, followingIdsArray, snapshotValid));
            } else {
                const ranked = rankUsers(visible, comparedExercise, comparedMetric);
                const previous = followingExerciseSnapshots?.[comparedExercise];
                const snapshotValid = Boolean(snapshotId && previous?.snapshotId === snapshotId);
                setUserList(attachScopedRanks(ranked, previous?.entries, followingIdsArray, snapshotValid));
            }
        } else {
            const visible = filterBlockedVisibility(all);
            if (usingHexFocus) {
                const arr = Array.isArray(visible)
                    ? visible.map((user) => {
                          const { value } = getLeaderboardValue(user, {
                              mode: "hex",
                              key: hexFocusKey,
                          });
                          return {
                              ...user,
                              __hexValue: Number.isFinite(value) ? value : 0,
                          };
                      })
                    : [];
                arr.sort(
                    (a, b) => (Number(b.__hexValue ?? 0) || 0) - (Number(a.__hexValue ?? 0) || 0)
                );
                const entries = Array.isArray(globalSnapshot?.hex?.[hexFocusKey])
                    ? globalSnapshot.hex[hexFocusKey]
                    : [];
                const snapshotValid = Boolean(snapshotId && globalSnapshotId === snapshotId);
                setUserList(attachGlobalRanks(arr, entries, snapshotValid));
            } else {
                const ranked = rankUsers(visible, comparedExercise, comparedMetric);
                const entries = Array.isArray(globalSnapshot?.exercises?.[comparedExercise])
                    ? globalSnapshot.exercises[comparedExercise]
                    : [];
                const snapshotValid = Boolean(snapshotId && globalSnapshotId === snapshotId);
                setUserList(attachGlobalRanks(ranked, entries, snapshotValid));
            }
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
        snapshotMeta?.snapshotId,
        globalSnapshot,
        global?.userData?.following,
        global?.userData?.lastRanks,
    ]);

    useEffect(() => {
        recomputeRef.current = recompute;
    }, [recompute]);

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

            const snapshotId = snapshotMeta?.snapshotId || null;

            const all = usersRef.current || [];
            const viewerUid = (() => {
                try {
                    return String(global?.userData?.uid || "");
                } catch {
                    return "";
                }
            })();

            const memberSet = new Set();
            (currentTribe.members || []).forEach((member) => {
                const uid = coerceUid(member);
                if (uid) memberSet.add(uid);
            });
            if (viewerUid && !memberSet.has(viewerUid)) memberSet.add(viewerUid);
            const memberIdsArray = Array.from(memberSet);

            const tribeUsers = all.filter((x) => memberSet.has(coerceUid(x)));
            const visible = filterBlockedVisibility(tribeUsers, { respectPrivacy: false });
            const ranked = computeTribeRanking(visible, comp);

            const tribeScopeKey = String(currentTribe?.id || selectedTribeId || "");
            const viewerLastRanks =
                global && global.userData && typeof global.userData.lastRanks === "object"
                    ? global.userData.lastRanks
                    : {};
            const tribeSnapshots = viewerLastRanks?.tribes || {};
            const tribeSnapshot = tribeSnapshots?.[tribeScopeKey] || {};
            const previous = tribeSnapshot?.exercises?.[comp?.exercise || ""];
            const snapshotValid = Boolean(snapshotId && previous?.snapshotId === snapshotId);

            setUserList(attachScopedRanks(ranked, previous?.entries, memberIdsArray, snapshotValid));
        },
        [
            tribeComparisons,
            isCustomTribe,
            currentTribe,
            selectedTribeId,
            snapshotMeta?.snapshotId,
            global?.userData?.lastRanks,
        ]
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

        const myBlocked = new Set(ensureUidArray(global?.userData?.blockedUidList || global?.userData?.blocked));
        const myBlockedBy = new Set(ensureUidArray(global?.userData?.blockedByUidList || global?.userData?.blockedBy));
        const targetMembers = ensureUidArray(target?.members);
        const conflict = targetMembers.some((memberUid) => myBlocked.has(memberUid) || myBlockedBy.has(memberUid));
        if (conflict) {
            Alert.alert(
                "Cannot Join Tribe",
                "You cannot join this tribe because it contains someone you have blocked or who has blocked you."
            );
            return;
        }

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
        // return scope === "Following" ? "Following" : "Global";
        return "Following";
    }, [selectedTribeId /* , scope */]);

    const scopeSubtitle = useMemo(() => {
        if (selectedTribeId) {
            const name = currentTribe?.name;
            return name ? String(name) : null;
        }
        if (scope === "Following") return "People you follow";
        // if (scope === "Global") return "All athletes";
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
            return {
                handle: u?.handle,
                pfp: u?.image,
                stat,
                isVerified: Boolean(u?.isVerified ?? u?.verified ?? false),
            };
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
                colors: [theme.bg, "#34190C", "#4A230E", "#713314", "#D5816A", theme.surface],
                locations: [0, 0.2, 0.48, 0.7, 0.9, 1],
            };
        }
        return {
            colors: [theme.bg, "#142548", "#264A7B", "#3167AF", "#3B82DF", theme.surface],
            locations: [0, 0.22, 0.52, 0.74, 0.92, 1],
        };
    }, [isCustomTribe]);
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
                style={styles.topGradient}
            />
            <View pointerEvents="none" style={[styles.bottomSurfaceBackdrop, { top: surfaceBackdropTop }]}>
                <LinearGradient
                    pointerEvents="none"
                    colors={["rgba(23, 23, 28, 0)", theme.surface]}
                    locations={[0, 0.5]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.bottomSurfaceGradient}
                />
            </View>
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
                        { paddingHorizontal: SIZES.headerPaddingHorizontal },
                    ]}
                >
                    <View style={styles.headerPillsRow}>
                        {renderScopeToggle()}
                        {renderHeaderRightContent()}
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.scrollRegion}
                contentContainerStyle={styles.scrollContent}
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
                <View style={[styles.leaderboardPanelWrap, { marginTop: -panelOverlap }]}>
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
                    <View style={[styles.leaderboardFiller, { minHeight: scrollBottomPadding }]} />
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
                animationType="none"
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
                /* onSelectGlobal={() => {
                    setSelectedTribeId(null);
                    setScope("Global");
                    setTribeMenuVisible(false);
                }} */
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
    leaderboardPanelWrap: {
        flexGrow: 1,
        flexBasis: 0,
        alignSelf: "stretch",
        minHeight: 0,
    },
    leaderboardContainer: {
        alignSelf: "stretch",
    },
    leaderboardFiller: {
        flexGrow: 1,
        backgroundColor: theme.surface,
    },
    topGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    bottomSurfaceBackdrop: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
    },
    bottomSurfaceGradient: {
        flex: 1,
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
    headerPillsRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        alignSelf: "stretch",
        width: "100%",
        paddingTop: scaleSize(16),
        paddingBottom: scaleSize(8),
        paddingLeft: scaleSize(9),
        paddingRight: scaleSize(4)
    },
    scopeToggleRow: {
        alignSelf: "flex-start",
        alignItems: "flex-start",
        marginTop: scaleSize(6),
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
