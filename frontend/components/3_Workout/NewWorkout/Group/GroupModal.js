// components/Tracking/Group/GroupModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, SectionList, Pressable, Dimensions } from "react-native";
import scaleSize from "../../../../helper/scaleSize";
import Icon from "react-native-vector-icons/Ionicons";
import ProfileCard from "../../../ProfileCard";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import theme from "../../../../theme/mfpDark";
import useCommunityActivity from "../../../../hooks/useCommunityActivity";
import useLiveFollowing from "../../../../hooks/useLiveFollowing";

const { height: screenHeight } = Dimensions.get("window");
const scaledSize = (size) => scaleSize(size);

const GroupModal = ({ closeGroupModal, onInvite }) => {
    const followingUsers = Array.isArray(global?.userData?.following) ? global.userData.following : [];
    const [filteredUsers, setFilteredUsers] = useState(followingUsers);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const insets = useSafeAreaInsets();

    // --- Reference FriendsActivitySheet: time bucketing helpers ---
    const toMillis = (v) => {
        if (!v && v !== 0) return undefined;
        if (typeof v === "number") return v;
        if (v?.toMillis) return v.toMillis();
        const t = new Date(v).getTime();
        return Number.isFinite(t) ? t : undefined;
    };
    const bestTimestamp = (it) =>
        Math.max(
            toMillis(it?.created) ?? 0,
            toMillis(it?.startedAt) ?? 0,
            toMillis(it?.finishedAt) ?? 0
        );
    const startOfToday = (now = new Date()) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; };
    const startOfYesterday = (now = new Date()) => { const d = startOfToday(now); d.setDate(d.getDate() - 1); return d; };
    const startOfWeekSunday = (now = new Date()) => { const d = startOfToday(now); d.setDate(d.getDate() - d.getDay()); return d; };
    const startOfLastWeek = (now = new Date()) => { const d = startOfWeekSunday(now); d.setDate(d.getDate() - 7); return d; };
    const minusMonths = (now, months) => { const d = startOfToday(now); d.setMonth(d.getMonth() - months); return d; };
    const minusYears = (now, years) => { const d = startOfToday(now); d.setFullYear(d.getFullYear() - years); return d; };

    const groupByTime = (items, nowMs) => {
        const now = new Date(nowMs || Date.now());
        const T0 = startOfToday(now).getTime();
        const Y0 = startOfYesterday(now).getTime();
        const W0 = startOfWeekSunday(now).getTime();
        const LW0 = startOfLastWeek(now).getTime();
        const M1 = minusMonths(now, 1).getTime();
        const M3 = minusMonths(now, 3).getTime();
        const Y1 = minusYears(now, 1).getTime();

        const live = [];
        const rest = [];
        for (const it of items) (it?.live ? live : rest).push(it);

        const buckets = {
            Today: [],
            Yesterday: [],
            "This Week": [],
            "Last Week": [],
            "Last Month": [],
            "Last Three Months": [],
            "Last Year": [],
            Older: [],
        };

        for (const it of rest) {
            const ts = bestTimestamp(it);
            if (!ts) { buckets["Older"].push(it); continue; }
            if (ts >= T0) buckets["Today"].push(it);
            else if (ts >= Y0) buckets["Yesterday"].push(it);
            else if (ts >= W0) buckets["This Week"].push(it);
            else if (ts >= LW0) buckets["Last Week"].push(it);
            else if (ts >= M1) buckets["Last Month"].push(it);
            else if (ts >= M3) buckets["Last Three Months"].push(it);
            else if (ts >= Y1) buckets["Last Year"].push(it);
            else buckets["Older"].push(it);
        }

        const ordered = [];
        if (live.length) ordered.push({ title: "Live Now", data: live });
        const order = ["Today", "Yesterday", "This Week", "Last Week", "Last Month", "Last Three Months", "Last Year", "Older"];
        for (const key of order) {
            const data = buckets[key];
            if (data.length) ordered.push({ title: key, data });
        }
        return ordered;
    };

    useEffect(() => {
        const key = JSON.stringify((Array.isArray(followingUsers) ? followingUsers : []).map((u) => u?.uid || u));
        if (!searchQuery) {
            setFilteredUsers(followingUsers);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredUsers(
                (Array.isArray(followingUsers) ? followingUsers : []).filter((user) =>
                    (user?.handle || "").toLowerCase().includes(q) ||
                    (user?.name || "").toLowerCase().includes(q)
                )
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, JSON.stringify((Array.isArray(followingUsers) ? followingUsers : []).map((u) => u?.uid || u))]);

    // Load friends' recent activity and live status for time grouping
    const { items: friendActivityItems } = useCommunityActivity(global?.userData);
    const liveNow = useLiveFollowing(global?.userData); // [{uid, _ts, isLive:true}]

    const sections = useMemo(() => {
        // Build a lookup of latest timestamp and live flag per uid
        const tsByUid = new Map();
        const liveSet = new Set();
        try {
            (Array.isArray(friendActivityItems) ? friendActivityItems : []).forEach((it) => {
                const uid = String(it?.uid || "");
                if (!uid) return;
                const ts = bestTimestamp(it) || 0;
                const prev = tsByUid.get(uid) || 0;
                if (ts > prev) tsByUid.set(uid, ts);
                if (it?.live) liveSet.add(uid);
            });
        } catch {}
        try {
            (Array.isArray(liveNow) ? liveNow : []).forEach((it) => {
                const uid = String(it?.uid || "");
                if (!uid) return;
                const ts = Number(it?._ts || Date.now());
                const prev = tsByUid.get(uid) || 0;
                if (ts > prev) tsByUid.set(uid, ts);
                liveSet.add(uid);
            });
        } catch {}

        const groupable = (Array.isArray(filteredUsers) ? filteredUsers : []).map((u) => {
            const uid = String(u?.uid || "");
            const ts = tsByUid.get(uid) || 0;
            const isLive = liveSet.has(uid);
            // Create an item compatible with groupByTime’s bestTimestamp
            return {
                ...u,
                live: isLive,
                created: ts || undefined,
                startedAt: isLive ? ts : undefined,
                finishedAt: !isLive && ts ? ts : undefined,
            };
        });

        // Sort within buckets by recency similar to FriendsActivitySheet
        const now = Date.now();
        const orderedSections = groupByTime(groupable, now);
        // Within each section, sort descending by timestamp
        orderedSections.forEach((s) => s.data.sort((a, b) => (bestTimestamp(b) || 0) - (bestTimestamp(a) || 0)));
        return orderedSections;
    }, [filteredUsers, friendActivityItems, liveNow]);

    const toggleUser = (user) => {
        setSelectedUsers((prev) =>
            prev.some((u) => u.uid === user.uid)
                ? prev.filter((u) => u.uid !== user.uid)
                : [...prev, user]
        );
    };

    const clearSearch = () => setSearchQuery("");

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.header}>
                <Text style={styles.modalText}>Invite to Workout</Text>
            </View>
            {/* Sleek search */}
            <View style={styles.searchContainer}>
                <Icon name="search" size={scaledSize(16)} color={theme.primary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search by handle or name"
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={clearSearch} hitSlop={8}>
                        <Icon name="close-circle" size={scaledSize(16)} color={theme.muted} />
                    </Pressable>
                )}
            </View>
            <SectionList
                sections={sections}
                keyExtractor={(item, idx) => item?.uid || `u-${idx}`}
                renderItem={({ item }) => (
                    <ProfileCard
                        user={item}
                        onSelect={toggleUser}
                        isSelected={selectedUsers.some((u) => u.uid === item.uid)}
                    />
                )}
                renderSectionHeader={({ section }) => (
                    <View style={styles.sectionHeaderWrap}>
                        <Text style={styles.sectionHeaderText}>{section.title}</Text>
                    </View>
                )}
                style={styles.list}
                contentContainerStyle={{ paddingBottom: scaleSize(Math.max(insets.bottom, scaledSize(24)) + scaledSize(96)) }}
                stickySectionHeadersEnabled={false}
                initialNumToRender={15}
                windowSize={15}
                showsVerticalScrollIndicator={false}
            />
            <RNBounceable
                style={[
                    styles.sendButtonWrap,
                    { bottom: scaleSize(insets.bottom + scaledSize(24)), opacity: selectedUsers.length < 1 ? 0.5 : 1 },
                ]}
                disabled={selectedUsers.length === 0}
                onPress={() => onInvite?.(selectedUsers)}
            >
                <LinearGradient
                    colors={["#2A65D9", "#59AAEE"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendButton}
                >
                    <Icon name="person-add-outline" size={scaledSize(16)} color="#fff" style={{ marginRight: scaledSize(8) }} />
                    <Text style={styles.sendButtonText}>
                        {`Invite${selectedUsers.length > 0 ? ` (${selectedUsers.length})` : ""}`}
                    </Text>
                </LinearGradient>
            </RNBounceable>
        </View>
    );
};

