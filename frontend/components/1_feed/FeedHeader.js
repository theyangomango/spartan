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
import { getFeedHeaderStyles } from "../../helper/getFeedHeaderStyles";
import { db } from "../../../firebase.config";
import {
    collection,
    query,
    where,
    onSnapshot,
    getDocs,
    orderBy,
    limit,
} from "firebase/firestore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const dynamicStyles = getFeedHeaderStyles(SCREEN_WIDTH, SCREEN_HEIGHT);
const scale = SCREEN_WIDTH / 375;
const s = (n) => Math.round(n * scale);

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

/* --------------------------- ProfileCard (full-width, internal padding) --------------------------- */
const ProfileCard = memo(({ user, query, onPress }) => {
    const avatarSize = s(44);
    const hasPfp = !!user?.pfp;

    return (
        <RNBounceable onPress={onPress} style={styles.profileCard} bounceEffectIn={0.96}>
            <View style={styles.profileLeft}>
                <View
                    style={[
                        styles.avatarRing,
                        { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                    ]}
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

/* --------------------------- Full-takeover Search (simple, padded) --------------------------- */
const SearchUsersBar = ({ navigation, allUsersRef, disabled = false }) => {
    const [visible, setVisible] = useState(false);
    const [modalKey, setModalKey] = useState(0); // ensure reliable open
    const [qStr, setQStr] = useState("");
    const [results, setResults] = useState([]);

    // Suggested users (when no query)
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

    // Search sources
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
            {/* Header icon (always visible, even when searching) */}
            <RNBounceable
                onPress={open}
                bounceEffectIn={0.5}
                style={styles.searchIconBtn}
                accessibilityLabel="Search users"
            >
                <Ionicons name="search" size={dynamicStyles.iconSize} color="#6B7280" />
            </RNBounceable>

            {/* Simple full-takeover (no fancy animations) */}
            <Modal
                key={modalKey}
                visible={visible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={close}
            >
                <View style={styles.modalContainer}>
                    {/* Solid canvas hides the feed entirely */}
                    <TouchableWithoutFeedback onPress={close}>
                        <View style={styles.canvasFill} />
                    </TouchableWithoutFeedback>

                    <KeyboardAvoidingView
                        style={StyleSheet.absoluteFill}
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                    >
                        <SafeAreaView style={styles.modalContent} pointerEvents="box-none">
                            {/* Top row: keep the search icon position; add top padding globally */}
                            <View style={styles.overlayBar}>
                                <View style={styles.overlayLeftIcon}>
                                    <Ionicons name="search" size={dynamicStyles.iconSize} color="#6B7280" />
                                </View>

                                {/* Clean pill input (no inner icon) */}
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

                            {/* Content (top + horizontal padding via container styles) */}
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
                                                                user: {
                                                                    uid: item.uid,
                                                                    handle: item.handle,
                                                                    name: item.name,
                                                                    pfp: item.pfp,
                                                                },
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
                                                            user: {
                                                                uid: item.uid,
                                                                handle: item.handle,
                                                                name: item.name,
                                                                pfp: item.pfp,
                                                            },
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
}) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const user = global.userData;

    useEffect(() => {
        if (!user?.uid) return;
        const notificationsRef = collection(db, "users", user.uid, "notifications");
        const q = query(notificationsRef, where("read", "==", false));
        const unsubscribe = onSnapshot(q, (snapshot) => setUnreadCount(snapshot.size));
        return () => unsubscribe();
    }, [user?.uid]);

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
            {/* Left: Search (icon always visible) */}
            <View style={styles.leftArea}>
                <SearchUsersBar navigation={navigation} allUsersRef={allUsersRef} />
            </View>

            {/* Center: Logo/title */}
            <RNBounceable onPress={scrollToTop} style={styles.centerArea}>
                <View style={styles.logo}>
                    <View style={styles.logo_image_ctnr}>
                        <Image
                            source={require("../../../frontend/assets/logo_black.png")}
                            style={styles.logo_image}
                        />
                    </View>
                    <Text style={[styles.logo_text, { fontSize: dynamicStyles.logoTextFontSize }]}>
                        SPARTAN
                    </Text>
                </View>
            </RNBounceable>

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
                    <MaterialIcons
                        name="alternate-email"
                        size={dynamicStyles.iconSize + 1.5}
                        color={"#cbd5e1"}
                    />
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
        backgroundColor: "#fff",
        flexDirection: "row",
        justifyContent: "center",
        paddingTop: s(4), // small top padding in header
        alignItems: "center",
        paddingHorizontal: dynamicStyles.paddingHorizontal,
    },
    back_header: {
        width: "100%",
        backgroundColor: "#fff",
        flexDirection: "row",
        paddingLeft: dynamicStyles.paddingHorizontal,
        paddingTop: s(6),
        paddingBottom: s(4),
        alignItems: "center",
    },
    leftArea: {
        position: "absolute",
        left: dynamicStyles.paddingHorizontal,
        top: s(6), // keep icon position consistent with header padding
    },
    centerArea: { justifyContent: "center", alignItems: "center" },
    logo: {
        marginBottom: s(8),
        alignItems: "center",
        flexDirection: "row",
        paddingRight: s(11),
    },
    logo_image_ctnr: { justifyContent: "center", alignItems: "center" },
    logo_image: { width: s(27), height: s(28) },
    logo_text: { paddingLeft: s(2), fontFamily: "Inter_600SemiBold" },
    right_icons: {
        flexDirection: "row",
        position: "absolute",
        right: dynamicStyles.paddingHorizontal,
        top: s(6),
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

    /* Collapsed search icon placeholder (when disabled) */
    left_placeholder: { width: dynamicStyles.iconSize + 6, height: dynamicStyles.iconSize + 6 },

    /* Full-takeover modal */
    modalContainer: { flex: 1, justifyContent: "flex-start" },
    canvasFill: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#F8FAFC",
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: dynamicStyles.paddingHorizontal, // horizontal padding
        paddingTop: s(8), // top padding on overlay
    },

    /* Top row with icon + input (keep icon aligned) */
    overlayBar: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: s(10),
        marginLeft: dynamicStyles.paddingHorizontal,
        marginRight: 10
    },
    overlayLeftIcon: {
        width: dynamicStyles.iconSize + 6,
        height: dynamicStyles.iconSize + 6,
        borderRadius: (dynamicStyles.iconSize + 6) / 2,
        alignItems: "center",
        justifyContent: "center",
    },

    /* Clean pill input */
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
    overlayInput: {
        flex: 1,
        fontSize: s(13),
        color: "#0f172a",
        fontFamily: "Poppins_500Medium",
    },
    clearBtn: { padding: s(6), marginLeft: s(4) },

    /* Results / suggestions */
    resultsWrap: {
        flex: 1,
        width: "100%",
    },
    listContent: {
        paddingTop: s(6), // top padding for list content
    },
    separatorFull: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: "rgba(15,23,42,0.08)",
    },

    sectionTitle: {
        paddingVertical: s(8),
        fontFamily: "Outfit_700Bold",
        color: "#0f172a",
        fontSize: s(14),
        paddingHorizontal: 16
    },

    /* Empty state */
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
    noResultsText: {
        color: "#64748B",
        fontSize: s(12.5),
        fontFamily: "Outfit_600SemiBold",
    },

    /* Profile card styles (full width w/ internal padding) */
    profileCard: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingVertical: s(12),
        paddingHorizontal: s(18), // internal padding
    },
    profileLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        minWidth: 0,
    },
    avatarRing: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "rgba(4,153,254,0.25)",
        backgroundColor: "#fff",
    },
    cardHandle: {
        fontFamily: "Outfit_700Bold",
        fontSize: s(13.5),
        color: "#0f172a",
    },
    cardHandleHighlight: { color: "#0499FE" },
    cardName: {
        marginTop: s(2),
        fontFamily: "Outfit_400Regular",
        fontSize: s(12.5),
        color: "#64748B",
    },
    cardNameHighlight: { color: "#0f172a", fontFamily: "Outfit_600SemiBold" },

    /* Header search icon */
    searchIconBtn: {
        width: dynamicStyles.iconSize + 6,
        height: dynamicStyles.iconSize + 6,
        borderRadius: (dynamicStyles.iconSize + 6) / 2,
        alignItems: "center",
        justifyContent: "center",
    },
});
