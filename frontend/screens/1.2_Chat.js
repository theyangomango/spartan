import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
    View,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Keyboard,
    ActivityIndicator,
    Dimensions,
    Text,
    Vibration,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import useChatMessages from "../helper/useChatMessages";

import ChatHeader from "../components/1.2_Chat/ChatHeader";
import MessageItem from "../components/1.2_Chat/MessageItem";
import MessageInput from "../components/1.2_Chat/MessageInput";
import ReactionPopover from "../components/1.2_Chat/ReactionPopover";
import MediaViewerModal from "../components/1.2_Chat/MediaViewerModal";

import sendMessageV2 from "../../backend/messages/sendMessageV2";
import toggleReactionV2 from "../../backend/messages/toggleReactionV2";
import uploadMediaAssets from "../../backend/storage/uploadMediaAssets";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import theme from "../theme/mfpDark";
import Animated, { runOnJS, useSharedValue, withTiming } from "react-native-reanimated";

import scaleSize from "../helper/scaleSize";

const { width: W } = Dimensions.get("window");
const MAX_REVEAL = 72;
const BACK_START_WIDTH = W * 0.1; // capture left-edge pan for back gesture
const BACK_COMPLETE_DISTANCE = W * 0.33; // require ~33% drag to pop
const BACK_COMPLETE_VELOCITY = 1100; // px/s fling threshold

const AnimatedKeyboardAvoidingView = Animated.createAnimatedComponent(KeyboardAvoidingView);

const COLORS = { surface: theme.surface, primary: theme.primary, hairline: theme.hairline, bg: theme.bg, text: theme.textPrimary, subtext: theme.textSecondary, field: theme.field };

