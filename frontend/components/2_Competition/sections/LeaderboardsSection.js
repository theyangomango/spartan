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
    runTransaction,
} from "firebase/firestore";

import useStableSafeAreaInsets from "../../../hooks/useStableSafeAreaInsets";
import rankUsers from "../../../helper/rankUsers";
import { db } from "../../../../firebase.config";
import theme from "../../../theme/mfpDark";
import { subscribeUserData, emitUserDataUpdate } from "../../../utils/userDataEvents";
import { canViewerAccessProfile } from "../../../utils/workoutPrivacy";
import { withStrongPress } from "../../../utils/haptics";
import { getLeaderboardValue } from "../../../helper/getLeaderboardValue";
import { coerceUid, ensureUidArray, getViewerUid } from "../../../utils/userRefs";

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
    SIZES,
    PODIUM_PULLUP,
    DEVICE_WIDTH,
    DEVICE_HEIGHT,
} from "../layoutConstants";
import { scaledSize } from "../UserStats/UserStatsStyles";
import MuscleGroupIcon from "../../3_Workout/NewWorkout/SelectExercise/MuscleGroupIcon";
import scaleSize from "../../../helper/scaleSize";

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
const BODYWEIGHT_BLOCK_MESSAGE =
    "This tribe’s comparison is normalized by bodyweight. Please enter your weight to view rankings.";

const STAGE_VERTICAL_OFFSET = scaledSize(0);

const FOCUS_SEGMENTS = {
    overall: ["calves", "quads", "abs", "obliques", "back", "forearms", "arms", "shoulders", "chest", "traps"],
    chest: ["chest"],
    shoulders: ["shoulders"],
    arms: ["arms", "forearms"],
    back: ["back", "traps"],
    abs: ["abs", "obliques"],
    legs: ["quads", "calves"],
};
// Keep muscle icon scaling/offsets in sync with the Progress badges.
const MUSCLE_ICON_SCALES = {
    shoulders: 2.6,
    chest: 2.8,
    arms: 1.8,
    back: 2.2,
    abs: 3,
    legs: 2.4,
    overall: 1.6,
};
const MUSCLE_ICON_OFFSETS = {
    shoulders: scaleSize(40),
    chest: scaleSize(40),
    arms: scaleSize(15),
    back: scaleSize(25),
    abs: scaleSize(30),
    legs: scaleSize(-10),
    overall: scaleSize(10)
};

const MUSCLE_ICON_HIGHLIGHT = "#ff6f67ff";
const MUSCLE_ICON_HIGHLIGHT_DIM = "rgba(255, 127, 120, 0.6)";

const KG_TO_LB = 2.2046226218488;

const GLOBAL_KEY = "__competition_state__";
const getPersisted = () =>
(typeof global !== "undefined" &&
    global[GLOBAL_KEY] &&
    typeof global[GLOBAL_KEY] === "object"
    ? global[GLOBAL_KEY]
    : {});
const setPersisted = (patch) => {
    if (typeof global === "undefined") return;
    const current = getPersisted();
    global[GLOBAL_KEY] = { ...current, ...patch };
};

