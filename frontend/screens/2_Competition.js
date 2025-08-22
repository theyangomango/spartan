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
} from "react-native";
import Footer from "../components/Footer";
import Podium from "../components/2_Competition/Podium";
import rankUsers from "../helper/rankUsers";
import LeaderboardBottomSheet from "../components/2_Competition/LeaderboardBottomSheet";
import UserStatsBottomSheet from "../components/2_Competition/UserStats/UserStatsBottomSheet";
import { Octicons, Ionicons } from "@expo/vector-icons";
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

// Tribe subcomponents
import TribeMenu from "../components/2_Competition/TribeMenu";
import CreateTribeModal from "../components/2_Competition/CreateTribeModal";
import JoinTribeModal from "../components/2_Competition/JoinTribeModal";
import ManageTribeModal from "../components/2_Competition/ManageTribeModal";

const { width, height } = Dimensions.get("window");

// Responsive header sizes
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) {
        return { headerIconSize: 26.5, headerPaddingHorizontal: 30 };
    } else if (width >= 390 && height >= 844) {
        return { headerIconSize: 24.5, headerPaddingHorizontal: 25, headerPaddingTop: 5 };
    } else if (width >= 375 && height >= 812) {
        return { headerIconSize: 24, headerPaddingHorizontal: 22, headerPaddingTop: 10 };
    } else {
        return { headerIconSize: 22.5, headerPaddingHorizontal: 20, headerPaddingTop: 8 };
    }
};
const dynamicStyles = getDynamicStyles();

/* -------- Helpers -------- */
// Codes use A–Z + 0–9
const genCode = (len = 6) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
};

