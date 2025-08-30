// components/1_Feed/FeedHeader.jsx
import React, { memo, useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    Dimensions,
    TextInput,
    FlatList,
    Modal,
    TouchableWithoutFeedback,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import RNBounceable from "@freakycoder/react-native-bounceable";
import Svg, { Path } from "react-native-svg";
import { Weight } from "iconsax-react-native";
import { getFeedHeaderStyles } from "../../helper/getFeedHeaderStyles";
import { db } from "../../../firebase.config";
import { collection, query, where, onSnapshot, getDocs, orderBy, limit } from "firebase/firestore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const dynamicStyles = getFeedHeaderStyles(SCREEN_WIDTH, SCREEN_HEIGHT);
const scale = SCREEN_WIDTH / 375;
const s = (n) => Math.round(n * scale);

/* ---------- constants to lock header height ---------- */
const CENTER_SLOT_H = s(28);
const NUDGE_MARGIN = s(5);

/* ------------------------------ Debounce ------------------------------ */
const useDebounce = (fn, delay = 220) => {
    const t = useRef(null);
    return (...args) => {
        if (t.current) clearTimeout(t.current);
        t.current = setTimeout(() => fn(...args), delay);
    };
};

/* --------------------------- Highlight helper --------------------------- */
const Highlighted = ({ text = "", query = "", style, highlightStyle }) => {
    if (!query) return <Text style={style}>{text}</Text>;
    const q = query.trim().toLowerCase();
    if (!q) return <Text style={style}>{text}</Text>;

    const lower = (text || "").toLowerCase();
    const parts = [];
    let i = 0;
    while (i < text.length) {
        const idx = lower.indexOf(q, i);
        if (idx === -1) {
            parts.push({ t: text.slice(i), h: false });
            break;
        }
        if (idx > i) parts.push({ t: text.slice(i, idx), h: false });
        parts.push({ t: text.slice(idx, idx + q.length), h: true });
        i = idx + q.length;
    }

    return (
        <Text style={style}>
            {parts.map((p, k) =>
                p.h ? (
                    <Text key={k} style={highlightStyle}>
                        {p.t}
                    </Text>
                ) : (
                    <Text key={k}>{p.t}</Text>
                )
            )}
        </Text>
    );
};

/* --------------------------- ProfileCard --------------------------- */
const ProfileCard = React.memo(({ user, query, onPress }) => {
    const avatarSize = s(44);
    const hasPfp = !!user?.pfp;

    return (
        <RNBounceable onPress={onPress} style={styles.profileCard} bounceEffectIn={0.96}>
            <View style={styles.profileLeft}>
                <View
                    style={[styles.avatarRing, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                >
                    {hasPfp ? (
                        <Image
                            source={{ uri: user.pfp }}
                            style={{
                                width: avatarSize - 4,
                                height: avatarSize - 4,
                                borderRadius: (avatarSize - 4) / 2,
                                backgroundColor: "#f3f4f6",
                            }}
                        />
                    ) : (
                        <Ionicons name="person-circle" size={avatarSize} color="#C7C7CC" />
                    )}
                </View>

                <View style={{ marginLeft: s(12), flex: 1, minWidth: 0 }}>
                    <Highlighted
                        text={`@${user.handle || "user"}`}
                        query={query}
                        style={styles.cardHandle}
                        highlightStyle={styles.cardHandleHighlight}
                    />
                    {!!user.name && (
                        <Highlighted
                            text={user.name}
                            query={query}
                            style={styles.cardName}
                            highlightStyle={styles.cardNameHighlight}
                        />
                    )}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={s(18)} color="#9AA1A9" />
        </RNBounceable>
    );
});

/* --------------------------- Full-takeover Search --------------------------- */
const SearchUsersBar = ({ navigation, allUsersRef, disabled = false }) => {
    const [visible, setVisible] = useState(false);
    const [modalKey, setModalKey] = useState(0);
    const [qStr, setQStr] = useState("");
    const [results, setResults] = useState([]);

    const suggestions = useMemo(() => {
        const arr = (allUsersRef?.current || [])
            .filter((u) => u?.uid && u.uid !== global?.userData?.uid)
            .slice(0, 10);
        return arr;
    }, [allUsersRef?.current]);

    const open = useCallback(() => {
        if (disabled) return;
        setModalKey((k) => k + 1);
        setVisible(true);
    }, [disabled]);

    const close = useCallback(() => {
        setVisible(false);
        setQStr("");
        setResults([]);
    }, []);

    const localFilter = (text) => {
        const all = allUsersRef?.current || [];
        const needle = (text || "").toLowerCase();
        const out = all
            .filter((u) => u?.uid !== global?.userData?.uid)
            .filter(
                (u) =>
                    (u?.handle || "").toLowerCase().includes(needle) ||
                    (u?.name || "").toLowerCase().includes(needle)
            )
            .slice(0, 30);
        setResults(out);
    };

    const remotePrefixQuery = async (text) => {
        const needle = (text || "").toLowerCase();
        if (!needle) return setResults([]);

        const usersCol = collection(db, "users");
        const handleQ = query(
            usersCol,
            orderBy("handle_lower"),
            where("handle_lower", ">=", needle),
            where("handle_lower", "<=", needle + "\uf8ff"),
            limit(15)
        );
        const nameQ = query(
            usersCol,
            orderBy("name_lower"),
            where("name_lower", ">=", needle),
            where("name_lower", "<=", needle + "\uf8ff"),
            limit(15)
        );

        const [hSnap, nSnap] = await Promise.all([getDocs(handleQ), getDocs(nameQ)]);
        const map = new Map();
        hSnap.forEach((d) => map.set(d.id, d.data()));
        nSnap.forEach((d) => map.set(d.id, d.data()));

        const me = global?.userData?.uid;
        const merged = Array.from(map.entries())
            .map(([uid, data]) => ({
                uid,
                handle: data?.handle ?? "",
                name: data?.name ?? "",
                pfp: data?.pfp ?? "",
            }))
            .filter((u) => u.uid !== me)
            .slice(0, 30);

        setResults(merged);
    };

    const doSearch = useDebounce((text) => {
        if (!text) return setResults([]);
        if (allUsersRef?.current?.length) localFilter(text);
        else remotePrefixQuery(text).catch(() => setResults([]));
    }, 220);

    if (disabled) return <View style={styles.left_placeholder} />;

    return (
        <>
            <RNBounceable onPress={open} bounceEffectIn={0.5} style={styles.searchIconBtn} accessibilityLabel="Search users">
                <Ionicons name="search" size={dynamicStyles.iconSize} color="#6B7280" />
            </RNBounceable>

            <Modal
                key={modalKey}
                visible={visible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={close}
            >
                <View style={styles.modalContainer}>
                    <TouchableWithoutFeedback onPress={close}>
                        <View style={styles.canvasFill} />
                    </TouchableWithoutFeedback>

                    <KeyboardAvoidingView
                        style={StyleSheet.absoluteFill}
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                    >
                        <SafeAreaView style={styles.modalContent} pointerEvents="box-none">
                            <View style={styles.overlayBar}>
                                <View style={styles.overlayLeftIcon}>
                                    <Ionicons name="search" size={dynamicStyles.iconSize} color="#6B7280" />
                                </View>

                                <View style={styles.overlayInputWrap}>
                                    <TextInput
                                        style={styles.overlayInput}
                                        placeholder="Search people"
                                        placeholderTextColor="#9AA5B1"
                                        value={qStr}
                                        onChangeText={(t) => {
                                            setQStr(t);
                                            doSearch(t);
                                        }}
                                        autoFocus
                                        returnKeyType="search"
                                    />
                                    <TouchableOpacity
                                        onPress={() => (qStr ? (setQStr(""), setResults([])) : close())}
                                        style={styles.clearBtn}
                                        accessibilityLabel={qStr ? "Clear search" : "Close search"}
                                    >
                                        <Ionicons name="close" size={s(18)} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {qStr ? (
                                results.length > 0 ? (
                                    <View style={styles.resultsWrap}>
                                        <FlatList
                                            keyboardShouldPersistTaps="handled"
                                            data={results}
                                            keyExtractor={(item) => item.uid}
                                            renderItem={({ item }) => (
                                                <ProfileCard
                                                    user={item}
                                                    query={qStr}
                                                    onPress={() => {
                                                        if (item.uid === global?.userData?.uid) {
                                                            navigation?.navigate("Profile");
                                                        } else {
                                                            navigation?.navigate("ViewProfile", {
                                                                user: { uid: item.uid, handle: item.handle, name: item.name, pfp: item.pfp },
                                                            });
                                                        }
                                                        close();
                                                    }}
                                                />
                                            )}
                                            ItemSeparatorComponent={() => <View style={styles.separatorFull} />}
                                            contentContainerStyle={styles.listContent}
                                            showsVerticalScrollIndicator={false}
                                        />
                                    </View>
                                ) : (
                                    <View style={styles.noResultsWrap}>
                                        <Ionicons name="search-outline" size={s(18)} color="#9AA1A9" />
                                        <Text style={styles.noResultsText}>No people found</Text>
                                    </View>
                                )
                            ) : (
                                <View style={styles.resultsWrap}>
                                    <Text style={styles.sectionTitle}>Suggested</Text>
                                    <FlatList
                                        keyboardShouldPersistTaps="handled"
                                        data={suggestions}
                                        keyExtractor={(item) => item.uid}
                                        renderItem={({ item }) => (
                                            <ProfileCard
                                                user={item}
                                                query={""}
                                                onPress={() => {
                                                    if (item.uid === global?.userData?.uid) {
                                                        navigation?.navigate("Profile");
                                                    } else {
                                                        navigation?.navigate("ViewProfile", {
                                                            user: { uid: item.uid, handle: item.handle, name: item.name, pfp: item.pfp },
                                                        });
                                                    }
                                                    close();
                                                }}
                                            />
                                        )}
                                        ItemSeparatorComponent={() => <View style={styles.separatorFull} />}
                                        contentContainerStyle={styles.listContent}
                                        showsVerticalScrollIndicator={false}
                                    />
                                </View>
                            )}
                        </SafeAreaView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </>
    );
};

/* ----------------------------- FeedHeader ----------------------------- */

const FeedHeader = ({
    toMessagesScreen,
    onOpenNotifications,
    backButton,
    onBackPress,
    scrollToTop,
    navigation,
    allUsersRef,

    // workout pill
    workout,        // ← rely only on this (no globals)
    openCurrentWorkout,
    timerRef,       // ← must be a ref updated by parent; empty string means “no workout”
}) => {
    const [unreadCount, setUnreadCount] = useState(0);

    // Always mirror timerRef into local state so UI re-renders when ref changes.
    const [elapsed, setElapsed] = useState(""); // never default to "00:00"
    useEffect(() => {
        const id = setInterval(() => {
            const v = (timerRef?.current || "").trim();
            if (v !== elapsed) setElapsed(v);
        }, 400);
        return () => clearInterval(id);
    }, [timerRef, elapsed]);

    // Show pill only when:
    //  - we have a workout prop with a wid
    //  - and we have a non-empty elapsed string not equal to "00:00"
    const showPill = !!workout?.wid && !!elapsed && elapsed !== "00:00";

    useEffect(() => {
        const uid = global?.userData?.uid;
        if (!uid) return;
        const notificationsRef = collection(db, "users", uid, "notifications");
        const q = query(notificationsRef, where("read", "==", false));
        const unsubscribe = onSnapshot(q, (snapshot) => setUnreadCount(snapshot.size));
        return () => unsubscribe();
    }, []);

    if (backButton) {
        return (
            <View style={[styles.back_header]}>
                <TouchableOpacity onPress={onBackPress}>
                    <Ionicons name="chevron-back" size={dynamicStyles.iconSize} color="#000" />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.main_ctnr]}>
            {/* Left: Search */}
            <View style={styles.leftArea}>
                <SearchUsersBar navigation={navigation} allUsersRef={allUsersRef} />
            </View>

            {/* Center: fixed-height slot */}
            <View style={styles.centerArea}>
                <View style={styles.centerSlot}>
                    {showPill ? (
                        <RNBounceable
                            onPress={() => (openCurrentWorkout ? openCurrentWorkout() : navigation?.navigate?.("Workout"))}
                            style={styles.resumeBtnBlue}
                            accessibilityLabel={`Open ongoing workout, elapsed ${elapsed}`}
                        >
                            <Weight size={s(16)} color="#FFFFFF" variant="Bold" />
                            <View style={styles.dotBlue} />
                            <Text style={styles.resumeTimeBlue}>{elapsed}</Text>
                        </RNBounceable>
                    ) : (
                        <RNBounceable onPress={scrollToTop} style={styles.logoWrap}>
                            <View style={styles.logo_image_ctnr}>
                                <Image
                                    source={require("../../../frontend/assets/logo_feed_black.png")}
                                    style={styles.logo_image}
                                />
                            </View>
                            <Text style={styles.logo_text}>SPARTAN</Text>
                        </RNBounceable>
                    )}
                </View>
            </View>

            {/* Right: notifications + messages */}
            <View style={styles.right_icons}>
                <RNBounceable onPress={onOpenNotifications} style={styles.heart_button}>
                    <Svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={dynamicStyles.iconSize}
                        height={dynamicStyles.iconSize}
                        viewBox="0 0 24 24"
                        fill="none"
                    >
                        <Path
                            d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z"
                            stroke="#cbd5e1"
                            strokeWidth="2.1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                    {unreadCount > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationText}>{unreadCount}</Text>
                        </View>
                    )}
                </RNBounceable>

                <RNBounceable onPress={toMessagesScreen} style={styles.message_button}>
                    <MaterialIcons name="alternate-email" size={dynamicStyles.iconSize + 1.5} color={"#cbd5e1"} />
                </RNBounceable>
            </View>
        </View>
    );
};

export default memo(FeedHeader);

/* -------------------------------- Styles ------------------------------- */
const styles = StyleSheet.create({
    main_ctnr: {
        width: "100%",
        backgroundColor: "#F7FAFF",
        flexDirection: "row",
        justifyContent: "center",
        paddingTop: s(2),
        paddingBottom: s(10),
        alignItems: "center",
        paddingHorizontal: dynamicStyles.paddingHorizontal,
        marginTop: NUDGE_MARGIN,
    },

    back_header: {
        width: "100%",
        backgroundColor: "#fff",
        flexDirection: "row",
        paddingLeft: dynamicStyles.paddingHorizontal,
        paddingTop: s(6),
        paddingBottom: s(4),
        alignItems: "center",
        marginTop: NUDGE_MARGIN,
    },

    leftArea: {
        position: "absolute",
        left: dynamicStyles.paddingHorizontal,
        top: NUDGE_MARGIN,
    },

    centerArea: { justifyContent: "center", alignItems: "center" },

    centerSlot: {
        paddingHorizontal: s(10),
        height: CENTER_SLOT_H,
        minWidth: s(140),
        alignItems: "center",
        justifyContent: "center",
    },

    logoWrap: { height: "100%", flexDirection: "row", alignItems: "center", paddingTop: s(4) },
    logo_image_ctnr: { justifyContent: "center", alignItems: "center" },
    logo_image: { width: s(24), height: s(25) },
    logo_text: {
        paddingLeft: s(6),
        fontFamily: "Inter_600SemiBold",
        fontSize: s(16),
        color: "#0f172a",
        includeFontPadding: false,
        ...Platform.select({ android: { lineHeight: s(19) } }),
    },

    resumeBtnBlue: {
        height: "100%",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: s(12),
        borderRadius: CENTER_SLOT_H / 2,
        backgroundColor: "#2D9EFF",
        borderWidth: 1,
        borderColor: "transparent",
        ...Platform.select({
            ios: { shadowColor: "#2D9EFF", shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 3 } },
            android: { elevation: 3 },
        }),
    },
    dotBlue: { width: s(4), height: s(4), borderRadius: s(2), backgroundColor: "#FFFFFF", marginHorizontal: s(6), opacity: 0.9 },
    resumeTimeBlue: {
        fontFamily: "Outfit_700Bold",
        fontSize: s(12.5),
        color: "#FFFFFF",
        letterSpacing: 0.2,
        includeFontPadding: false,
        ...Platform.select({ android: { lineHeight: s(15) } }),
    },

    right_icons: {
        flexDirection: "row",
        position: "absolute",
        right: dynamicStyles.paddingHorizontal,
        top: NUDGE_MARGIN,
        alignItems: "center",
    },

    notificationBadge: {
        position: "absolute",
        right: -7.5,
        top: -5,
        backgroundColor: "#ef4444",
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    notificationText: { color: "#fff", fontSize: 8, fontFamily: "Outfit_600SemiBold" },
    message_button: { padding: 1 },
    heart_button: { marginRight: 19, padding: 1, position: "relative" },

    left_placeholder: { width: dynamicStyles.iconSize + 6, height: dynamicStyles.iconSize + 6 },

    modalContainer: { flex: 1, justifyContent: "flex-start" },
    canvasFill: { ...StyleSheet.absoluteFillObject, backgroundColor: "#F8FAFC" },
    modalContent: { flex: 1, paddingHorizontal: dynamicStyles.paddingHorizontal, paddingTop: s(8), marginTop: NUDGE_MARGIN },

    overlayBar: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: s(10),
        marginLeft: dynamicStyles.paddingHorizontal,
        marginRight: 10,
    },
    overlayLeftIcon: {
        width: dynamicStyles.iconSize + 6,
        height: dynamicStyles.iconSize + 6,
        borderRadius: (dynamicStyles.iconSize + 6) / 2,
        alignItems: "center",
        justifyContent: "center",
    },

    overlayInputWrap: {
        flex: 1,
        marginLeft: s(10),
        height: s(38),
        borderRadius: s(24),
        backgroundColor: "#FFFFFF",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: s(12),
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.08)",
    },
    overlayInput: { flex: 1, fontSize: s(13), color: "#0f172a", fontFamily: "Poppins_500Medium" },
    clearBtn: { padding: s(6), marginLeft: s(4) },

    resultsWrap: { flex: 1, width: "100%" },
    listContent: { paddingTop: s(6) },
    separatorFull: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(15,23,42,0.08)" },

    sectionTitle: { paddingVertical: s(8), fontFamily: "Outfit_700Bold", color: "#0f172a", fontSize: s(14), paddingHorizontal: 16 },

    noResultsWrap: {
        marginTop: s(16),
        alignSelf: "center",
        paddingHorizontal: s(14),
        paddingVertical: s(10),
        borderRadius: s(12),
        backgroundColor: "#EEF2F7",
        flexDirection: "row",
        alignItems: "center",
        gap: s(8),
    },
    noResultsText: { color: "#64748B", fontSize: s(12.5), fontFamily: "Outfit_600SemiBold" },

    profileCard: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", paddingVertical: s(12), paddingHorizontal: s(18) },
    profileLeft: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
    avatarRing: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(4,153,254,0.25)", backgroundColor: "#fff" },

    cardHandle: { fontFamily: "Outfit_700Bold", fontSize: s(13.5), color: "#0f172a" },
    cardHandleHighlight: { color: "#0499FE" },
    cardName: { marginTop: s(2), fontFamily: "Outfit_400Regular", fontSize: s(12.5), color: "#64748B" },
    cardNameHighlight: { color: "#0f172a", fontFamily: "Outfit_600SemiBold" },

    searchIconBtn: {
        width: dynamicStyles.iconSize + 6,
        height: dynamicStyles.iconSize + 6,
        borderRadius: (dynamicStyles.iconSize + 6) / 2,
        alignItems: "center",
        justifyContent: "center",
    },
});
