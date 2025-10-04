import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, SectionList, Text, ActivityIndicator } from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../../../firebase.config";
import NotificationCard from "./NotificationCard";
import scaleSize, { ts } from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";
import acceptWorkoutInvite from "../../../helper/workoutInvites";
import acceptFollowRequest from "../../../../backend/user/acceptFollowRequest";
import declineFollowRequest from "../../../../backend/user/declineFollowRequest";
import {
    useNotificationsStore,
    ensureNotificationsListener,
    loadMoreNotifications,
    updateNotificationEvent,
} from "../../../state/notificationsStore";
import { shallow } from "zustand/shallow";

export const NOTIFICATION_FILTERS = ["All", "Likes", "Comments", "Mentions"];

export default function NotificationsModal({ uid, navigation, filter = NOTIFICATION_FILTERS[0] }) {
    const listRef = useRef(null);
    const firstIdRef = useRef(null);

    const { events, hasMore, loadingMore, ready } = useNotificationsStore(
        useCallback((state) => ({
            events: state.events,
            hasMore: state.hasMore,
            loadingMore: state.loadingMore,
            ready: state.ready,
        }), []),
        shallow
    );

    useEffect(() => {
        const effUid = uid || global?.userData?.uid;
        ensureNotificationsListener(effUid);
    }, [uid]);

    useEffect(() => {
        const firstId = events?.[0]?.id || null;
        if (firstId && firstIdRef.current && firstIdRef.current !== firstId) {
            try { listRef.current?.scrollToOffset?.({ offset: 0, animated: false }); } catch {}
        }
        if (firstId) firstIdRef.current = firstId;
    }, [events]);

    const handleAcceptInvite = useCallback(async (item) => {
        const effUid = uid || global?.userData?.uid;
        const inviteId = String(item?.inviteId || "");
        const wid = String(item?.wid || "");
        if (!effUid || !inviteId || !wid) return false;

        try {
            const { seedWorkout } = await acceptWorkoutInvite({ inviteId, wid, toUid: effUid });

            try {
                await setDoc(
                    doc(db, "users", effUid, "notifications", String(item.id)),
                    { inviteStatus: "accepted", read: true },
                    { merge: true }
                );
            } catch {}

            updateNotificationEvent(item?.id, (evt) => ({
                ...(evt || {}),
                inviteStatus: "accepted",
                read: true,
            }));

            try {
                global.__pendingWorkoutJoin = {
                    wid,
                    seedWorkout: seedWorkout || null,
                    inviterUid: String(item?.uid || ""),
                    ts: Date.now(),
                };
            } catch {}

            try { navigation?.goBack?.(); } catch {}

            try {
                const { jumpToTab } = require('../../../../navigationRef');
                jumpToTab('Workout', { _joinTs: Date.now() });
            } catch {}

            return true;
        } catch (err) {
            console.log('handleAcceptInvite error', err);
            return false;
        }
    }, [uid, navigation]);

    const handleAcceptFollowRequest = useCallback(async (item) => {
        const effUid = uid || global?.userData?.uid;
        const requesterUid = String(item?.uid || "");
        if (!effUid || !requesterUid) return false;

        const currentUser = (() => { try { return global?.userData || {}; } catch { return {}; } })();
        const requester = {
            uid: requesterUid,
            handle: item?.handle || '',
            name: item?.name || '',
            pfp: item?.pfp || '',
        };

        try {
            await acceptFollowRequest(currentUser, requester);
            try {
                await setDoc(
                    doc(db, "users", effUid, "notifications", String(item.id)),
                    { requestStatus: 'accepted', read: true },
                    { merge: true }
                );
            } catch {}

            updateNotificationEvent(item?.id, (evt) => ({
                ...(evt || {}),
                requestStatus: 'accepted',
                read: true,
            }));

            try {
                if (!global.userData || typeof global.userData !== 'object') global.userData = {};
                const removeByUid = (list = []) => list.filter((entry) => String(entry?.uid || entry?.id || entry) !== requesterUid);
                const pending = Array.isArray(global.userData.followRequestsIn) ? removeByUid(global.userData.followRequestsIn) : [];
                global.userData.followRequestsIn = pending;

                const followers = Array.isArray(global.userData.followers) ? [...global.userData.followers] : [];
                if (!followers.some((entry) => String(entry?.uid || entry?.id || entry) === requesterUid)) followers.push(requester);
                global.userData.followers = followers;

                const followerCount = Number.isFinite(Number(global.userData.followerCount))
                    ? Math.max(Number(global.userData.followerCount), followers.length)
                    : followers.length;
                global.userData.followerCount = followerCount;
            } catch {}

            return true;
        } catch (err) {
            console.log('handleAcceptFollowRequest error', err);
            return false;
        }
    }, [uid]);

    const handleDeclineFollowRequest = useCallback(async (item) => {
        const effUid = uid || global?.userData?.uid;
        const requesterUid = String(item?.uid || "");
        if (!effUid || !requesterUid) return false;

        const currentUser = (() => { try { return global?.userData || {}; } catch { return {}; } })();
        const requester = {
            uid: requesterUid,
            handle: item?.handle || '',
            name: item?.name || '',
            pfp: item?.pfp || '',
        };

        try {
            await declineFollowRequest(currentUser, requester);
            try {
                await setDoc(
                    doc(db, "users", effUid, "notifications", String(item.id)),
                    { requestStatus: 'declined', read: true },
                    { merge: true }
                );
            } catch {}

            updateNotificationEvent(item?.id, (evt) => ({
                ...(evt || {}),
                requestStatus: 'declined',
                read: true,
            }));

            try {
                if (!global.userData || typeof global.userData !== 'object') global.userData = {};
                const removeByUid = (list = []) => list.filter((entry) => String(entry?.uid || entry?.id || entry) !== requesterUid);
                const pending = Array.isArray(global.userData.followRequestsIn) ? removeByUid(global.userData.followRequestsIn) : [];
                global.userData.followRequestsIn = pending;
            } catch {}

            return true;
        } catch (err) {
            console.log('handleDeclineFollowRequest error', err);
            return false;
        }
    }, [uid]);

    const handlePressNotification = useCallback((item) => {
        try { navigation?.goBack?.(); } catch {}

        if (["follow", "follow-request", "follow-accepted"].includes(item?.type)) {
            const payload = {
                user: {
                    uid: String(item?.uid || ''),
                    handle: item?.handle || '',
                    name: item?.name || '',
                    pfp: item?.pfp || '',
                },
                transition: 'slide-from-right',
            };

            try {
                const { navigateRoot } = require('../../../../navigationRef');
                if (navigateRoot('ViewProfile', payload)) return;
            } catch {}

            try {
                const { navigationRef } = require('../../../../navigationRef');
                navigationRef?.navigate?.('ViewProfile', payload);
            } catch {}

            return;
        }

        try {
            const { jumpToTab } = require('../../../../navigationRef');
            if (item?.pid) jumpToTab('Feed', { scrollPid: String(item.pid), _t: Date.now() });
            else jumpToTab('Feed');
        } catch {}
    }, [navigation]);

    // Load older pages when the user scrolls near the bottom
    const loadMore = useCallback(() => {
        loadMoreNotifications();
    }, []);

    // --- time grouping helpers (reference FriendsActivitySheet) ---
    const toMillis = (ts) => {
        if (typeof ts === "number") return ts;
        if (ts?.toMillis) return ts.toMillis();
        if (typeof ts?.seconds === "number") return ts.seconds * 1000;
        const n = Date.parse(ts);
        return Number.isFinite(n) ? n : 0;
    };
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

        for (const it of items) {
            const ts = toMillis(it?.timestamp);
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

        const order = ["Today", "Yesterday", "This Week", "Last Week", "Last Month", "Last Three Months", "Last Year", "Older"];
        const sections = [];
        for (const key of order) {
            const data = buckets[key];
            if (data.length) sections.push({ title: key, data: data.sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp)) });
        }
        return sections;
    };

    // Precompute sections for all filters when events change; switch is then instant
    const groupedByFilter = useMemo(() => {
        const filters = {
            "All": (e) => true,
            Likes: (e) => ["liked-post", "liked-story", "liked-comment"].includes(e.type),
            Comments: (e) => ["comment", "replied-comment"].includes(e.type),
            Mentions: (e) => e.type === "mention",
        };
        const res = {};
        for (const key of Object.keys(filters)) {
            const filtered = events.filter(filters[key]);
            res[key] = groupByTime(filtered, Date.now());
        }
        return res;
    }, [events]);

    const sections = groupedByFilter[filter] || [];

    return (
        <View style={styles.container}>
            <SectionList
                ref={listRef}
                sections={sections}
                renderItem={({ item, index, section }) => (
                    <MemoNotificationCard
                        item={item}
                        onPressCard={() => handlePressNotification(item)}
                        onAcceptWorkoutInvite={item?.type === 'workout-invite' ? (() => handleAcceptInvite(item)) : undefined}
                        onAcceptFollowRequest={item?.type === 'follow-request' ? (() => handleAcceptFollowRequest(item)) : undefined}
                        onDeclineFollowRequest={item?.type === 'follow-request' ? (() => handleDeclineFollowRequest(item)) : undefined}
                        isFirst={index === 0}
                        isLast={index === (section?.data?.length ?? 0) - 1}
                    />
                )}
                renderSectionHeader={({ section }) => (
                    <View style={styles.sectionHeaderWrap}>
                        <Text style={styles.sectionHeaderText}>{section.title}</Text>
                    </View>
                )}
                keyExtractor={(item) => String(item?.id || `${item?.type || 'evt'}-${item?.timestamp}`)}
                style={styles.flatList}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                windowSize={9}
                removeClippedSubviews={false}
                stickySectionHeadersEnabled={false}
                onEndReachedThreshold={0.3}
                onEndReached={loadMore}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.footerWrap}><ActivityIndicator color={theme.textSecondary} /></View>
                    ) : !hasMore && sections.length > 0 ? (
                        <View style={styles.footerWrap}><Text style={styles.footerText}>You're all caught up.</Text></View>
                    ) : null
                }
                ListEmptyComponent={ready ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>No notifications yet</Text>
                        <Text style={styles.emptyStateSubtitle}>We’ll keep this page updated as soon as new activity rolls in.</Text>
                    </View>
                ) : (
                    <View style={styles.loadingState}>
                        <ActivityIndicator color={theme.textSecondary} />
                    </View>
                )}
            />
        </View>
    );
}

const MemoNotificationCard = React.memo(NotificationCard);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    flatList: {
        flex: 1,
    },
    listContent: {
        paddingBottom: scaleSize(24),
        paddingHorizontal: 0,
    },
    sectionHeaderWrap: {
        paddingTop: scaleSize(16),
        paddingBottom: scaleSize(8),
        paddingHorizontal: scaleSize(26),
    },
    sectionHeaderText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        color: theme.textSecondary,
        letterSpacing: 0.3,
    },
    footerWrap: { paddingVertical: scaleSize(14), alignItems: 'center', justifyContent: 'center' },
    footerText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(12), color: theme.textSecondary },
    loadingState: {
        paddingVertical: scaleSize(40),
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        paddingHorizontal: scaleSize(24),
        paddingVertical: scaleSize(48),
        alignItems: 'center',
    },
    emptyStateTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: ts(15),
        color: theme.textPrimary,
        marginBottom: scaleSize(6),
    },
    emptyStateSubtitle: {
        fontFamily: 'Outfit_500Medium',
        fontSize: ts(12.5),
        color: theme.textSecondary,
        textAlign: 'center',
        lineHeight: ts(18),
    },
});