export default function Competition({ navigation }) {
    const usersRef = useRef([]);
    const userUnsubRef = useRef(null); // single Firestore listener

    const [userList, setUserList] = useState(null);
    const [comparedExercise, setComparedExercise] = useState("Bench Press (Barbell)");
    const [scope, setScope] = useState("Global"); // "Global" | "All Followers"
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isUserStatsBottomSheetVisible, setIsUserStatsBottomSheetVisible] = useState(false);
    const [footerKey, setFooterKey] = useState(0);

    const [infoPanelVisible, setInfoPanelVisible] = useState(false);
    const infoPanelOpacity = useRef(new Animated.Value(0)).current;

    const [comparedMetric, setComparedMetric] = useState("1RM");
    const exerciseStatKey = comparedMetric === "1RM" ? "1RM" : comparedMetric;

    // Tribes
    const [tribes, setTribes] = useState([]);
    const [selectedTribeId, setSelectedTribeId] = useState(null);
    const [tribeMenuVisible, setTribeMenuVisible] = useState(false);

    // Tribe modals
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [joinModalVisible, setJoinModalVisible] = useState(false);
    const [manageModalVisible, setManageModalVisible] = useState(false);

    // Inputs
    const [newTribeName, setNewTribeName] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [renameInput, setRenameInput] = useState("");

    /* init */
    useEffect(() => {
        init();
    }, []);

    useEffect(() => {
        const navUnsub = navigation.addListener("focus", () => {
            if (userUnsubRef.current) userUnsubRef.current();
            userUnsubRef.current = onSnapshot(doc(db, "users", global.userData.uid), async (docSnap) => {
                global.userData = docSnap.data();
                init();
            });
            setFooterKey((prevKey) => prevKey + 1);
        });
        return () => {
            navUnsub && navUnsub();
            if (userUnsubRef.current) {
                userUnsubRef.current();
                userUnsubRef.current = null;
            }
        };
    }, [navigation]);

    async function init() {
        const allUsers = await getAllUsers();
        usersRef.current = allUsers;
        recomputeBaseList();
    }

    /* base list by scope */
    const recomputeBaseList = useCallback(() => {
        if (scope === "All Followers") {
            const followersSet = new Set((global.userData?.following || []).map((u) => u.uid));
            const base = usersRef.current.filter(
                (usr) => usr?.uid === global.userData?.uid || followersSet.has(usr?.uid)
            );
            setUserList(rankUsers(base, comparedExercise));
        } else {
            setUserList(rankUsers(usersRef.current, comparedExercise));
        }
    }, [scope, comparedExercise]);

    useEffect(() => {
        recomputeBaseList();
    }, [recomputeBaseList]);

    /* tribes subscription */
    useEffect(() => {
        const uid = global?.userData?.uid;
        if (!uid) return;
        const tribesRef = collection(db, "tribes");
        const q = query(tribesRef, where("members", "array-contains", uid));
        const unsub = onSnapshot(q, (snap) => {
            const t = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setTribes(t);
            if (selectedTribeId && !t.find((x) => x.id === selectedTribeId)) {
                setSelectedTribeId(null);
            }
        });
        return unsub;
    }, [selectedTribeId]);

    /* final list (tribe filter) */
    const rankedDisplay = useMemo(() => {
        if (!userList) return [];
        if (!selectedTribeId) return userList;
        const tribe = tribes.find((t) => t.id === selectedTribeId);
        if (!tribe) return [];
        const memberSet = new Set(tribe.members || []);
        const tribeUsers = usersRef.current.filter((u) => memberSet.has(u.uid));
        return rankUsers(tribeUsers, comparedExercise);
    }, [userList, selectedTribeId, tribes, comparedExercise]);

    /* header actions */
    const openModal = () => setSelectExerciseModalVisible(true);
    const closeModal = () => setSelectExerciseModalVisible(false);

    const openBottomSheet = (user) => {
        setSelectedUser(user);
        setIsUserStatsBottomSheetVisible(true);
    };

    /* tribe flows triggered from menu */
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

    /* tribe CRUD */
    const handleCreateTribe = async () => {
        const uid = global?.userData?.uid;
        if (!uid || !newTribeName.trim()) return;
        const code = genCode(6); // A-Z + 0-9
        const ref = await addDoc(collection(db, "tribes"), {
            name: newTribeName.trim(),
            code,
            ownerUid: uid,
            members: [uid],
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
        // Uppercase and restrict to A-Z0-9 only
        const code = (joinCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (!uid || !code) return;

        const q = query(collection(db, "tribes"), where("code", "==", code));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const d = snap.docs[0];
        const target = { id: d.id, ...d.data() };

        await updateDoc(doc(db, "tribes", target.id), { members: arrayUnion(uid), updatedAt: serverTimestamp() });
        await updateDoc(doc(db, "users", uid), { tribeIds: arrayUnion(target.id) }).catch(() => { });
        setJoinModalVisible(false);
        setJoinCode("");
        setSelectedTribeId(target.id);
    };

    const handleLeaveTribe = async () => {
        const uid = global?.userData?.uid;
        if (!uid || !selectedTribeId) return;
        await updateDoc(doc(db, "tribes", selectedTribeId), { members: arrayRemove(uid), updatedAt: serverTimestamp() });
        await updateDoc(doc(db, "users", uid), { tribeIds: arrayRemove(selectedTribeId) }).catch(() => { });
        setManageModalVisible(false);
        setSelectedTribeId(null);
    };

    const handleRenameTribe = async () => {
        const uid = global?.userData?.uid;
        const t = tribes.find((x) => x.id === selectedTribeId);
        if (!uid || !t || t.ownerUid !== uid || !renameInput.trim()) return;
        await updateDoc(doc(db, "tribes", selectedTribeId), { name: renameInput.trim(), updatedAt: serverTimestamp() });
        setRenameInput("");
        setManageModalVisible(false);
    };

    const currentTribe = useMemo(
        () => tribes.find((x) => x.id === selectedTribeId) || null,
        [tribes, selectedTribeId]
    );

    // Header label text: Global | Followers | <Tribe Name>
    const scopeLabel = useMemo(() => {
        if (selectedTribeId) return currentTribe?.name || "Tribe";
        return scope === "All Followers" ? "Followers" : "Global";
    }, [selectedTribeId, currentTribe, scope]);

    return (
        <View style={styles.mainContainer}>
            <SafeAreaView>
                <View
                    style={[
                        styles.header,
                        {
                            paddingHorizontal: dynamicStyles.headerPaddingHorizontal,
                            paddingTop: dynamicStyles.headerPaddingTop,
                        },
                    ]}
                >
                    {/* <Octicons
                        name="gear"
                        size={dynamicStyles.headerIconSize - 2}
                        color={"#eee"}
                        style={{ opacity: 0.5 }}
                    /> */}
                    <View style={styles.headerRightContainer}>
                        {/* Label then icon (icon on the RIGHT) */}
                        <TouchableOpacity
                            onPress={() => setTribeMenuVisible(true)}
                            style={styles.tribeButtonRow}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.tribeLabel} numberOfLines={1} ellipsizeMode="tail">
                                {scopeLabel}
                            </Text>
                            <Ionicons
                                name="people-circle"
                                size={dynamicStyles.headerIconSize + 3}
                                color={"#fff"}
                                style={styles.tribeIcon}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            <InfoPanel isVisible={infoPanelVisible} opacity={infoPanelOpacity} />

            <Podium
                data={
                    rankedDisplay && rankedDisplay.length > 0
                        ? rankedDisplay
                            .slice(0, 3)
                            .map((user) =>
                                user && user.handle && user.image && global.userData.statsExercises
                                    ? {
                                        handle: user.handle,
                                        pfp: user.image,
                                        stat:
                                            global.userData.statsExercises[comparedExercise]?.[
                                            exerciseStatKey
                                            ] || 0,
                                    }
                                    : null
                            )
                            .filter(Boolean)
                        : null
                }
            />

            {/* Metric toggle lives in the bottom sheet */}
            <LeaderboardBottomSheet
                userList={rankedDisplay}
                categoryCompared={comparedExercise}
                comparedMetric={comparedMetric}
                onToggleMetric={() =>
                    setComparedMetric((prev) =>
                        prev === "1RM" ? "Volume" : prev === "Volume" ? "Reps" : "1RM"
                    )
                }
                openModal={openModal}
                openBottomSheet={openBottomSheet}
            />

            <UserStatsBottomSheet
                user={selectedUser}
                navigation={navigation}
                isVisible={isUserStatsBottomSheetVisible}
                setIsVisible={setIsUserStatsBottomSheetVisible}
            />

            <Footer key={footerKey} navigation={navigation} currentScreenName={"Competition"} />

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

            {/* Tribe UI */}
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
                onSelectFollowers={() => {
                    setSelectedTribeId(null);
                    setScope("All Followers");
                    setTribeMenuVisible(false);
                }}
                onSelectTribe={(id) => {
                    setSelectedTribeId(id);
                    setTribeMenuVisible(false);
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
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: "#59AAEE" },
    header: { alignItems: "flex-end", justifyContent: "flex-end", flexDirection: "row" },
    headerRightContainer: { flexDirection: "row", alignItems: "center" },

    // Label + icon row (icon on right)
    tribeButtonRow: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        // Optional subtle background:
        // backgroundColor: "rgba(255,255,255,0.12)",
    },
    tribeLabel: {
        color: "#fff",
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        includeFontPadding: false,
        maxWidth: 160,
        marginRight: 6, // space between text and icon
    },
    tribeIcon: {
        marginTop: 1,
    },
});
