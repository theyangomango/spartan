import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, SectionList, Text } from "react-native";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../../../firebase.config";
import ButtonRow from "./ButtonRow";
import NotificationCard from "./NotificationCard";
import scaleSize from "../../../helper/scaleSize";

const PAGE_SIZE = 20;

// keep buttons identity stable across renders
const NOTIF_BUTTONS = ["All Activity", "Likes", "Comments", "Mentions"];

export default function NotificationsModal({ visible, uid }) {
    const [selectedButton, setSelectedButton] = useState("All Activity");
    const [events, setEvents] = useState([]);
    const [refreshTick, setRefreshTick] = useState(0);
    const listRef = useRef(null);
    const [newLikes, setNewLikes] = useState(0);
    const [newComments, setNewComments] = useState(0);

    useEffect(() => {
        if (!visible) return;
        const effUid = uid || global.userData?.uid;
        if (!effUid) return;

        const notifRef = collection(db, "users", effUid, "notifications");
        const notifQuery = query(notifRef, orderBy("timestamp", "desc"), limit(PAGE_SIZE));
        return onSnapshot(notifQuery, (snapshot) => {
            const docs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
            setEvents(docs);
            setRefreshTick((t) => t + 1);
            // ensure the list re-measures and stays at top on first load
            try { listRef.current?.scrollToOffset?.({ offset: 0, animated: false }); } catch {}

            // Count unread likes/comments until first read
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
    }, [visible, uid]);

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
                renderItem={({ item }) => <MemoNotificationCard item={item} />}
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
                ListEmptyComponent={visible ? <View style={styles.emptyWrap} /> : null}
            />
        </View>
    );
}

const MemoNotificationCard = React.memo(NotificationCard);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F7F8FC",
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
        color: "rgba(15,23,42,0.65)",
        letterSpacing: 0.3,
    },
});
