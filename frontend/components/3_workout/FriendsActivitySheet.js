// components/3_Workout/FriendsActivitySheet.jsx
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Image, FlatList, Pressable } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";

const timeAgo = (ts) => {
    const d = typeof ts === "number" ? ts : (ts?.toMillis?.() ?? Date.now());
    const diff = Math.max(0, Date.now() - d);
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    return `${days}d ago`;
};

const FriendRow = memo(({ item, onJoin, onView }) => {
    return (
        <View style={styles.row}>
            <Image source={{ uri: item.pfp }} style={styles.avatar} />
            <View style={styles.rowCenter}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                    {item.live ? "Live now" : "Finished"} • {item.exercises} exercises • {item.duration} min • {timeAgo(item.created)}
                </Text>
            </View>
            {item.live ? (
                <Pressable style={[styles.cta, styles.joinBtn]} onPress={() => onJoin?.(item)}>
                    <Text style={[styles.ctaText, styles.joinText]}>Join</Text>
                </Pressable>
            ) : (
                <Pressable style={[styles.cta, styles.viewBtn]} onPress={() => onView?.(item)}>
                    <Text style={[styles.ctaText, styles.viewText]}>View</Text>
                </Pressable>
            )}
        </View>
    );
});

const FriendsActivitySheet = ({
    /** OPTION A: control with boolean */
    visible,
    /** OPTION B: flip-to-open flag (any change expands) */
    openToggle,
    /** Array of friend activity objects */
    items = [],
    onClose,
    onJoin,        // when tapping "Join" on a live workout
    onView,        // when tapping "View" on a finished workout
}) => {
    const bottomSheetRef = useRef(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const snapPoints = useMemo(() => ["90%"], []);

    // Open/close by explicit visible
    useEffect(() => {
        if (!bottomSheetRef.current || typeof visible === "undefined") return;
        if (visible) {
            bottomSheetRef.current.expand();
            setIsExpanded(true);
        } else {
            bottomSheetRef.current.close();
        }
    }, [visible]);

    // Expand on ANY toggle flip
    useEffect(() => {
        if (!bottomSheetRef.current || typeof openToggle === "undefined") return;
        bottomSheetRef.current.expand();
        setIsExpanded(true);
    }, [openToggle]);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.6}
            />
        ),
        []
    );

    const handleClose = useCallback(() => {
        setIsExpanded(false);
        onClose?.();
    }, [onClose]);

    const keyExtractor = useCallback((it, i) => it.id ?? it.uid ?? `f-${i}`, []);

    const renderItem = useCallback(
        ({ item }) => <FriendRow item={item} onJoin={onJoin} onView={onView} />,
        [onJoin, onView]
    );

    return (
        <View style={styles.outer} pointerEvents="box-none">
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                handleStyle={styles.hiddenHandle}
                backgroundStyle={styles.sheetBg}
                onClose={handleClose}
            >
                {/* Grabber */}
                <View style={styles.handle} />

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Friends training</Text>
                    <Text style={styles.headerSub}>{items.length} updates</Text>
                </View>

                {/* List */}
                <FlatList
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.sep} />}
                    showsVerticalScrollIndicator={false}
                />
            </BottomSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    outer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
    hiddenHandle: { display: "none" },
    sheetBg: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    handle: {
        alignSelf: "center",
        width: 46,
        height: 5,
        borderRadius: 999,
        backgroundColor: "#E2E8F0",
        marginTop: 8,
        marginBottom: 6,
    },
    header: { paddingHorizontal: 16, paddingVertical: 8 },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: "#0F172A" },
    headerSub: { marginTop: 2, fontFamily: "Outfit_500Medium", fontSize: 12.5, color: "#64748B" },

    listContent: { paddingHorizontal: 12, paddingBottom: 24 },
    sep: { height: 10 },

    row: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(2,6,23,0.06)",
    },
    avatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12, backgroundColor: "#E2E8F0" },
    rowCenter: { flex: 1 },
    name: { fontFamily: "Outfit_700Bold", fontSize: 14.5, color: "#0F172A" },
    meta: { marginTop: 2, fontFamily: "Outfit_500Medium", fontSize: 12.5, color: "#64748B" },

    cta: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    joinBtn: { backgroundColor: "#0F172A", borderColor: "transparent" },
    joinText: { color: "#fff" },
    viewBtn: { backgroundColor: "#EEF2FF", borderColor: "rgba(99,102,241,0.35)" },
    viewText: { color: "#0F172A" },
    ctaText: { fontFamily: "Outfit_700Bold", fontSize: 12.5 },
});

export default memo(FriendsActivitySheet);
