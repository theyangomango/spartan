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

const { width, height } = Dimensions.get("window");

// -------- scaler (replaces getDynamicStyles) --------
const BASE = { width: 390, height: 844 }; // iPhone 13 baseline
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
    headerPaddingHorizontal: scaleSize(24, "w"),    // horizontal padding scales with width
    headerPaddingTop: scaleSize(8, "h"),            // top padding scales with height

    // tribe scope button
    tribeBtnMarginLeft: scaleSize(10),
    tribeBtnPadH: scaleSize(12),
    tribeBtnPadV: scaleSize(8),
    tribeBtnRadius: scaleSize(16),
    tribeHitSlop: scaleSize(8),

    tribeLabelFont: scaleSize(14),
    tribeLabelMaxWidth: scaleSize(160),
    tribeLabelMarginRight: scaleSize(2),

    // icon margins
    iconMR: scaleSize(6),
    iconMT: scaleSize(1),
    chevronML: scaleSize(4),
    chevronMT: scaleSize(1),
};

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

export default function Competition({ navigation }) {
    const usersRef = useRef([]);
    const userUnsubRef = useRef(null);

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

    // ---- init users on mount/focus
    const initUsers = useCallback(async () => {
        const allUsers = await getAllUsers();
        usersRef.current = allUsers;
        setUsersLoaded(true); // let recompute effect decide when to run
    }, []);

    useEffect(() => { initUsers(); }, [initUsers]);

    useEffect(() => {
        const navUnsub = navigation.addListener("focus", () => {
            // Re-subscribe on focus without waiting for interactions to settle
            const id = setTimeout(() => {
                if (userUnsubRef.current) userUnsubRef.current();
                userUnsubRef.current = onSnapshot(doc(db, "users", global.userData.uid), async (docSnap) => {
                    global.userData = docSnap.data();
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
    }, [navigation, initUsers]);

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

    const isCustomTribe = !!selectedTribeId;
    const activeComparison =
        isCustomTribe && tribeComparisons.length > 0
            ? tribeComparisons[Math.min(activeCompIndex, tribeComparisons.length - 1)]
            : null;

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

        if (isCustomTribe) {
            // if we intend to show a tribe, do NOT recompute until tribe docs are ready
            if (!tribesHydrated || !currentTribe) return;

            const memberSet = new Set(currentTribe.members || []);
            const tribeUsers = all.filter((u) => memberSet.has(u?.uid));
            if (activeComparison) {
                setUserList(computeTribeRanking(tribeUsers, activeComparison));
            } else {
                setUserList(rankUsers(tribeUsers, comparedExercise, comparedMetric));
            }
            return;
        }

        // fallback scopes
        if (scope === "Following") {
            const followingSet = new Set((global.userData?.following || []).map((u) => u.uid));
            const base = all.filter((usr) => usr?.uid === global.userData?.uid || followingSet.has(usr?.uid));
            setUserList(rankUsers(base, comparedExercise, comparedMetric));
        } else {
            setUserList(rankUsers(all, comparedExercise, comparedMetric)); // Global
        }
    }, [isCustomTribe, tribesHydrated, currentTribe, activeComparison, comparedExercise, comparedMetric, scope]);

    // Run recompute ONLY when ready. Otherwise keep showing cached list.
    useEffect(() => {
        if (!usersLoaded) return;
        if (isCustomTribe && (!tribesHydrated || !currentTribe)) return;
        recompute();
    }, [usersLoaded, isCustomTribe, tribesHydrated, currentTribe, comparedExercise, activeComparison, scope, recompute]);

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
            try { global.userData = { ...(global.userData || {}), personalInfo: info }; } catch {}
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
            };
        }

        const key = JSON.stringify(payload);
        if (key === lastViewRef.current) return;
        lastViewRef.current = key;
        try {
            updateDoc(doc(db, "users", uid), { competitionLastView: payload }).catch(() => {});
        } catch { /* ignore */ }
    }, [selectedTribeId, activeComparison, scope, comparedExercise, comparedMetric]);

    const scopeLabel = useMemo(() => {
        if (selectedTribeId) return currentTribe?.name || "Tribe";
        return scope === "Following" ? "Following" : "Global";
    }, [selectedTribeId, currentTribe, scope]);

    const podiumData = useMemo(() => {
        if (!rankedDisplay || rankedDisplay.length === 0) return null;
        const top3 = rankedDisplay.slice(0, 3).map((u) => {
            let stat = 0;
            if (isCustomTribe && activeComparison) {
                stat = u?._tribeValue ?? 0;
            } else {
                const exStats = u?.statsExercises?.[comparedExercise] || {};
                stat = exStats?.[exerciseStatKey] ?? 0;
            }
            return { handle: u?.handle, pfp: u?.image, stat };
        });
        return top3.filter(Boolean);
    }, [rankedDisplay, isCustomTribe, activeComparison, comparedExercise, exerciseStatKey]);

    return (
        <View style={styles.mainContainer}>
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
                    <View style={styles.headerRightContainer}>
                        <RNBounceable
                            onPress={() => setTribeMenuVisible(true)}
                            style={[styles.tribeButtonRow, styles.tribeButtonPill]}
                            activeScale={0.96}
                            hitSlop={{ top: SIZES.tribeHitSlop, bottom: SIZES.tribeHitSlop, left: SIZES.tribeHitSlop, right: SIZES.tribeHitSlop }}
                            accessibilityRole="button"
                            accessibilityLabel="Change leaderboard scope"
                        >
                            <Ionicons
                                name="people"
                                size={SIZES.headerIconSize}
                                color="#fff"
                                style={{ marginRight: SIZES.iconMR, marginTop: SIZES.iconMT }}
                            />
                            <Text style={styles.tribeLabel} numberOfLines={1} ellipsizeMode="tail">
                                {scopeLabel}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={Math.max(12, SIZES.headerIconSize - SIZES.chevronDelta)}
                                color="rgba(255,255,255,0.95)"
                                style={{ marginLeft: SIZES.chevronML, marginTop: SIZES.chevronMT }}
                            />
                        </RNBounceable>
                    </View>
                </View>
            </SafeAreaView>

            <InfoPanel isVisible={false} opacity={useRef(new Animated.Value(0)).current} />
            <Podium data={podiumData} />

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
                isTribeFocused={isCustomTribe}
                tribeComparisons={tribeComparisons}
                activeCompIndex={activeCompIndex}
                onActiveCompChange={(idx) => {
                    setActiveCompIndex(idx);
                    // compute immediately if we have tribe members
                    const all = usersRef.current || [];
                    if (isCustomTribe && currentTribe) {
                        const memberSet = new Set(currentTribe.members || []);
                        const tribeUsers = all.filter((x) => memberSet.has(x?.uid));
                        const comp = tribeComparisons[idx];
                        if (comp) setUserList(computeTribeRanking(tribeUsers, comp));
                    }
                }}
                tribeComparisonSummary={activeComparison ? summaryOf(activeComparison) : "Not set"}
                onOpenTribeComparison={() => setComparisonManagerVisible(true)}
                blockedMessage={blockedReason}
                onResolveBlocked={() => setPersonalSheetIndex(1)}
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
                onSaveList={async (list) => {
                    if (!selectedTribeId) return;
                    await updateDoc(doc(db, "tribes", selectedTribeId), {
                        comparisons: list,
                        updatedAt: serverTimestamp(),
                    });
                    setComparisonManagerVisible(false);
                    if (activeCompIndex >= list.length) setActiveCompIndex(0);
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
                    text: '#EAEAEA',
                    subtext: '#AEB5C0',
                    card: '#252733',
                    hairline: 'rgba(255,255,255,0.08)',
                    accentBlue: '#6FB8FF',
                    fieldBg: '#1E232C',
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    // Dark mode background for Competition screen
    mainContainer: { flex: 1, backgroundColor: "#131521" },
    header: { alignItems: "flex-end", justifyContent: "flex-end", flexDirection: "row" },
    headerRightContainer: { flexDirection: "row", alignItems: "center" },
    tribeButtonRow: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: SIZES.tribeBtnMarginLeft,
        paddingHorizontal: SIZES.tribeBtnPadH,
        paddingVertical: SIZES.tribeBtnPadV,
        borderRadius: SIZES.tribeBtnRadius,
    },

    tribeButtonPill: {
        backgroundColor: "rgba(255, 255, 255, 0.16)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.25)",
    },

    tribeLabel: {
        color: "#fff",
        fontFamily: "Outfit_600SemiBold",
        fontSize: SIZES.tribeLabelFont,
        includeFontPadding: false,
        maxWidth: SIZES.tribeLabelMaxWidth,
        marginRight: SIZES.tribeLabelMarginRight,
        letterSpacing: 0.2,
    },
});
