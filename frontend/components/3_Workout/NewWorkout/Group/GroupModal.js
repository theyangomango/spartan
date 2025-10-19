// components/Tracking/Group/GroupModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, FlatList } from "react-native";
import scaleSize from "../../../../helper/scaleSize";
import Icon from "react-native-vector-icons/Ionicons";
import ProfileCard from "../../../ProfileCard";
import RNBounceable from "@freakycoder/react-native-bounceable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import theme from "../../../../theme/mfpDark";
import useCommunityActivity from "../../../../hooks/useCommunityActivity";
import useLiveFollowing from "../../../../hooks/useLiveFollowing";

const scaledSize = (size) => scaleSize(size);

const GroupModal = ({ closeGroupModal, onInvite }) => {
    const followingUsers = Array.isArray(global?.userData?.following) ? global.userData.following : [];
    const [filteredUsers, setFilteredUsers] = useState(followingUsers);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const insets = useSafeAreaInsets();

    // --- Recency helper derived from FriendsActivitySheet ---
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

    // Load friends' recent activity and live status to enrich sorting
    const { items: friendActivityItems } = useCommunityActivity(global?.userData);
    const liveNow = useLiveFollowing(global?.userData); // [{uid, _ts, isLive:true}]

    const displayUsers = useMemo(() => {
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
            // Preserve timestamps so recency sorting stays aligned with activity feed data
            return {
                ...u,
                live: isLive,
                created: ts || undefined,
                startedAt: isLive ? ts : undefined,
                finishedAt: !isLive && ts ? ts : undefined,
            };
        });

        return groupable
            .slice()
            .sort((a, b) => {
                const tsDiff = (bestTimestamp(b) || 0) - (bestTimestamp(a) || 0);
                if (tsDiff !== 0) return tsDiff;
                return (a?.handle || "").localeCompare(b?.handle || "");
            });
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
                <Text style={styles.subtitleText}>
                    Friends get a notification. When they accept, they drop into this session so sets, timers, and cheers stay in sync.
                </Text>
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
            <FlatList
                data={displayUsers}
                keyExtractor={(item, idx) => item?.uid || `u-${idx}`}
                renderItem={({ item }) => (
                    <ProfileCard
                        user={item}
                        onSelect={toggleUser}
                        isSelected={selectedUsers.some((u) => u.uid === item.uid)}
                        baseBg={theme.bg}
                        selectedBg={theme.surface}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyStateWrap}>
                        <Text style={styles.emptyTitle}>No matches yet</Text>
                        <Text style={styles.emptySubtitle}>Search for friends you follow or explore who is live right now.</Text>
                    </View>
                }
                style={styles.list}
                contentContainerStyle={{ paddingBottom: scaleSize(Math.max(insets.bottom, scaledSize(24)) + scaledSize(96)) }}
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
        paddingTop: scaledSize(16),
        alignItems: "center",
        justifyContent: "center",
        marginBottom: scaledSize(14),
        gap: scaleSize(6),
    },
    modalText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(15),
        color: theme.textPrimary,
        includeFontPadding: false,
        letterSpacing: 0.4,
    },
    subtitleText: {
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        color: theme.textSecondary,
        textAlign: "center",
        includeFontPadding: false,
        lineHeight: scaleSize(16),
        paddingHorizontal: scaleSize(24),
    },

    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.fieldDeep,
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
        fontSize: scaleSize(13),
        color: theme.textPrimary,
        fontFamily: "Outfit_600SemiBold",
        includeFontPadding: false,
    },

    list: { flex: 1, width: "100%" },

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
    emptyStateWrap: {
        paddingVertical: scaleSize(60),
        paddingHorizontal: scaleSize(26),
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: {
        fontFamily: "Nunito_700Bold",
        fontSize: scaleSize(13),
        color: theme.textPrimary,
        includeFontPadding: false,
        marginBottom: scaleSize(6),
    },
    emptySubtitle: {
        fontFamily: "Nunito_500Medium",
        fontSize: scaleSize(11),
        color: theme.textSecondary,
        textAlign: "center",
        lineHeight: scaleSize(16),
    },
});