const ordinalSuffix = (value) => {
    const v = Math.abs(Number(value));
    const mod100 = v % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${v}th`;
    const mod10 = v % 10;
    if (mod10 === 1) return `${v}st`;
    if (mod10 === 2) return `${v}nd`;
    if (mod10 === 3) return `${v}rd`;
    return `${v}th`;
};

let LAST_SCOPE = "Following";
let LAST_SELECTED_TRIBE_ID = null;
let LAST_USERLIST = null;
let LAST_BODY_FOCUS = DEFAULT_BODY_FOCUS;

const resolveUserWeightValue = (user) => {
    if (!user) return null;
    const direct = Number(user?.publicWeight);
    if (Number.isFinite(direct) && direct > 0) return direct;

    const lb = Number(user?.publicWeightLb);
    if (Number.isFinite(lb) && lb > 0) return lb;

    const kg = Number(user?.publicWeightKg);
    if (Number.isFinite(kg) && kg > 0) return kg * KG_TO_LB;

    const latest = getLatestWeightFromEntries(
        user?.progress?.weightEntries ||
        user?.weightEntries ||
        user?.bodyweightLog ||
        user?.bodyweightEntries ||
        []
    );
    if (latest?.weight && Number.isFinite(latest.weight) && latest.weight > 0) {
        return latest.weight;
    }

    return null;
};

const getLatestWeightFromEntries = (entries) => {
    if (!Array.isArray(entries)) return null;
    let latest = null;
    entries.forEach((entry) => {
        if (!entry) return;
        const weight = Number(entry?.weight ?? entry?.value);
        if (!Number.isFinite(weight) || weight <= 0) return;
        const unitRaw = typeof entry?.unit === "string" ? entry.unit : "";
        const recordedAt = Number(
            entry?.recordedAt ??
            entry?.timestamp ??
            entry?.loggedAt ??
            entry?.createdAt ??
            entry?.created ??
            0
        );
        if (!Number.isFinite(recordedAt) || recordedAt <= 0) return;
        const unit = unitRaw.toLowerCase();
        const weightLb = unit.startsWith("k") ? weight * KG_TO_LB : weight;
        if (!latest || recordedAt > latest.recordedAt) {
            latest = { weight: weightLb, recordedAt };
        }
    });
    return latest;
};

function computeTribeRanking(users, comparison, weightOverrides = null) {
    const { exercise, metric, normalizeByBodyweight } = comparison || {};
    const exerciseKey = typeof exercise === "string" ? exercise.trim() : "";

    const list = (users || []).map((u) => {
        const { value } = getLeaderboardValue(u, {
            mode: "exercise",
            key: exerciseKey,
            metric: metric || "1RM",
            normalizeByBodyweight: false,
        });
        const safeValue = Number.isFinite(value) ? value : 0;

        if (!normalizeByBodyweight) {
            return {
                ...u,
                _tribeValue: safeValue,
                __noWeightForBW: false,
            };
        }

        const uid = coerceUid(u);
        const override = (() => {
            if (!weightOverrides || !uid) return null;
            const candidate =
                typeof weightOverrides.get === "function"
                    ? weightOverrides.get(uid)
                    : weightOverrides?.[uid];
            const numeric = Number(candidate);
            return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
        })();

        const weight = override ?? resolveUserWeightValue(u);
        if (!Number.isFinite(weight) || weight <= 0) {
            return {
                ...u,
                _tribeValue: null,
                __noWeightForBW: true,
            };
        }

        const normalized = safeValue / weight;
        return {
            ...u,
            _tribeValue: Number.isFinite(normalized) ? normalized : 0,
            __noWeightForBW: false,
        };
    });

    list.sort((a, b) => {
        if (normalizeByBodyweight) {
            const an = !!a.__noWeightForBW;
            const bn = !!b.__noWeightForBW;
            if (an && !bn) return 1;
            if (!an && bn) return -1;
        }
        const av = Number.isFinite(a._tribeValue) ? a._tribeValue : -Infinity;
        const bv = Number.isFinite(b._tribeValue) ? b._tribeValue : -Infinity;
        if (bv > av) return 1;
        if (av > bv) return -1;
        return 0;
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

function attachScopedRanks(list, entries, currentIds, snapshotValid) {
    if (!Array.isArray(list)) return [];
    if (!snapshotValid) return list.map((user) => ({ ...user, lastRank: null }));

    const current = ensureUidArray(currentIds);
    if (!current.length) {
        return list.map((user) => ({ ...user, lastRank: null }));
    }

    const currentSet = new Set(current);
    const scopedEntries = Array.isArray(entries)
        ? entries.filter((entry) => currentSet.has(coerceUid(entry)))
        : [];

    if (!scopedEntries.length || !membershipListsMatch(scopedEntries, current)) {
        return list.map((user) => ({ ...user, lastRank: null }));
    }

    const rankMap = buildRankMap(scopedEntries);
    if (rankMap.size !== currentSet.size) {
        return list.map((user) => ({ ...user, lastRank: null }));
    }

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
        const meUid = getViewerUid();
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
        const viewerUid = viewerData?.uid ? String(viewerData.uid) : meUid;
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

function resolveProfileImage(user) {
    const candidates = [
        user?.image,
        user?.photoURL,
        user?.photoUrl,
        user?.photo,
        user?.pfp,
        user?.avatar,
        user?.profilePhoto,
    ];
    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim();
        }
    }
    return "";
}

// Ensure the viewer's leaderboard row always reflects the latest local hex stats,
// even if the public users snapshot is stale right after a cold reload.
function applyViewerHexOverride(list, hexKey) {
    if (!Array.isArray(list) || !hexKey) return list;
    let viewerData = null;
    try {
        viewerData = global?.userData || null;
    } catch {
        viewerData = null;
    }
    const viewerUid = viewerData?.uid ? String(viewerData.uid) : "";
    if (!viewerUid) return list;
    const viewerHex = viewerData?.statsHexagon;
    if (!viewerHex || typeof viewerHex !== "object") return list;
    const normalizedKey = String(hexKey).toLowerCase();
    const overrideValue = Number(viewerHex[normalizedKey]);
    if (!Number.isFinite(overrideValue)) return list;

    let didOverride = false;
    const next = list.map((user) => {
        if (String(user?.uid || "") !== viewerUid) return user;
        didOverride = true;
        const mergedHex = { ...(user?.statsHexagon || {}), ...viewerHex };
        return {
            ...user,
            statsHexagon: mergedHex,
            __hexValue: overrideValue,
        };
    });
    return didOverride ? next : list;
}

function LeaderboardsSection({
    navigation,
    onRequestBodyWeightEntry,
    onScroll,
    onShowUserStats,
    userStatsSheetProgressSV = null,
}) {
    const insets = useStableSafeAreaInsets();
    const podiumSectionHeight = useMemo(() => PODIUM_HEIGHT, []);
    const panelOverlap = useMemo(() => scaledSize(12), []);
    const surfaceBackdropTop = useMemo(
        () => Math.max(0, podiumSectionHeight - panelOverlap + scaledSize(8)),
        [podiumSectionHeight, panelOverlap]
    );
    const panelCollapsedHeight = useMemo(
        () => Math.max(1, Math.ceil(DEVICE_HEIGHT - podiumSectionHeight + panelOverlap)),
        [podiumSectionHeight, panelOverlap]
    );
    const scrollBottomPadding = useMemo(
        () => Math.max(scaledSize(32), (insets?.bottom || 0) + scaledSize(12)),
        [insets?.bottom]
    );

    const usersRef = useRef([]);
    const usersSubscriptionRef = useRef(null);
    const recomputeRef = useRef(() => { });
    const appliedLastViewRef = useRef(false);

    const persisted = getPersisted();

    const [userList, setUserList] = useState(persisted.userList ?? LAST_USERLIST);
    const [comparedExercise, setComparedExercise] = useState("Overall");
    const fallbackScope = LAST_SCOPE === "Tribe" ? "Tribe" : "Following";
    const sanitizedInitialScope = persisted.scope === "Tribe" ? "Tribe" : "Following";
    const [scope, setScope] = useState(sanitizedInitialScope ?? fallbackScope);
    const persistedScopeRef = useRef(sanitizedInitialScope ?? fallbackScope);

    useEffect(() => {
        const targetScope = persisted?.scope === "Tribe" ? "Tribe" : "Following";
        if (targetScope !== persistedScopeRef.current) {
            persistedScopeRef.current = targetScope;
            if (scope !== targetScope) {
                setScope(targetScope);
            }
        }
    }, [persisted?.scope, scope]);

    const [usersLoaded, setUsersLoaded] = useState(false);
    const [tribesHydrated, setTribesHydrated] = useState(false);

    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isUserStatsBottomSheetVisible, setIsUserStatsBottomSheetVisible] = useState(false);

    const [snapshotMeta, setSnapshotMeta] = useState(null);

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
    const userStatsSheetProgress = userStatsSheetProgressSV || useSharedValue(0);
    const delegatedUserStats = typeof onShowUserStats === "function";
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
        persistedScopeRef.current = scope;
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
        personalInfoKey: "",
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
                                return `${exercise}:${entry["1RM"] || 0}:${entry.Volume || 0
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

                const personalInfoKey = (() => {
                    const info = data?.personalInfo;
                    if (!info || typeof info !== "object") return "";
                    try {
                        const parts = [
                            info.weight != null ? String(info.weight) : "",
                            info.gender || "",
                            info.activity || "",
                            info.goal || "",
                            info.heightFt != null ? String(info.heightFt) : "",
                            info.heightIn != null ? String(info.heightIn) : "",
                        ];
                        return parts.join("|");
                    } catch {
                        return "";
                    }
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
                        prev.profileKey === profileKey &&
                        prev.personalInfoKey === personalInfoKey
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
                        personalInfoKey,
                    };
                });
            }),
        []
    );

    const initUsers = useCallback(() => {
        if (usersSubscriptionRef.current) {
            try { usersSubscriptionRef.current(); } catch { }
            usersSubscriptionRef.current = null;
        }

        usersSubscriptionRef.current = onSnapshot(collection(db, "usersPublic"), (snapshot) => {
            const all = snapshot.docs.map((docSnap) => {
                const data = docSnap.data() || {};
                const uid = typeof data?.uid === "string" && data.uid ? data.uid : docSnap.id;
                const normalized = { ...data, uid };
                const image = resolveProfileImage(normalized);
                if (image && normalized.image !== image) normalized.image = image;
                if (!normalized.photoURL && image) normalized.photoURL = image;
                return normalized;
            });
            usersRef.current = all;
            setUsersLoaded(true);
            try { recomputeRef.current?.(); } catch { }
        });
    }, []);

    useEffect(() => {
        initUsers();
    }, [initUsers]);
    useEffect(() => () => {
        if (usersSubscriptionRef.current) {
            try { usersSubscriptionRef.current(); } catch { }
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
                setScope((prev) => (prev === "Tribe" ? prev : "Tribe"));
                setSelectedTribeId((prev) => {
                    const next = String(lastView.tribeId);
                    return prev === next ? prev : next;
                });
                if (lastView.comparison) {
                    try {
                        const idx = Number(lastView.comparisonIndex || 0);
                        if (Number.isFinite(idx)) {
                            setActiveCompIndex((prev) => {
                                const next = Math.max(0, idx);
                                return prev === next ? prev : next;
                            });
                        }
                    } catch {
                        //
                    }
                }
                return;
            }
            setScope((prev) => (prev === "Following" ? prev : "Following"));
            if (lastView.exercise)
                setComparedExercise((prev) => {
                    const next = String(lastView.exercise);
                    return prev === next ? prev : next;
                });
            if (lastView.metric)
                setComparedMetric((prev) => {
                    const next = String(lastView.metric);
                    return prev === next ? prev : next;
                });
            if (lastView.bodyFocus && BODY_FOCUS_LABEL_MAP[lastView.bodyFocus]) {
                setBodyFocus((prev) => {
                    const next = String(lastView.bodyFocus);
                    return prev === next ? prev : next;
                });
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
    const viewerWeight = (() => {
        try {
            const weight = resolveUserWeightValue(global?.userData || null);
            return Number.isFinite(weight) && weight > 0 ? weight : 0;
        } catch {
            return 0;
        }
    })();

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

    const handleScopePress = useCallback(() => {
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
    }, [tribeMenuVisible]);

    useEffect(() => {
        if (isBodyFocusMenuVisible) return;
        setFocusMenuAnchor((prev) => {
            const reset = {
                x: SIZES.headerPaddingHorizontal,
                y: 0,
                width: 0,
                height: 0,
            };
            if (
                prev &&
                prev.x === reset.x &&
                prev.y === reset.y &&
                prev.width === reset.width &&
                prev.height === reset.height
            ) {
                return prev;
            }
            return reset;
        });
    }, [isBodyFocusMenuVisible]);
    useEffect(() => {
        if (tribeMenuVisible) return;
        setTribeMenuAnchor((prev) => {
            const reset = {
                x: SIZES.headerPaddingHorizontal,
                y: 0,
                width: 0,
                height: 0,
            };
            if (
                prev &&
                prev.x === reset.x &&
                prev.y === reset.y &&
                prev.width === reset.width &&
                prev.height === reset.height
            ) {
                return prev;
            }
            return reset;
        });
    }, [tribeMenuVisible]);

    useEffect(() => {
        if (delegatedUserStats) return;
        if (isUserStatsBottomSheetVisible) {
            userStatsSheetProgress.value = 1;
        }
    }, [delegatedUserStats, isUserStatsBottomSheetVisible, userStatsSheetProgress]);

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

        const viewerUid = getViewerUid();

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
            const visibleMemberIds = visible
                .map((user) => coerceUid(user))
                .filter(Boolean);
            const tribeScopeKey = String(currentTribe?.id || selectedTribeId || "");
            const tribeSnapshot = tribeSnapshots?.[tribeScopeKey] || {};
            const tribeExerciseSnapshots = tribeSnapshot?.exercises || {};
            const tribeHexSnapshots = tribeSnapshot?.hex || {};

            if (activeComparison) {
                const overrideWeights = new Map();
                if (viewerUid && viewerWeight > 0) {
                    overrideWeights.set(viewerUid, viewerWeight);
                }
                const ranked = computeTribeRanking(
                    visible,
                    activeComparison,
                    overrideWeights.size ? overrideWeights : null
                );
                const previous = tribeExerciseSnapshots?.[activeComparison?.exercise || ""];
                const snapshotValid = Boolean(snapshotId && previous?.snapshotId === snapshotId);
                setUserList(attachScopedRanks(ranked, previous?.entries, visibleMemberIds, snapshotValid));
            } else if (hexFocusKey) {
                let arr = Array.isArray(visible)
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
                arr = applyViewerHexOverride(arr, hexFocusKey);
                arr.sort(
                    (a, b) => (Number(b.__hexValue ?? 0) || 0) - (Number(a.__hexValue ?? 0) || 0)
                );
                const previous = tribeHexSnapshots?.[hexFocusKey];
                const snapshotValid = Boolean(snapshotId && previous?.snapshotId === snapshotId);
                setUserList(attachScopedRanks(arr, previous?.entries, visibleMemberIds, snapshotValid));
            } else {
                const ranked = rankUsers(visible, comparedExercise, comparedMetric);
                const previous = tribeExerciseSnapshots?.[comparedExercise];
                const snapshotValid = Boolean(snapshotId && previous?.snapshotId === snapshotId);
                setUserList(attachScopedRanks(ranked, previous?.entries, visibleMemberIds, snapshotValid));
            }
            return;
        }

        const usingHexFocus = !!hexFocusKey;

        const base = all.filter((usr) => followingSet.has(String(usr?.uid || "")));
        const visible = filterBlockedVisibility(base);
        const visibleFollowingIds = visible
            .map((user) => coerceUid(user))
            .filter(Boolean);
        if (usingHexFocus) {
            let arr = Array.isArray(visible)
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
            arr = applyViewerHexOverride(arr, hexFocusKey);
            arr.sort(
                (a, b) => (Number(b.__hexValue ?? 0) || 0) - (Number(a.__hexValue ?? 0) || 0)
            );
            const previous = followingHexSnapshots?.[hexFocusKey];
            const snapshotValid = Boolean(snapshotId && previous?.snapshotId === snapshotId);
            setUserList(attachScopedRanks(arr, previous?.entries, visibleFollowingIds, snapshotValid));
        } else {
            const ranked = rankUsers(visible, comparedExercise, comparedMetric);
            const previous = followingExerciseSnapshots?.[comparedExercise];
            const snapshotValid = Boolean(snapshotId && previous?.snapshotId === snapshotId);
            setUserList(attachScopedRanks(ranked, previous?.entries, visibleFollowingIds, snapshotValid));
        }
    }, [
        bodyFocus,
        isCustomTribe,
        tribesHydrated,
        currentTribe,
        activeComparison,
        comparedExercise,
        comparedMetric,
        selectedTribeId,
        snapshotMeta?.snapshotId,
        viewerWeight,
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
        userSignals.personalInfoKey,
    ]);

    useEffect(() => {
        if (tribeComparisons.length === 0) {
            if (activeCompIndex !== 0) setActiveCompIndex(0);
            return;
        }
        const maxIndex = Math.max(0, tribeComparisons.length - 1);
        const clamped = Math.min(Math.max(0, activeCompIndex), maxIndex);
        if (clamped !== activeCompIndex) {
            setActiveCompIndex(clamped);
        }
    }, [tribeComparisons.length, activeCompIndex]);

    const rankedDisplay = useMemo(() => userList || [], [userList]);

    useEffect(() => {
        const requiresBodyweight = Boolean(isCustomTribe && activeComparison?.normalizeByBodyweight);
        const nextReason = requiresBodyweight && !(viewerWeight > 0) ? BODYWEIGHT_BLOCK_MESSAGE : null;
        if (blockedReason !== nextReason) {
            setBlockedReason(nextReason);
        }
    }, [isCustomTribe, selectedTribeId, activeComparison?.normalizeByBodyweight, viewerWeight, blockedReason]);

    const openModal = () => setSelectExerciseModalVisible(true);
    const closeModal = () => setSelectExerciseModalVisible(false);
    const showUserStats = (user) => {
        if (delegatedUserStats && typeof onShowUserStats === "function") {
            onShowUserStats(user);
            return;
        }
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
            const tribeScopeKey = String(currentTribe?.id || selectedTribeId || "");
            const tribeUsers = all.filter((x) => memberSet.has(coerceUid(x)));
            const visible = filterBlockedVisibility(tribeUsers, { respectPrivacy: false });
            const visibleMemberIds = visible
                .map((user) => coerceUid(user))
                .filter(Boolean);
            const overrideWeights = new Map();
            if (viewerUid && viewerWeight > 0) {
                overrideWeights.set(viewerUid, viewerWeight);
            }
            const ranked = computeTribeRanking(
                visible,
                comp,
                overrideWeights.size ? overrideWeights : null
            );

            const viewerLastRanks =
                global && global.userData && typeof global.userData.lastRanks === "object"
                    ? global.userData.lastRanks
                    : {};
            const tribeSnapshots = viewerLastRanks?.tribes || {};
            const tribeSnapshot = tribeSnapshots?.[tribeScopeKey] || {};
            const previous = tribeSnapshot?.exercises?.[comp?.exercise || ""];
            const snapshotValid = Boolean(snapshotId && previous?.snapshotId === snapshotId);

            setUserList(attachScopedRanks(ranked, previous?.entries, visibleMemberIds, snapshotValid));
        },
        [
            tribeComparisons,
            isCustomTribe,
            currentTribe,
            selectedTribeId,
            snapshotMeta?.snapshotId,
            viewerWeight,
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
    const handleBodyWeightEntryRequest = useCallback(() => {
        if (typeof onRequestBodyWeightEntry === "function") {
            try {
                onRequestBodyWeightEntry();
                return;
            } catch (error) {
                console.warn("leaderboard body weight request failed", error);
            }
        }
        setPersonalSheetIndex(1);
    }, [onRequestBodyWeightEntry]);
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
        setInfoForm((prev) => {
            const next = {
                ...prev,
                gender: pi.gender ?? prev.gender,
                activity: pi.activity ?? prev.activity,
                goal: pi.goal ?? prev.goal,
                weight: pi.weight != null ? String(pi.weight) : prev.weight,
                heightFt: pi.heightFt != null ? String(pi.heightFt) : prev.heightFt,
                heightIn: pi.heightIn != null ? String(pi.heightIn) : prev.heightIn,
            };
            const changed =
                next.gender !== prev.gender ||
                next.activity !== prev.activity ||
                next.goal !== prev.goal ||
                next.weight !== prev.weight ||
                next.heightFt !== prev.heightFt ||
                next.heightIn !== prev.heightIn;
            return changed ? next : prev;
        });
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
            await updateDoc(doc(db, "usersPrivate", uid), {
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
        await updateDoc(doc(db, "usersPrivate", uid), { tribeIds: arrayUnion(ref.id) }).catch(() => { });
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

        const tribeRef = doc(db, "tribes", target.id);
        const membershipStatus = await runTransaction(db, async (tx) => {
            const tribeSnap = await tx.get(tribeRef);
            if (!tribeSnap.exists()) {
                throw new Error("tribe:not_found");
            }
            const data = tribeSnap.data() || {};
            const existingMembers = ensureUidArray(data.members);

            const myBlocked = new Set(
                ensureUidArray(global?.userData?.blockedUidList || global?.userData?.blocked)
            );
            const myBlockedBy = new Set(
                ensureUidArray(global?.userData?.blockedByUidList || global?.userData?.blockedBy)
            );
            const conflict = existingMembers.some(
                (memberUid) => myBlocked.has(memberUid) || myBlockedBy.has(memberUid)
            );
            if (conflict) {
                throw new Error("tribe:blocked_conflict");
            }

            if (existingMembers.includes(uid)) {
                return "already-member";
            }

            const nextMembers = [...existingMembers, uid];
            tx.set(
                tribeRef,
                { members: nextMembers, updatedAt: new Date() },
                { merge: true }
            );
            return "joined";
        }).catch((err) => {
            if (err?.message === "tribe:blocked_conflict") {
                Alert.alert(
                    "Cannot Join Tribe",
                    "You cannot join this tribe because it contains someone you have blocked or who has blocked you."
                );
                return "conflict";
            }
            if (err?.message === "tribe:not_found") {
                Alert.alert("Cannot Join Tribe", "This tribe is no longer available.");
                return "missing";
            }
            console.log("join tribe failed", err?.message || err);
            Alert.alert("Cannot Join Tribe", "We couldn’t join this tribe. Please try again.");
            return "error";
        });

        if (membershipStatus === "conflict" || membershipStatus === "missing" || membershipStatus === "error") {
            return;
        }

        await updateDoc(doc(db, "usersPrivate", uid), { tribeIds: arrayUnion(target.id) }).catch(() => { });
        setJoinModalVisible(false);
        setJoinCode("");
        setSelectedTribeId(target.id);
    };

    const handleLeaveTribe = async () => {
        const uid = global?.userData?.uid;
        if (!uid || !selectedTribeId) return;
        const tribeRef = doc(db, "tribes", selectedTribeId);
        await runTransaction(db, async (tx) => {
            const tribeSnap = await tx.get(tribeRef);
            if (!tribeSnap.exists()) return;
            const data = tribeSnap.data() || {};
            const existingMembers = ensureUidArray(data.members);
            const nextMembers = existingMembers.filter((memberUid) => memberUid !== uid);
            tx.set(
                tribeRef,
                { members: nextMembers, updatedAt: new Date() },
                { merge: true }
            );
        }).catch((err) => {
            console.log("leave tribe failed", err?.message || err);
        });
        await updateDoc(doc(db, "usersPrivate", uid), { tribeIds: arrayRemove(selectedTribeId) }).catch(() => { });
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
                type: "following",
                exercise: comparedExercise,
                metric: comparedMetric || "1RM",
                bodyFocus,
            };
        }

        const key = JSON.stringify(payload);
        if (key === lastViewRef.current) return;
        lastViewRef.current = key;
        try {
            updateDoc(doc(db, "usersPrivate", uid), { competitionLastView: payload }).catch(() => { });
        } catch {
            //
        }
    }, [selectedTribeId, activeComparison, comparedExercise, comparedMetric, bodyFocus]);

    const bodyFocusLabel = useMemo(
        () => BODY_FOCUS_LABEL_MAP[bodyFocus] || BODY_FOCUS_LABEL_MAP[DEFAULT_BODY_FOCUS],
        [bodyFocus]
    );

    const scopeLabel = useMemo(() => {
        if (selectedTribeId) return "Tribe";
        return "Following";
    }, [selectedTribeId]);

    const scopeSubtitle = useMemo(() => {
        if (selectedTribeId) {
            const name = currentTribe?.name;
            return name ? String(name) : null;
        }
        return "People you follow";
    }, [selectedTribeId, currentTribe]);

    const focusSubtitle = useMemo(() => {
        if (bodyFocusLabel === "Overall") return "All strengths";
        return `${bodyFocusLabel} focus`;
    }, [bodyFocusLabel]);

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
        const approxWidth = scaledSize(180, "w");
        const anchorWidth = Number(focusMenuAnchor?.width ?? approxWidth);
        const anchorRight = anchorX + anchorWidth;
        const desiredLeft = anchorRight - approxWidth;
        const maxLeft = Math.max(padding, DEVICE_WIDTH - approxWidth - padding);
        return Math.min(Math.max(desiredLeft, padding), maxLeft);
    }, [focusMenuAnchor?.x, focusMenuAnchor?.width]);

    const dropdownTop = useMemo(() => {
        const anchorY = Number(focusMenuAnchor?.y ?? 0);
        const anchorHeight = Number(focusMenuAnchor?.height ?? 0);
        return Math.max(0, anchorY + anchorHeight + scaledSize(6));
    }, [focusMenuAnchor?.y, focusMenuAnchor?.height]);

    const podiumData = useMemo(() => {
        if (!rankedDisplay || rankedDisplay.length === 0) return null;
        const top3 = rankedDisplay.slice(0, 3).map((u) => {
            let stat = 0;
            if (isCustomTribe && activeComparison) {
                stat = Number.isFinite(u?._tribeValue) ? u._tribeValue : 0;
            } else if (usingHexFocus) {
                const val = Number(u?.__hexValue ?? u?.statsHexagon?.[hexFocusKey] ?? 0);
                stat = Number.isFinite(val) ? val : 0;
            } else {
                const exStats = u?.statsExercises?.[comparedExercise] || {};
                stat = exStats?.[exerciseStatKey] ?? 0;
            }
            return {
                uid: u?.uid || u?.id || u?.userUid || null,
                handle: u?.handle,
                pfp: resolveProfileImage(u),
                stat,
                isVerified: Boolean(u?.isVerified ?? u?.verified ?? false),
                rankTier: u?.rankTier,
                rank: u?.rank,
                currentRank: u?.currentRank,
                rankObj: u?.rank,
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
            colors: [theme.bg, theme.bg, theme.bg, theme.bg, theme.bg, theme.surface],
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

    const renderScopeFocusPill = () => {
        const showManage = isCustomTribe && currentTribe;
        const viewerUid = (() => {
            try {
                const uid = global?.userData?.uid;
                const str = uid === undefined || uid === null ? null : String(uid);
                return str && str.length ? str : null;
            } catch {
                return null;
            }
        })();
        const badgeText = useMemo(() => {
            if (!Array.isArray(rankedDisplay) || rankedDisplay.length === 0) return null;
            let selfIndex = -1;
            for (let i = 0; i < rankedDisplay.length; i++) {
                const user = rankedDisplay[i];
                if (!user) continue;
                if (user.isSelf || user.userIsSelf || user.self) {
                    selfIndex = i;
                    break;
                }
                const candidates = [user.uid, user?.user?.uid, user.id, user.userId];
                if (viewerUid && candidates.some((c) => c !== undefined && c !== null && String(c) === viewerUid)) {
                    selfIndex = i;
                    break;
                }
            }
            if (selfIndex < 0) return null;
            const total = rankedDisplay.length;
            return `${ordinalSuffix(selfIndex + 1)} / ${ordinalSuffix(total)}`;
        }, [rankedDisplay, viewerUid]);
        return (
            <View style={styles.selectorShadow}>
                <View style={styles.selectorPill}>
                    <RNBounceable
                        onPress={withStrongPress(handleScopePress)}
                        activeScale={0.97}
                        hitSlop={{
                            top: SIZES.tribeHitSlop,
                            bottom: SIZES.tribeHitSlop,
                            left: SIZES.tribeHitSlop,
                            right: SIZES.tribeHitSlop,
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Change leaderboard scope"
                        style={[styles.selectorSegment, styles.selectorSegmentLeft]}
                    >
                        <View ref={scopeToggleAnchorRef} style={styles.selectorContent} collapsable={false}>
                            <View style={styles.selectorMainRow}>
                                <Text style={styles.selectorValue} numberOfLines={1} ellipsizeMode="tail">
                                    {scopeLabel}
                                </Text>
                                <Ionicons
                                    name={tribeMenuVisible ? "chevron-up" : "chevron-down"}
                                    size={Math.max(16, SIZES.headerIconSize - SIZES.chevronDelta)}
                                    color="rgba(255,255,255,0.98)"
                                    style={[styles.selectorIcon, styles.selectorIconHeavy]}
                                />
                            </View>
                        </View>
                    </RNBounceable>

                    {showManage ? (
                        <RNBounceable
                            onPress={withStrongPress(() => setManageModalVisible(true))}
                            activeScale={0.97}
                            accessibilityRole="button"
                            accessibilityLabel="Manage current tribe"
                            style={[styles.selectorSegment, styles.selectorSegmentRight]}
                        >
                            <View style={styles.selectorContent}>
                                <View style={styles.selectorMainRowRight}>
                                    {badgeText ? (
                                        <Text style={[styles.selectorBadgeText, styles.selectorBadgeInline]}>
                                            {badgeText}
                                        </Text>
                                    ) : null}
                                    <Text
                                        style={[styles.selectorValue, styles.selectorValueRight]}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        Manage
                                    </Text>
                                    <Ionicons
                                        name="settings-outline"
                                        size={17}
                                        color="rgba(255,255,255,0.98)"
                                        style={[styles.selectorIcon, styles.selectorIconHeavy]}
                                    />
                                </View>
                            </View>
                        </RNBounceable>
                    ) : (
                        <View style={[styles.selectorSegment, styles.selectorSegmentRight]}>
                            <View ref={focusToggleAnchorRef} style={styles.selectorContent} collapsable={false}>
                                <View style={styles.selectorMainRowRight}>
                                    {badgeText ? (
                                        <Text style={[styles.selectorBadgeText, styles.selectorBadgeInline]}>
                                            {badgeText}
                                        </Text>
                                    ) : null}
                                    <RNBounceable
                                        onPress={withStrongPress(handleToggleFocusMenu)}
                                        activeScale={0.97}
                                        accessibilityRole="button"
                                        accessibilityLabel="Change leaderboard focus"
                                    >
                                        <View style={styles.selectorMainRowRight}>
                                            <Text
                                                style={[styles.selectorValue, styles.selectorValueRight]}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                            >
                                                {bodyFocusLabel}
                                            </Text>
                                            <Ionicons
                                                name={isBodyFocusMenuVisible ? "chevron-up" : "chevron-down"}
                                                size={Math.max(16, SIZES.headerIconSize - SIZES.chevronDelta)}
                                                color="rgba(255,255,255,0.98)"
                                                style={[styles.selectorIcon, styles.selectorIconHeavy]}
                                            />
                                        </View>
                                    </RNBounceable>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const handleScrollEvent = useCallback(
        (event) => {
            if (typeof onScroll === "function") {
                onScroll(event);
            }
        },
        [onScroll]
    );

    return (
        <View style={styles.container}>
            <View
                pointerEvents="none"
                style={[styles.surfaceBackdrop, { top: surfaceBackdropTop }]}
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
                        {BODY_FOCUS_OPTIONS.map((opt) => {
                            const isActive = opt.value === bodyFocus;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.focusOption,
                                        isActive && styles.focusOptionActive,
                                    ]}
                                    onPress={withStrongPress(() => {
                                        setBodyFocus(opt.value);
                                        setIsBodyFocusMenuVisible(false);
                                    })}
                                >
                                    <View style={styles.focusOptionIconWrap}>
                                        <View
                                            style={[
                                                styles.focusOptionIconInner,
                                                styles.focusMuscleIconZoom,
                                            ]}
                                        >
                                            <MuscleGroupIcon
                                                segments={FOCUS_SEGMENTS[opt.value] || []}
                                                dimmed={!isActive}
                                                highlightColor={MUSCLE_ICON_HIGHLIGHT}
                                                dimHighlightColor={MUSCLE_ICON_HIGHLIGHT_DIM}
                                                strokeWidth={opt.value === "back" ? 14 : undefined}
                                                scale={MUSCLE_ICON_SCALES[opt.value] || 1}
                                                offsetY={MUSCLE_ICON_OFFSETS[opt.value] || 0}
                                            />
                                        </View>
                                    </View>
                                    <View style={styles.focusOptionLabelWrap}>
                                        <Text
                                            style={[
                                                styles.focusOptionLabel,
                                                isActive && styles.focusOptionLabelActive,
                                            ]}
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                        >
                                            {opt.label}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
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
                        <View style={styles.scopePillContainer}>
                            <RNBounceable
                                onPress={withStrongPress(handleScopePress)}
                                activeScale={0.97}
                                hitSlop={{
                                    top: SIZES.tribeHitSlop,
                                    bottom: SIZES.tribeHitSlop,
                                    left: SIZES.tribeHitSlop,
                                    right: SIZES.tribeHitSlop,
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Change tribe scope"
                            >
                                <View ref={scopeToggleAnchorRef} style={styles.simpleScopePill} collapsable={false}>
                                    <Text style={styles.simpleScopeText}>Following</Text>
                                    <Ionicons
                                        name={tribeMenuVisible ? "chevron-up" : "chevron-down"}
                                        size={scaledSize(16)}
                                        color="#0a0a0a"
                                        style={styles.simpleScopeChevron}
                                    />
                                </View>
                            </RNBounceable>
                        </View>
                        <View style={styles.focusPillContainer}>
                            <RNBounceable
                                onPress={withStrongPress(handleToggleFocusMenu)}
                                activeScale={0.96}
                                hitSlop={{
                                    top: SIZES.tribeHitSlop,
                                    bottom: SIZES.tribeHitSlop,
                                    left: SIZES.tribeHitSlop,
                                    right: SIZES.tribeHitSlop,
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Change muscle focus"
                            >
                                <View
                                    ref={focusToggleAnchorRef}
                                    style={[styles.simpleScopePill, styles.simpleFocusPill]}
                                    collapsable={false}
                                >
                                    <Text
                                        style={[styles.simpleScopeText, styles.simpleFocusText]}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {bodyFocusLabel}
                                    </Text>
                                    <Ionicons
                                        name={isBodyFocusMenuVisible ? "chevron-up" : "chevron-down"}
                                        size={scaledSize(16)}
                                        color="#0a0a0a"
                                        style={styles.simpleScopeChevron}
                                    />
                                </View>
                            </RNBounceable>
                        </View>
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
                onScroll={handleScrollEvent}
                scrollEventThrottle={16}
            >
                <View
                    pointerEvents="none"
                    style={[styles.surfaceBackdrop, { top: surfaceBackdropTop }]}
                />
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
                        onResolveBlocked={handleBodyWeightEntryRequest}
                        canvasColor={leaderboardCanvas}
                        minHeightOverride={panelCollapsedHeight}
                        containerStyle={styles.leaderboardContainer}
                    />
                    <View style={[styles.leaderboardFiller, { minHeight: scrollBottomPadding }]} />
                </View>
            </ScrollView>

            {!delegatedUserStats && (
                <View pointerEvents="box-none" style={styles.userStatsSheetWrapper}>
                    <UserStatsBottomSheet
                        user={selectedUser}
                        navigation={navigation}
                        isVisible={isUserStatsBottomSheetVisible}
                        setIsVisible={setIsUserStatsBottomSheetVisible}
                        sheetProgressSV={userStatsSheetProgress}
                    />
                </View>
            )}

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
                        if (!(viewerWeight > 0)) {
                            setBlockedReason(BODYWEIGHT_BLOCK_MESSAGE);
                            requestAnimationFrame(handleBodyWeightEntryRequest);
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
    surfaceBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.surface,
    },
    scrollRegion: { flex: 1 },
    scrollContent: {
        paddingTop: scaledSize(65),
        paddingBottom: scaledSize(10),
        flexGrow: 1,
        position: "relative",
    },
    podiumSection: {
        width: "100%",
        position: "relative",
        justifyContent: "flex-end",
        overflow: "visible",
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
    headerGradientWrapper: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 3,
        width: "100%",
        overflow: "visible",
    },
    header: {
        width: "100%",
        paddingTop: SIZES.headerPaddingTop,
        alignItems: "flex-end",
    },
    headerPillsRow: {
        width: "100%",
        paddingTop: scaledSize(12),
        paddingBottom: scaledSize(6),
        paddingRight: scaledSize(14),
        paddingLeft: scaledSize(14),
        alignItems: "flex-start",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: scaledSize(10),
    },
    scopePillContainer: {
        flex: 1,
        marginRight: scaledSize(10),
    },
    focusPillContainer: {
        justifyContent: "flex-end",
        alignItems: "flex-end",
        flexShrink: 1,
        minWidth: 0,
    },
    simpleScopePill: {
        alignSelf: "flex-start",
        backgroundColor: theme.primary,
        borderRadius: scaledSize(18),
        paddingHorizontal: scaledSize(14),
        paddingVertical: scaledSize(8),
        flexDirection: "row",
        alignItems: "center",
        gap: scaledSize(6),
        borderWidth: 0,
        elevation: 0,
    },
    simpleScopeText: {
        color: "#0a0a0a",
        fontFamily: "Outfit_700Bold",
        fontSize: scaledSize(14),
        letterSpacing: 0.2,
    },
    simpleFocusPill: {
        alignSelf: "flex-end",
        minWidth: scaledSize(90),
    },
    simpleFocusText: {
        flexShrink: 1,
        minWidth: 0,
    },
    simpleScopeChevron: {
        marginTop: scaledSize(1),
    },
    userStatsSheetWrapper: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 50,
        pointerEvents: "box-none",
    },
    selectorShadow: {
        width: "100%",
        borderRadius: scaledSize(22),
        shadowColor: "#000",
        shadowOpacity: 0.22,
        shadowRadius: scaledSize(18),
        shadowOffset: { width: 0, height: scaledSize(12) },
        elevation: 8,
        marginTop: scaledSize(2),
    },
    selectorPill: {
        flexDirection: "row",
        alignItems: "stretch",
        width: "100%",
        minHeight: scaledSize(58),
        backgroundColor: "transparent",
        borderRadius: scaledSize(22),
        paddingVertical: scaledSize(8),
        paddingHorizontal: scaledSize(12),
        borderWidth: scaledSize(2.5),
        borderColor: "#FFC83D",
    },
    selectorSegment: {
        paddingHorizontal: scaledSize(4),
        justifyContent: "center",
    },
    selectorSegmentLeft: {
        flex: 0.9,
        paddingRight: scaledSize(10),
    },
    selectorSegmentRight: {
        flex: 1.1,
        paddingLeft: scaledSize(10),
    },
    selectorContent: {
        flex: 1,
        width: "100%",
        justifyContent: "center",
        minWidth: 0,
    },
    selectorMainRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        minWidth: 0,
    },
    selectorMainRowRight: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        minWidth: 0,
    },
    selectorValue: {
        color: "#fff",
        fontFamily: "Outfit_700Bold",
        fontSize: scaledSize(14),
        letterSpacing: 0.2,
        includeFontPadding: false,
        flexShrink: 1,
    },
    selectorValueRight: {
        textAlign: "right",
    },
    selectorIcon: {
        marginTop: scaledSize(2),
        marginLeft: scaledSize(2),
    },
    selectorBadgeText: {
        color: theme.primary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaledSize(16),
        letterSpacing: 0.2,
    },
    selectorBadgeInline: {
        marginRight: scaledSize(8),
    },
    selectorIconHeavy: {
        textShadowColor: "rgba(255,255,255,0.95)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: scaledSize(1.3),
    },
    selectorSubtext: {
        marginTop: scaledSize(4),
        color: "rgba(255,255,255,0.74)",
        fontFamily: "Outfit_500Medium",
        fontSize: scaledSize(12),
        letterSpacing: 0.2,
        includeFontPadding: false,
    },
    focusDropdown: {
        position: "absolute",
        minWidth: scaledSize(200, "w"),
        borderRadius: scaledSize(14),
        backgroundColor: theme.surface,
        paddingVertical: scaledSize(8),
        paddingHorizontal: scaledSize(14),
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: scaledSize(10),
        shadowOffset: { width: 0, height: scaledSize(6) },
        elevation: 6,
    },
    focusOption: {
        paddingVertical: scaledSize(10),
        paddingHorizontal: scaledSize(12),
        borderRadius: scaledSize(12),
        marginBottom: scaledSize(4),
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "transparent",
    },
    focusOptionActive: {
        backgroundColor: "rgba(45,158,255,0.12)",
    },
    focusOptionLabel: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaledSize(14),
        color: "#EAEAEA",
        letterSpacing: 0.15,
    },
    focusOptionLabelActive: {
        color: "#fff",
    },
    focusOptionIconWrap: {
        width: scaledSize(56),
        height: scaledSize(56),
        marginRight: scaledSize(12),
        borderRadius: scaledSize(28),
        backgroundColor: "rgba(89, 169, 255, 0.12)",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    focusOptionIconInner: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: scaledSize(28),
        overflow: "hidden",
    },
    focusMuscleIconZoom: {
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    focusOptionLabelWrap: {
        flex: 1,
        justifyContent: "center",
    },
    focusModalOverlay: {
        flex: 1,
    },
    focusBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.35)",
    },
});

export default React.memo(LeaderboardsSection);
