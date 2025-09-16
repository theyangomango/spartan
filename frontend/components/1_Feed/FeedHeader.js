// components/1_Feed/FeedHeader.jsx
import React, { memo, useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    StyleSheet,
    View,
    Text,
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
import FastImage from "react-native-fast-image";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import millisToHoursMinutesSeconds from "../../helper/millisToHoursMinutesSeconds";
import { usePfp } from "../../helper/usePFPs";
import RNBounceable from "@freakycoder/react-native-bounceable";
import Svg, { Path } from "react-native-svg";
import { Weight } from "iconsax-react-native";
import { getFeedHeaderStyles } from "../../helper/getFeedHeaderStyles";
import { db } from "../../../firebase.config";
import { collection, query, where, onSnapshot, getDocs, orderBy, limit, doc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
// Single root navigator; no need for StackActions/nested refs here

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const dynamicStyles = getFeedHeaderStyles(SCREEN_WIDTH, SCREEN_HEIGHT);
const scale = SCREEN_WIDTH / 375;
const s = (n) => Math.round(n * scale);

// Unified sizing metrics (reduces magic numbers)
const METRICS = (() => {
    const paddingH = dynamicStyles.paddingHorizontal;
    const paddingTop = s(2);
    const paddingBottom = s(10);
    const centerH = s(34);
    const marginTop = s(5);
    const icon = dynamicStyles.iconSize;
    const iconTop = Math.round((centerH - icon) / 2);
    const iconBox = icon + 6; // header/overlay icon wrapper size
    const logoPadTop = Math.max(0, s(0.5)); // visual alignment
    return { paddingH, paddingTop, paddingBottom, centerH, marginTop, iconTop, logoPadTop, iconBox };
})();

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
    const pfpUri = usePfp(String(user?.uid || ""), user?.pfpVersion || 0) || user?.pfp || "";
    const hasPfp = !!pfpUri;

    return (
        <RNBounceable onPress={onPress} style={styles.profileCard} bounceEffectIn={0.96}>
            <View style={styles.profileLeft}>
                <View
                    style={[styles.avatarRing, { width: avatarSize, height: avatarSize, borderRadius: scaleSize(avatarSize / 2) }]}
                >
                    {hasPfp ? (
                        <FastImage
                            source={{ uri: pfpUri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                            style={{
                                width: scaleSize(avatarSize - 4),
                                height: scaleSize(avatarSize - 4),
                                borderRadius: scaleSize((avatarSize - 4) / 2),
                                backgroundColor: "#f3f4f6",
                            }}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    ) : (
                        <Ionicons name="person-circle" size={avatarSize} color="#C7C7CC" />
                    )}
                </View>

                <View style={{ marginLeft: scaleSize(s(12)), flex: 1, minWidth: 0 }}>
                    <Highlighted
                        text={`${user.handle || "user"}`}
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
    const insets = useSafeAreaInsets();
    const [visible, setVisible] = useState(false);
    const [modalKey, setModalKey] = useState(0);
    const [qStr, setQStr] = useState("");
    const [results, setResults] = useState([]);
    const [navigating, setNavigating] = useState(false);
    const [usersCacheTick, setUsersCacheTick] = useState(0);

    const suggestions = useMemo(() => {
        const arr = (allUsersRef?.current || [])
            .filter((u) => u?.uid && u.uid !== global?.userData?.uid)
            .slice(0, 10);
        return arr;
    }, [allUsersRef?.current, usersCacheTick]);

    // Navigate while keeping the overlay visible during the native-stack slide
    const navigateToUser = useCallback((item) => {
        if (!item) return;
        navigation?.navigate('ViewProfile', {
            user: { uid: item.uid, handle: item.handle, name: item.name, pfp: item.pfp },
            transition: 'slide-from-right',
        });
    }, [navigation]);

    const iconRef = useRef(null);
    const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 0, h: 0 });
    const measureAnchor = useCallback(() => {
        if (iconRef.current?.measureInWindow) {
            iconRef.current.measureInWindow((x, y, width, height) => {
                if (Number.isFinite(x) && Number.isFinite(y)) setAnchor({ x, y, w: width, h: height });
            });
        }
    }, []);

    const open = useCallback(() => {
        if (disabled) return;
        try { navigation?.navigate?.('SearchUsers', { transition: 'fade' }); } catch { }
    }, [navigation]);

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
        return out;
    };

    const remotePrefixQuery = async (text) => {
        const needle = (text || "").toLowerCase();
        if (!needle) return [];

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
                pfp: data?.pfp || data?.photoURL || data?.image || "",
            }))
            .filter((u) => u.uid !== me);

        return merged;
    };

    const doSearch = useDebounce(async (text) => {
        const q = (text || "").trim();
        if (!q) { setResults([]); return; }

        // Instant local results for responsiveness
        const local = localFilter(q);
        if (local && local.length) setResults(local);
        else setResults([]);

        // Remote query across all users (handle + name prefix)
        try {
            const remote = await remotePrefixQuery(q);
            const map = new Map((remote || []).map((u) => [u.uid, u]));
            (local || []).forEach((u) => { if (!map.has(u.uid)) map.set(u.uid, u); });
            setResults(Array.from(map.values()).slice(0, 50));
        } catch {
            // keep local
        }
    }, 220);

    // Ensure "Suggested" always has real data: on open, if cache is tiny, fetch a larger page
    useEffect(() => {
        if (!visible) return;
        const prime = async () => {
            try {
                const existing = (allUsersRef?.current || []).length;
                if (existing >= 10) return; // already enough
                const usersCol = collection(db, "users");
                const q = query(usersCol, orderBy("handle_lower"), limit(200));
                const snap = await getDocs(q);
                const add = [];
                snap.forEach((d) => {
                    const data = d.data() || {};
                    add.push({ uid: d.id, handle: data?.handle || "", name: data?.name || "", pfp: data?.pfp || data?.photoURL || data?.image || "" });
                });
                // Merge/dedupe into the shared ref so both Feed and Workout benefit
                const map = new Map((allUsersRef?.current || []).map((u) => [u.uid, u]));
                add.forEach((u) => { if (u?.uid && !map.has(u.uid)) map.set(u.uid, u); });
                allUsersRef.current = Array.from(map.values());
                setUsersCacheTick((t) => t + 1);
            } catch { }
        };
        prime();
    }, [visible, allUsersRef]);

    if (disabled) return <View style={styles.left_placeholder} />;

    return (
        <>
            <RNBounceable onPress={open} bounceEffectIn={0.5} style={[styles.searchIconBtn, visible && { opacity: 0 }]} accessibilityLabel="Search users" ref={iconRef} onLayout={measureAnchor} pointerEvents={visible ? 'none' : 'auto'}>
                        <Ionicons name="search" size={dynamicStyles.iconSize} color="#CBD5E1" />
            </RNBounceable>

            <Modal
                key={modalKey}
                visible={visible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={close}
            >
                <View style={styles.modalContainer} pointerEvents={navigating ? 'none' : 'auto'}>
                    <TouchableWithoutFeedback onPress={close}>
                        <View style={[styles.canvasFill, navigating && { opacity: 0 }]} />
                    </TouchableWithoutFeedback>

                    <KeyboardAvoidingView
                        style={StyleSheet.absoluteFill}
                        behavior={Platform.OS === "ios" ? "padding" : undefined}
                    >
                        <SafeAreaView style={[styles.modalContent, navigating && { opacity: 0 }]} pointerEvents="box-none">
                            <View
                                style={[
                                    styles.overlayBar,
                                    {
                                        // Align left edge of input to the right edge of the header icon.
                                        // anchor.x is absolute screen X; SafeAreaView has horizontal padding = METRICS.paddingH.
                                        // So subtract paddingH to convert to container-relative, then add icon width (anchor.w).
                                        marginLeft:
                                            (anchor.x && anchor.w)
                                                ? (anchor.x - METRICS.paddingH + anchor.w)
                                                : (METRICS.paddingH + METRICS.iconBox),
                                    },
                                ]}
                            >

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
                                        <Ionicons name="close" size={s(18)} color="#9AA4B2" />
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
                                                <ProfileCard user={item} query={qStr} onPress={() => navigateToUser(item)} />
                                            )}
                                            ItemSeparatorComponent={() => <View style={styles.separatorFull} />}
                                            contentContainerStyle={styles.listContent}
                                            showsVerticalScrollIndicator={false}
                                        />
                                    </View>
                                ) : (
                                    <View style={styles.noResultsWrap}>
                                        <Ionicons name="search-outline" size={s(18)} color="#AAB4C2" />
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
                                            <ProfileCard user={item} query={""} onPress={() => navigateToUser(item)} />
                                        )}
                                        ItemSeparatorComponent={() => <View style={styles.separatorFull} />}
                                        contentContainerStyle={styles.listContent}
                                        showsVerticalScrollIndicator={false}
                                    />
                                </View>
                            )}
                        </SafeAreaView>
                    </KeyboardAvoidingView>

                    {/* Fixed icon rendered last to guarantee it is on top */}
                    <View style={[styles.fixedSearchIcon, { left: anchor.x || METRICS.paddingH, top: (anchor.y || (insets.top + METRICS.marginTop + METRICS.paddingTop + METRICS.iconTop)) }]} pointerEvents="none">
                        <RNBounceable bounceEffectIn={0.5} style={styles.searchIconBtn}>
                            <Ionicons name="search" size={dynamicStyles.iconSize} color="#CBD5E1" />
                        </RNBounceable>
                    </View>
                </View>
            </Modal>
        </>
    );
};