export default GroupModal;

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, alignItems: "center" },

    header: {
        height: scaledSize(48),
        paddingTop: scaledSize(16),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaledSize(10),
    },
    modalText: {
        fontFamily: "Nunito_800ExtraBold",
        fontSize: scaleSize(13),
        color: theme.textPrimary,
        includeFontPadding: false,
        letterSpacing: 0.2,
    },

    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.field,
        borderRadius: scaledSize(12),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        width: "90%",
        paddingHorizontal: scaledSize(10),
        paddingVertical: scaledSize(6),
        marginBottom: scaledSize(10),
    },
    searchIcon: { marginRight: scaledSize(8) },
    searchBar: {
        flex: 1,
        paddingHorizontal: scaledSize(8),
        paddingVertical: scaledSize(6),
        fontSize: scaleSize(12),
        color: theme.textPrimary,
        fontFamily: "Nunito_600SemiBold",
        includeFontPadding: false,
    },

    list: { flex: 1, width: "100%" },
    sectionHeaderWrap: { width: "100%", paddingHorizontal: scaledSize(22), paddingTop: scaledSize(10), paddingBottom: scaledSize(6) },
    sectionHeaderText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(10.5),
        color: theme.textSecondary,
        letterSpacing: 0.3,
    },

    sendButtonWrap: {
        position: "absolute",
        left: scaledSize(22),
        right: scaledSize(22),
        borderRadius: scaledSize(18),
        // Give the shadow a base color for iOS' shadow renderer
        backgroundColor: theme.bg,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: scaleSize(12),
        shadowOffset: { width: 0, height: scaleSize(6) },
        elevation: 4,
    },
    sendButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: scaledSize(18),
        paddingVertical: scaledSize(14),
        paddingHorizontal: scaledSize(30),
    },
    sendButtonText: {
        color: "#fff",
        fontSize: scaleSize(12.5),
        fontFamily: "Nunito_800ExtraBold",
        includeFontPadding: false,
        letterSpacing: 0.25,
    },
});
