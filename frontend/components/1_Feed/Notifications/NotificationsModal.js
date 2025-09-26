import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, SectionList, Text, ActivityIndicator } from "react-native";
import { collection, query, orderBy, limit, onSnapshot, getDocs, startAfter, doc, setDoc } from "firebase/firestore";
import { db } from "../../../../firebase.config";
import ButtonRow from "./ButtonRow";
import NotificationCard from "./NotificationCard";
import scaleSize, { ts } from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";
import acceptWorkoutInvite from "../../../helper/workoutInvites";

const PAGE_SIZE = 20;

// keep buttons identity stable across renders
const NOTIF_BUTTONS = ["All Activity", "Likes", "Comments", "Mentions"];

export default function NotificationsModal({ visible, uid, closeBottomSheet }) {
    const [selectedButton, setSelectedButton] = useState("All Activity");
    const [events, setEvents] = useState([]);
    const [refreshTick, setRefreshTick] = useState(0);
    const listRef = useRef(null);
    const [newLikes, setNewLikes] = useState(0);
    const [newComments, setNewComments] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const lastDocRef = useRef(null); // Firestore DocumentSnapshot used for pagination
    const hasLoadedMoreRef = useRef(false);

    useEffect(() => {
        const effUid = uid || global?.userData?.uid;
        if (!effUid) return;

        // Reset pagination cursors when (re)subscribing
        hasLoadedMoreRef.current = false;
        lastDocRef.current = null;
        setHasMore(true);

        const notifRef = collection(db, "users", effUid, "notifications");
        const notifQuery = query(notifRef, orderBy("timestamp", "desc"), limit(PAGE_SIZE));
        const unsub = onSnapshot(notifQuery, (snapshot) => {
            const docs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

            // Merge the newest page into any already-loaded older pages, de-duping by id.
            setEvents((prev) => {
                const newestIds = new Set(docs.map((d) => d.id));
                const tail = prev.filter((p) => !newestIds.has(p.id));
                return [...docs, ...tail];
            });
            setRefreshTick((t) => t + 1);
            try { listRef.current?.scrollToOffset?.({ offset: 0, animated: false }); } catch {}

            // If we have not paginated yet, set the initial cursor & hasMore
            if (!hasLoadedMoreRef.current) {
                lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
                setHasMore(snapshot.docs.length === PAGE_SIZE);
            }

            let likes = 0;
            let comments = 0;
            for (const doc of docs) {
                if (doc.read) break;
                if (doc.type?.startsWith("liked")) likes++;
                if (["comment", "replied-comment"].includes(doc.type)) comments++;
            }
            setNewLikes(likes);
            setNewComments(comments);
        });

        return () => { try { unsub(); } catch {} };
    }, [uid, visible, global?.userData?.uid]);

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

            setEvents((prev) => prev.map((evt) => (
                evt?.id === item?.id
                    ? { ...evt, inviteStatus: "accepted", read: true }
                    : evt
            )));

            try {
                global.__pendingWorkoutJoin = {
                    wid,
                    seedWorkout: seedWorkout || null,
                    inviterUid: String(item?.uid || ""),
                    ts: Date.now(),
                };
            } catch {}

            try { closeBottomSheet?.(); } catch {}

            try {
                const { jumpToTab } = require('../../../../navigationRef');
                jumpToTab('Workout', { _joinTs: Date.now() });
            } catch {}

            return true;
        } catch (err) {
            console.log('handleAcceptInvite error', err);
            return false;
        }
    }, [uid, closeBottomSheet, setEvents]);

    const handlePressNotification = useCallback((item) => {
        try { closeBottomSheet?.(); } catch {}

        if (item?.type === 'follow') {
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
            if (item?.pid) jumpToTab('Feed', { focusPid: String(item.pid), _t: Date.now() });
            else jumpToTab('Feed');
        } catch {}
    }, [closeBottomSheet]);

    // Load older pages when the user scrolls near the bottom
    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        const effUid = uid || global?.userData?.uid;
        if (!effUid) return;
        const cursor = lastDocRef.current;
        if (!cursor) return;

        setLoadingMore(true);
        try {
            const notifRef = collection(db, "users", effUid, "notifications");
            const q = query(
                notifRef,
                orderBy("timestamp", "desc"),
                startAfter(cursor),
                limit(PAGE_SIZE)
            );
            const snap = await getDocs(q);
            const more = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));

            if (more.length === 0) {
                setHasMore(false);
                setLoadingMore(false);
                return;
            }

            // Update cursor to the last doc from this batch
            lastDocRef.current = snap.docs[snap.docs.length - 1] || lastDocRef.current;
            hasLoadedMoreRef.current = true;
            setHasMore(snap.docs.length === PAGE_SIZE);

            // Append while avoiding duplicates
            setEvents((prev) => {
                const seen = new Set(prev.map((p) => p.id));
                const merged = [...prev, ...more.filter((m) => !seen.has(m.id))];
                return merged;
            });
        } catch (e) {
            // Fail silently; keep UX smooth
        } finally {
            setLoadingMore(false);
        }
    };

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
            "All Activity": (e) => true,
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
    }, [events, refreshTick]);

    const sections = groupedByFilter[selectedButton] || [];

    return (
        <View style={styles.container}>
            <ButtonRow
                buttons={NOTIF_BUTTONS}
                selectedButton={selectedButton}
                setSelectedButton={setSelectedButton}
                newLikes={newLikes}
                newComments={newComments}
            />
            <SectionList
                ref={listRef}
                sections={sections}
                renderItem={({ item }) => (
                    <MemoNotificationCard
                        item={item}
                        onPressCard={() => handlePressNotification(item)}
                        onAcceptWorkoutInvite={item?.type === 'workout-invite' ? (() => handleAcceptInvite(item)) : undefined}
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
                    ) : !hasMore ? (
                        <View style={styles.footerWrap}><Text style={styles.footerText}>You're all caught up.</Text></View>
                    ) : null
                }
                ListEmptyComponent={visible ? <View style={styles.emptyWrap} /> : null}
            />
        </View>
    );
}

const MemoNotificationCard = React.memo(NotificationCard);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
        borderTopLeftRadius: scaleSize(26),
        borderTopRightRadius: scaleSize(26),
    },
    flatList: {
        paddingHorizontal: scaleSize(12),
    },
    listContent: {
        paddingBottom: scaleSize(18),
    },
    emptyWrap: { height: scaleSize(60) },
    sectionHeaderWrap: { paddingHorizontal: scaleSize(14), paddingTop: scaleSize(10), paddingBottom: scaleSize(6) },
    sectionHeaderText: {
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(12),
        color: theme.textSecondary,
        letterSpacing: 0.3,
    },
    footerWrap: { paddingVertical: scaleSize(14), alignItems: 'center', justifyContent: 'center' },
    footerText: { fontFamily: 'Outfit_600SemiBold', fontSize: scaleSize(12), color: theme.textSecondary },
});