/* ----------------------------- FeedHeader ----------------------------- */

// Small helper matching Feed screen logic
const toMillis = (v) => {
    if (typeof v === "number") return v;
    if (v?.toMillis) return v.toMillis();
    if (typeof v?.seconds === "number") return v.seconds * 1000;
    const n = new Date(v).getTime();
    return Number.isFinite(n) ? n : 0;
};

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
    heightAdjust = 0, // optional fine-tune for overall header height (affects padding only)
}) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);

    // Mirror timerRef, with a fallback to compute from workout timestamps if ref is empty.
    const [elapsed, setElapsed] = useState(""); // never default to "00:00"
    useEffect(() => {
        const id = setInterval(() => {
            let v = (timerRef?.current || "").trim();
            if (!v && workout?.wid) {
                const createdMs = toMillis(workout?.created ?? workout?.createdAt);
                if (createdMs) v = millisToHoursMinutesSeconds(Math.max(1000, Date.now() - createdMs));
            }
            setElapsed((prev) => (prev !== v ? v : prev));
        }, 500);
        return () => clearInterval(id);
    }, [timerRef, workout?.wid, workout?.created, workout?.createdAt]);

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

    // Messages badge: listen to aggregate count on user doc
    useEffect(() => {
        const uid = global?.userData?.uid;
        if (!uid) return;
        const userRef = doc(db, 'users', uid);
        const unsub = onSnapshot(userRef, (snap) => {
            try {
                const v = Number(snap.data()?.unreadMessagesCount || 0);
                setUnreadMessages(Number.isFinite(v) ? v : 0);
            } catch { setUnreadMessages(0); }
        });
        return () => { try { unsub(); } catch {} };
    }, []);

    if (backButton) {
        return (
            <View style={[styles.back_header]}>
                <TouchableOpacity onPress={onBackPress}>
                    <Ionicons name="chevron-back" size={dynamicStyles.iconSize} color="#E5E7EB" />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[
            styles.main_ctnr,
            heightAdjust ? { paddingBottom: scaleSize(METRICS.paddingBottom + heightAdjust) } : null,
        ]}>
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
                            <Weight size={s(18)} color="#FFFFFF" variant="Bold" />
                            <View style={styles.dotBlue} />
                            <Text style={styles.resumeTimeBlue}>{elapsed}</Text>
                        </RNBounceable>
                    ) : (
                        <RNBounceable onPress={scrollToTop} style={styles.logoWrap}>
                            <View style={styles.logo_image_ctnr}>
                                <FastImage
                                    source={require("../../../frontend/assets/logo_feed_black.png")}
                                    style={styles.logo_image}
                                    resizeMode={FastImage.resizeMode.contain}
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

                <RNBounceable
                    onPress={() => {
                        try {
                            if (typeof toMessagesScreen === 'function') return toMessagesScreen();
                        } catch { }
                        try { navigation?.navigate?.('Messages'); } catch { }
                    }}
                    style={styles.message_button}
                >
                    <MaterialIcons name="alternate-email" size={dynamicStyles.iconSize + 1.5} color={"#cbd5e1"} />
                    {unreadMessages > 0 && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationText}>{unreadMessages}</Text>
                        </View>
                    )}
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
        backgroundColor: theme.bg,
        flexDirection: "row",
        justifyContent: "center",
        paddingTop: METRICS.paddingTop,
        paddingBottom: METRICS.paddingBottom,
        alignItems: "center",
        paddingHorizontal: METRICS.paddingH,
        marginTop: METRICS.marginTop,
    },

    back_header: {
        width: "100%",
        backgroundColor: theme.bg,
        flexDirection: "row",
        paddingLeft: METRICS.paddingH,
        height: scaleSize(METRICS.centerH + METRICS.paddingTop + METRICS.paddingBottom),
        alignItems: "center",
        marginTop: METRICS.marginTop,
    },

    leftArea: { position: "absolute", left: METRICS.paddingH, top: METRICS.iconTop },

    centerArea: { justifyContent: "center", alignItems: "center" },

    centerSlot: { paddingHorizontal: scaleSize(s(14)), height: METRICS.centerH, minWidth: scaleSize(s(156)), alignItems: "center", justifyContent: "center" },

    // Nudge the logo down slightly to align with side icons
    logoWrap: { height: "100%", flexDirection: "row", alignItems: "center", paddingTop: METRICS.logoPadTop },
    logo_image_ctnr: { justifyContent: "center", alignItems: "center" },
    logo_image: { width: scaleSize(s(26.5)), height: scaleSize(s(26.5)) },
    logo_text: {
        paddingLeft: scaleSize(s(4)),
        fontFamily: "Inter_600SemiBold",
        fontSize: scaleSize(s(16)),
        color: theme.textPrimary,
        includeFontPadding: false,
        ...Platform.select({ android: { lineHeight: scaleSize(s(19)) } }),
    },

    resumeBtnBlue: {
        height: "100%",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(s(14)),
        borderRadius: scaleSize(METRICS.centerH / 2),
        backgroundColor: theme.primary,
        borderWidth: scaleSize(1),
        borderColor: "transparent",
        ...Platform.select({
            ios: { shadowColor: theme.primary, shadowOpacity: 0.18, shadowRadius: scaleSize(4), shadowOffset: { width: 0, height: scaleSize(3) } },
            android: { elevation: 3 },
        }),
    },
    dotBlue: { width: scaleSize(s(5)), height: scaleSize(s(5)), borderRadius: scaleSize(s(2.5)), backgroundColor: theme.textPrimary, marginHorizontal: scaleSize(s(7)), opacity: 0.9 },
    resumeTimeBlue: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(s(13)),
        color: theme.textPrimary,
        letterSpacing: 0.2,
        includeFontPadding: false,
        ...Platform.select({ android: { lineHeight: scaleSize(s(15)) } }),
    },

    right_icons: { flexDirection: "row", position: "absolute", right: METRICS.paddingH, top: METRICS.iconTop, alignItems: "center" },

    notificationBadge: { position: "absolute", right: scaleSize(-7.5), top: scaleSize(-5), backgroundColor: "#ef4444", borderRadius: scaleSize(8), width: scaleSize(16), height: scaleSize(16), justifyContent: "center", alignItems: "center" },
    notificationText: { color: "#fff", fontSize: scaleSize(8), fontFamily: "Outfit_600SemiBold" },
    message_button: { padding: scaleSize(1) },
    heart_button: { marginRight: scaleSize(19), padding: scaleSize(1), position: "relative" },

    left_placeholder: { width: scaleSize(dynamicStyles.iconSize + 6), height: scaleSize(dynamicStyles.iconSize + 6) },

    modalContainer: { flex: 1 },
    canvasFill: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.bg },
    // Align overlay search icon wrapper top exactly with header's wrapper top
    // Header wrapper Y = marginTop + paddingTop + iconTop
    modalContent: { flex: 1, paddingHorizontal: METRICS.paddingH, paddingTop: scaleSize(METRICS.marginTop + METRICS.paddingTop), marginTop: 0 },

    // Mirror header container: fixed height + relative for absolute left icon
    // Taller, modern pill input row
    overlayBar: { position: 'relative', height: scaleSize(METRICS.centerH + s(19)), flexDirection: "row", alignItems: "center", marginBottom: scaleSize(s(10)), marginLeft: scaleSize(METRICS.paddingH + METRICS.iconBox), marginRight: scaleSize(10) },
    // Parent for overlay icon matches header's leftArea semantics (absolute within bar)
    // Add a 1px nudge for visual parity across devices
    // overlayLeftArea removed: single icon approach


    overlayInputWrap: {
        flex: 1,
        marginLeft: scaleSize(s(12)),
        height: scaleSize(METRICS.centerH + s(6)),
        borderRadius: scaleSize(s(26)),
        backgroundColor: theme.field,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(s(16)),
        borderWidth: scaleSize(1),
        borderColor: theme.hairline,
        ...Platform.select({
            ios: { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: scaleSize(6), shadowOffset: { width: 0, height: scaleSize(3) } },
            android: { elevation: 1 },
        }),
    },
    overlayInput: { flex: 1, fontSize: scaleSize(s(15)), color: theme.textPrimary, fontFamily: "Outfit_600SemiBold", textAlignVertical: 'center', includeFontPadding: false },
    clearBtn: { padding: scaleSize(s(6)), marginLeft: scaleSize(s(4)) },

    resultsWrap: { flex: 1, width: "100%" },
    listContent: { paddingTop: scaleSize(s(18)) },
    separatorFull: { height: StyleSheet.hairlineWidth, backgroundColor: theme.hairline },

    sectionTitle: { marginTop: scaleSize(s(6)), paddingVertical: scaleSize(s(8)), fontFamily: "Outfit_700Bold", color: theme.textPrimary, fontSize: scaleSize(s(14)), paddingHorizontal: scaleSize(16) },

    noResultsWrap: {
        marginTop: scaleSize(s(16)),
        alignSelf: "center",
        paddingHorizontal: scaleSize(s(14)),
        paddingVertical: scaleSize(s(10)),
        borderRadius: scaleSize(s(12)),
        backgroundColor: theme.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: scaleSize(s(8)),
    },
    noResultsText: { color: theme.textSecondary, fontSize: scaleSize(s(12.5)), fontFamily: "Outfit_600SemiBold" },

    profileCard: { width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: theme.bg, paddingVertical: scaleSize(s(12)), paddingHorizontal: scaleSize(s(18)) },
    profileLeft: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
    // Remove blue ring around avatars in profile cards
    avatarRing: { alignItems: "center", justifyContent: "center", borderWidth: 0, borderColor: 'transparent', backgroundColor: 'transparent' },

    cardHandle: { fontFamily: "Nunito_800ExtraBold", fontSize: scaleSize(s(13.5)), color: theme.textPrimary },
    cardHandleHighlight: { color: theme.textPrimary },
    cardName: { marginTop: scaleSize(s(2)), fontFamily: "Nunito_600SemiBold", fontSize: scaleSize(s(12.5)), color: theme.textSecondary },
    cardNameHighlight: { color: theme.textPrimary, fontFamily: "Nunito_700Bold" },

    searchIconBtn: {
        width: scaleSize(dynamicStyles.iconSize + 6),
        height: scaleSize(dynamicStyles.iconSize + 6),
        borderRadius: scaleSize((dynamicStyles.iconSize + 6) / 2),
        alignItems: "center",
        justifyContent: "center",
    },
});