export default function Chat({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const params = route?.params || {};
    const initialUsers = Array.isArray(params.usersExcludingSelf) ? params.usersExcludingSelf : [];
    const seededCid = (() => {
        const fromParam = typeof params.cid === 'string' && params.cid ? params.cid : null;
        const fromData = typeof params?.data?.cid === 'string' && params.data.cid ? params.data.cid : null;
        return fromParam || fromData || '';
    })();
    const seededData = (() => {
        if (params && typeof params.data === 'object' && params.data) {
            return { cid: seededCid, ...params.data };
        }
        if (seededCid) return { cid: seededCid };
        return { cid: '' };
    })();
    const [data, setData] = useState(seededData);
    const usersExcludingSelf = initialUsers;
    const chatCid = typeof data?.cid === 'string' ? data.cid : seededCid;
    const [text, setText] = useState("");
    const [isFocused, setFocused] = useState(false);
    const [isUploading, setUploading] = useState(false);

    const [replyDraft, setReplyDraft] = useState(null); // { mid, senderHandle, text, hasMedia }
    const [viewer, setViewer] = useState(null);         // { uri, type, anchor }
    const [sheet, setSheet] = useState({ visible: false, anchor: null, msg: null });

    const flatRef = useRef(null);
    const messagesRaw = useChatMessages(chatCid);
    const currentUid = global?.userData?.uid || null;

    // Derive header participants when opened via push (route usersExcludingSelf may be empty)
    const headerUsersExcludingSelf = useMemo(() => {
        if (Array.isArray(usersExcludingSelf) && usersExcludingSelf.length > 0) return usersExcludingSelf;
        const arr = Array.isArray(data?.users) ? data.users : [];
        const out = arr
            .filter((u) => u && u.uid && u.uid !== currentUid)
            .map((u) => ({
                uid: u.uid,
                handle: typeof u.handle === 'string' ? u.handle : (typeof u.username === 'string' ? u.username : ''),
                name: typeof u.name === 'string' ? u.name : (typeof u.handle === 'string' ? u.handle : ''),
                pfpVersion: Number(u.pfpVersion || 0),
                pfp: u?.pfp || u?.pfpUrl || u?.image || u?.photoURL || u?.avatar || '',
                pfpUrl: u?.pfpUrl || '',
                image: u?.image || '',
                photoURL: u?.photoURL || '',
                avatar: u?.avatar || '',
            }));
        return out;
    }, [usersExcludingSelf, data?.users, currentUid]);

    // Track whether user is near the latest message (bottom of inverted list)
    const isNearBottomRef = useRef(true);
    const latestSeenIdRef = useRef(null);
    const firstMessageSeenRef = useRef(false);

    // keep outer chat doc up-to-date
    useEffect(() => {
        if (!chatCid) return () => {};
        const unsub = onSnapshot(doc(db, "messages", chatCid), (snap) => {
            if (snap.exists()) setData({ ...snap.data(), cid: chatCid });
        });
        return () => unsub();
    }, [chatCid]);

    const scrollToLatest = () => {
        try {
            // In inverted FlatList, offset 0 shows the newest item
            requestAnimationFrame(() => flatRef.current?.scrollToOffset?.({ offset: 0, animated: true }));
        } catch { }
    };

    const sendText = async () => {
        const t = (text || "").trim();
        if (!t) return;
        if (!chatCid) return;
        // Clear input immediately and prep UI
        setText("");
        setReplyDraft(null);
        scrollToLatest();

        await sendMessageV2({
            cid: chatCid,
            sender: {
                uid: currentUid,
                handle: global.userData.handle,
                pfp: global.userData.image,
                name: global.userData.name,
            },
            text: t,
            media: [],
            replyTo: replyDraft?.mid || null,
            replyPreview: replyDraft
                ? {
                    senderHandle: replyDraft.senderHandle,
                    text: replyDraft.text || "",
                    hasMedia: !!replyDraft.hasMedia,
                }
                : null,
        });
        // Ensure view stays at latest in case list grew
        scrollToLatest();

    };

    const openPicker = async () => {
        if (!chatCid) return;
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") return;
        const res = await ImagePicker.launchImageLibraryAsync({
            allowsMultipleSelection: true,
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            selectionLimit: 8,
            quality: 0.9,
            videoMaxDuration: 60,
        });
        if (res.canceled) return;
        try {
            setUploading(true);
            const uploaded = await uploadMediaAssets({
                cid: chatCid,
                uid: currentUid,
                assets: res.assets || [],
            });
            await sendMessageV2({
                cid: chatCid,
                sender: {
                    uid: currentUid,
                    handle: global.userData.handle,
                    pfp: global.userData.image,
                    name: global.userData.name,
                },
                text: "",
                media: uploaded,
            });
            scrollToLatest();
        } finally {
            setUploading(false);
        }

    };

    // Reaction/Reply sheet
    const openActions = (msg, anchorRect) => setSheet({ visible: true, anchor: anchorRect, msg });
    const closeActions = () => setSheet((s) => ({ ...s, visible: false }));

    const handleReaction = async (key) => {
        if (!sheet.msg || !chatCid) return;
        await toggleReactionV2({
            cid: chatCid,
            messageId: sheet.msg.id || sheet.msg.mid,
            emoji: key,
            uid: currentUid,
        });
    };
    const handleAction = (key) => {
        if (!sheet.msg) return;
        if (key === "reply") {
            setReplyDraft({
                mid: sheet.msg.id || sheet.msg.mid,
                senderHandle:
                    sheet.msg?.sender?.handle ||
                    sheet.msg?.senderHandle ||
                    sheet.msg?.sender_name ||
                    "User",
                text: (sheet.msg?.text || "").trim(),
                hasMedia: Array.isArray(sheet.msg?.media) && sheet.msg.media.length > 0,
            });
        }
        if (key === "copy") {
            const txt = sheet.msg?.text || "";
            if (txt) {
                try {
                    const { setStringAsync } = require("expo-clipboard");
                    setStringAsync(txt);
                } catch { }
            }
        }
    };

    // on media tap -> open viewer
    const openMedia = (payload, anchor) => setViewer({ ...payload, anchor });
    const closeViewer = () => setViewer(null);

    const bottomInset = (isFocused ? 4 : 16) + insets.bottom;

    // Group detection and avatar map for sender lookups
    const isGroup = !!(data?.isGroup || (Array.isArray(data?.users) && data.users.length > 2));
    const pfpByUid = useMemo(() => {
        const map = Object.create(null);
        (Array.isArray(data?.users) ? data.users : []).forEach((u) => {
            const uri = u?.pfp || u?.image || u?.photoURL || u?.avatar || "";
            if (u?.uid) map[u.uid] = uri;
        });
        return map;
    }, [data?.users]);

    /** ---------------- Split swipe gesture to reveal timestamps ---------------- */
    const revealSelf = useSharedValue(0);    // your messages
    const revealOther = useSharedValue(0);   // other users
    const surfaceOffset = useSharedValue(0); // horizontal shift for back swipe
    const mode = useSharedValue(0);          // 0 none, 1 self, 2 other, 3 back, 4 back-completing

    const handleEdgeBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const pan = Gesture.Pan()
        .minDistance(8)
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onBegin((e) => {
            "worklet";
            const startX = e.absoluteX;
            if (startX <= BACK_START_WIDTH) {
                mode.value = 3;
                revealSelf.value = 0;
                revealOther.value = 0;
                surfaceOffset.value = 0;
                return;
            }
            if (startX > W * 0.55) mode.value = 1; // right 45% => your messages
            else if (startX > BACK_START_WIDTH && startX < W * 0.45) mode.value = 2; // left 45% => others
            else mode.value = 0;
        })
        .onUpdate((e) => {
            "worklet";
            if (mode.value === 1) {
                const dx = e.translationX < 0 ? Math.min(MAX_REVEAL, -e.translationX) : 0;
                revealSelf.value = dx;
            } else if (mode.value === 2) {
                const dx = e.translationX > 0 ? Math.min(MAX_REVEAL, e.translationX) : 0;
                revealOther.value = dx;
            } else if (mode.value === 3) {
                const dx = e.translationX > 0 ? Math.min(W, e.translationX) : 0;
                surfaceOffset.value = dx;
            }
        })
        .onEnd((e) => {
            "worklet";
            if (mode.value === 1) {
                revealSelf.value = withTiming(0, { duration: 160 });
                mode.value = 0;
                return;
            }
            if (mode.value === 2) {
                revealOther.value = withTiming(0, { duration: 160 });
                mode.value = 0;
                return;
            }
            if (mode.value === 3) {
                const shouldGoBack = surfaceOffset.value > BACK_COMPLETE_DISTANCE || e.velocityX > BACK_COMPLETE_VELOCITY;
                if (shouldGoBack) {
                    mode.value = 4;
                    surfaceOffset.value = 0;
                    runOnJS(handleEdgeBack)();
                    return;
                }
                surfaceOffset.value = 0;
                mode.value = 0;
            }
        })
        .onFinalize(() => {
            "worklet";
            const currentMode = mode.value;
            if (currentMode === 4) {
                mode.value = 0;
                return;
            }
            revealSelf.value = withTiming(0, { duration: 160 });
            revealOther.value = withTiming(0, { duration: 160 });
            if (currentMode === 3) {
                surfaceOffset.value = 0;
            }
            mode.value = 0;
        });

    /** ---------------- Date chips (inverted list friendly) ---------------- */
    const toMs = (t) => {
        if (!t) return 0;
        if (typeof t === "number") return t < 1e12 ? t * 1000 : t;
        if (typeof t === "string") return Date.parse(t) || 0;
        if (typeof t?.toMillis === "function") return t.toMillis();
        if (typeof t?.seconds === "number") return t.seconds * 1000;
        if (t instanceof Date) return t.getTime();
        return 0;
    };
    const dateKeyFromMs = (ms) => {
        const d = new Date(ms || 0);
        if (isNaN(+d)) return "";
        return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    };
    const msgTimeMs = (m) => {
        // Prefer server timestamp; fallback to clientTs for stable ordering
        const s = toMs(m?.timestamp);
        return s || Number(m?.clientTs) || 0;
    };

    // sort newest → oldest, then inject a date item AFTER each day's block
    const { messagesOnly, withSeparators } = useMemo(() => {
        const list = Array.isArray(messagesRaw) ? [...messagesRaw] : [];
        // stable newest-first sort using clientTs fallback to avoid top flash
        list.sort((a, b) => msgTimeMs(b) - msgTimeMs(a));
        const out = [];
        let currentKey = list.length ? dateKeyFromMs(msgTimeMs(list[0])) : "";
        let group = [];
        let block = 0;

        const flush = () => {
            if (!group.length) return;
            out.push(...group);
            out.push({ type: "date", id: `date-${currentKey}-${block++}`, label: currentKey });
            group = [];
        };

        for (let i = 0; i < list.length; i++) {
            const m = list[i];
            const k = dateKeyFromMs(msgTimeMs(m));
            if (k !== currentKey) {
                flush();
                currentKey = k;
            }
            const pending = !toMs(m?.timestamp) && (m?.senderUid === currentUid || m?.sender?.uid === currentUid);
            group.push({ type: "msg", _pending: pending, ...m });
        }
        flush();

        return { messagesOnly: list, withSeparators: out };
    }, [messagesRaw, currentUid]);

    // Auto-scroll to newest when a new message from others arrives and we're near bottom
    useEffect(() => {
        const newest = (messagesOnly && messagesOnly[0]) || null;
        if (!newest) return;
        const id = newest.clientId || newest.id;
        if (!id || latestSeenIdRef.current === id) return;
        latestSeenIdRef.current = id;
        const senderUid =
            newest?.sender?.uid ?? newest?.senderUid ?? newest?.fromUid ?? newest?.uid ??
            newest?.userId ?? newest?.authorId ?? newest?.from?.uid ?? newest?.author?.uid ?? null;
        // Skip haptic on the very first render
        if (!firstMessageSeenRef.current) {
            firstMessageSeenRef.current = true;
        } else if (senderUid && senderUid !== currentUid) {
            // Haptic for received message (if enabled)
            try {
                const soundsOn = (global?.userData?.settings?.sounds !== false);
                if (soundsOn) {
                    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { }
                    try { Vibration.vibrate(120); } catch { }
                }
            } catch { }
        }
        if (senderUid && senderUid !== currentUid && isNearBottomRef.current) {
            // Scroll only if user hasn't scrolled away from bottom
            requestAnimationFrame(() => flatRef.current?.scrollToOffset?.({ offset: 0, animated: true }));
        }
    }, [messagesOnly, currentUid]);

    const renderItem = ({ item, index }) => {
        if (item.type === "date") {
            return (
                <View style={styles.dateWrap}>
                    <View style={styles.dateChip}>
                        <Text style={styles.dateText}>{item.label}</Text>
                    </View>
                </View>
            );
        }

        // Map this rendered message back to its index within messagesOnly
        const key = item.clientId || item.id;
        const msgIndex = messagesOnly.findIndex((m) => (m.clientId || m.id) === key);

        return (
            <MessageItem
                item={item}
                messages={messagesOnly}
                index={msgIndex >= 0 ? msgIndex : 0}
                currentUid={currentUid}
                isGroup={isGroup}
                pfpByUid={pfpByUid}
                revealSelf={revealSelf}
                revealOther={revealOther}
                revealMax={MAX_REVEAL}
                onOpenMedia={openMedia}
                onOpenActions={openActions}
            />
        );
    };

    // Ensure reaction badges that sit slightly outside the bubble are not clipped by the cell
    const Cell = useMemo(() => {
        const C = React.forwardRef((props, ref) => (
            <View ref={ref} {...props} style={[props.style, { overflow: 'visible' }]} />
        ));
        C.displayName = 'CellRenderer';
        return C;
    }, []);

    return (
        <AnimatedKeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
            <StatusBar barStyle="light-content" />
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <ChatHeader
                    usersExcludingSelf={headerUsersExcludingSelf}
                    // toMessages={() => navigation.navigate("Messages", { message: data, index })}
                    toMessages={() => navigation.goBack()}
                />

                <GestureDetector gesture={pan}>
                    <Animated.View style={styles.flex}>
                        <View style={styles.surface}>
                            <FlatList
                                ref={flatRef}
                                inverted
                                CellRendererComponent={Cell}
                                removeClippedSubviews={false}
                                data={withSeparators}
                                keyExtractor={(it, i) =>
                                    it.type === "date"
                                        ? it.id
                                        : it.id || it.clientId || it.timestamp?.toString() || `k-${i}`
                                }
                                renderItem={renderItem}
                                style={styles.list}
                                contentContainerStyle={{
                                    paddingHorizontal: scaleSize(14),
                                    paddingTop: scaleSize(8),
                                    paddingBottom: scaleSize((isFocused ? 4 : 16) + insets.bottom + 72),
                                }}
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="on-drag"
                                maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
                                onScrollBeginDrag={Keyboard.dismiss}
                                showsVerticalScrollIndicator={false}
                                ListHeaderComponent={<View style={{ height: scaleSize(6) }} />}
                                ListFooterComponent={<View style={{ height: scaleSize(6) }} />}
                                scrollEventThrottle={16}
                                onScroll={(e) => {
                                    try {
                                        const y = e?.nativeEvent?.contentOffset?.y || 0;
                                        isNearBottomRef.current = y <= 80; // inverted: 0 is newest
                                    } catch { }
                                }}
                            />
                        </View>

                        {/* input row w/ integrated media button + reply preview */}
                        <MessageInput
                            text={text}
                            setText={setText}
                            onSend={sendText}
                            onOpenPicker={openPicker}
                            isFocused={isFocused}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            replyDraft={replyDraft}
                            clearReply={() => setReplyDraft(null)}
                        />

                        {isUploading && (
                            <View style={styles.uploadOverlay} pointerEvents="none">
                                <ActivityIndicator size="small" color={COLORS.text} />
                            </View>
                        )}

                        <ReactionPopover
                            visible={sheet.visible}
                            anchor={sheet.anchor}
                            onClose={closeActions}
                            reactions={[
                                { key: "👍", emoji: "👍" },
                                { key: "❤️", emoji: "❤️" },
                                { key: "😂", emoji: "😂" },
                                { key: "😮", emoji: "😮" },
                            ]}
                            actions={[
                                { key: "reply", label: "Reply" },
                                { key: "copy", label: "Copy" },
                                { key: "delete", label: "Delete" },
                            ]}
                            onReaction={handleReaction}
                            onAction={handleAction}
                        />

                        <MediaViewerModal visible={!!viewer} payload={viewer} onClose={closeViewer} />
                    </Animated.View>
                </GestureDetector>
            </View>
        </AnimatedKeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: COLORS.bg },
    container: { flex: 1, backgroundColor: COLORS.bg },
    surface: {
        flex: 1,
        backgroundColor: COLORS.bg,
        borderTopColor: COLORS.hairline,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    list: { flex: 1 },
    uploadOverlay: {
        position: "absolute",
        right: scaleSize(16),
        bottom: scaleSize(80),
        paddingVertical: scaleSize(8),
        paddingHorizontal: scaleSize(10),
        borderRadius: scaleSize(12),
        // dim using a tone close to theme.bg, with alpha
        backgroundColor: "rgba(24,27,40,0.75)",
    },

    // date chip styles (same sleek vibe)
    dateWrap: { width: "100%", alignItems: "center", paddingVertical: scaleSize(10) },
    dateChip: {
        paddingHorizontal: scaleSize(10),
        paddingVertical: scaleSize(6),
        backgroundColor: COLORS.field,
        borderRadius: scaleSize(14),
        borderWidth: scaleSize(1),
        borderColor: COLORS.hairline,
    },
    dateText: {
        color: COLORS.subtext,
        fontSize: scaleSize(12),
        fontFamily: "Outfit_500Medium",
        letterSpacing: 0.2,
    },
});
