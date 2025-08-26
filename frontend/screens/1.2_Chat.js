import React, { useEffect, useRef, useState, useMemo } from "react";
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

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";

const { width: W } = Dimensions.get("window");
const MAX_REVEAL = 72;

const COLORS = { surface: "#FFFFFF", primary: "#2D9EFF", hairline: "rgba(15,23,42,0.06)" };

export default function Chat({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { usersExcludingSelf, data: initialData, index } = route.params;

    const [data, setData] = useState(initialData);
    const [text, setText] = useState("");
    const [isFocused, setFocused] = useState(false);
    const [isUploading, setUploading] = useState(false);

    const [replyDraft, setReplyDraft] = useState(null); // { mid, senderHandle, text, hasMedia }
    const [viewer, setViewer] = useState(null);         // { uri, type, anchor }
    const [sheet, setSheet] = useState({ visible: false, anchor: null, msg: null });

    const flatRef = useRef(null);
    const messagesRaw = useChatMessages(data.cid);
    const currentUid = global?.userData?.uid || null;

    // keep outer chat doc up-to-date
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "messages", data.cid), (snap) => {
            if (snap.exists()) setData({ ...snap.data(), cid: data.cid });
        });
        return () => unsub();
    }, [data.cid]);

    const sendText = async () => {
        const t = (text || "").trim();
        if (!t) return;
        await sendMessageV2({
            cid: data.cid,
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
        setText("");
        setReplyDraft(null);
    };

    const openPicker = async () => {
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
                cid: data.cid,
                uid: currentUid,
                assets: res.assets || [],
            });
            await sendMessageV2({
                cid: data.cid,
                sender: {
                    uid: currentUid,
                    handle: global.userData.handle,
                    pfp: global.userData.image,
                    name: global.userData.name,
                },
                text: "",
                media: uploaded,
            });
        } finally {
            setUploading(false);
        }
    };

    // Reaction/Reply sheet
    const openActions = (msg, anchorRect) => setSheet({ visible: true, anchor: anchorRect, msg });
    const closeActions = () => setSheet((s) => ({ ...s, visible: false }));

    const handleReaction = async (key) => {
        if (!sheet.msg) return;
        await toggleReactionV2({
            cid: data.cid,
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

    /** ---------------- Split swipe gesture to reveal timestamps ---------------- */
    const revealSelf = useSharedValue(0);  // your messages
    const revealOther = useSharedValue(0); // other users
    const mode = useSharedValue(0);        // 0 none, 1 self, 2 other

    const pan = Gesture.Pan()
        .minDistance(8)
        .activeOffsetX([-16, 16])
        .failOffsetY([-12, 12])
        .onBegin((e) => {
            "worklet";
            if (e.absoluteX > W * 0.55) mode.value = 1; // right 45% => your messages
            else if (e.absoluteX < W * 0.45) mode.value = 2; // left 45% => others
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
            }
        })
        .onEnd(() => {
            "worklet";
            if (mode.value === 1) revealSelf.value = withTiming(0, { duration: 160 });
            if (mode.value === 2) revealOther.value = withTiming(0, { duration: 160 });
            mode.value = 0;
        })
        .onFinalize(() => {
            "worklet";
            revealSelf.value = withTiming(0, { duration: 160 });
            revealOther.value = withTiming(0, { duration: 160 });
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
    const dateKey = (t) => {
        const d =
            typeof t?.toMillis === "function" ? new Date(t.toMillis())
                : t?.seconds ? new Date(t.seconds * 1000)
                    : typeof t === "number" ? new Date(t < 1e12 ? t * 1000 : t)
                        : typeof t === "string" ? new Date(t)
                            : new Date(t);
        if (isNaN(+d)) return "";
        return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    };

    // sort newest → oldest, then inject a date item AFTER each day's block
    const { messagesOnly, withSeparators } = useMemo(() => {
        const list = Array.isArray(messagesRaw) ? [...messagesRaw] : [];
        list.sort((a, b) => toMs(b?.timestamp) - toMs(a?.timestamp)); // newest first
        const out = [];
        let currentKey = list.length ? dateKey(list[0]?.timestamp) : "";
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
            const k = dateKey(m?.timestamp);
            if (k !== currentKey) {
                flush();
                currentKey = k;
            }
            group.push({ type: "msg", ...m });
        }
        flush();

        return { messagesOnly: list, withSeparators: out };
    }, [messagesRaw]);

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
                revealSelf={revealSelf}
                revealOther={revealOther}
                revealMax={MAX_REVEAL}
                onOpenMedia={openMedia}
                onOpenActions={openActions}
            />
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
            <StatusBar barStyle="dark-content" />
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <ChatHeader
                    usersExcludingSelf={usersExcludingSelf}
                    toMessages={() => navigation.navigate("Messages", { message: data, index })}
                />

                {/* Wrap the list with the split-swipe gesture */}
                <GestureDetector gesture={pan}>
                    <View style={styles.surface}>
                        <FlatList
                            ref={flatRef}
                            inverted
                            data={withSeparators}
                            keyExtractor={(it, i) =>
                                it.type === "date"
                                    ? it.id
                                    : it.id || it.clientId || it.timestamp?.toString() || `k-${i}`
                            }
                            renderItem={renderItem}
                            style={styles.list}
                            contentContainerStyle={{
                                paddingHorizontal: 14,
                                paddingTop: 8,
                                paddingBottom: (isFocused ? 4 : 16) + insets.bottom + 72,
                            }}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
                            onScrollBeginDrag={Keyboard.dismiss}
                            showsVerticalScrollIndicator={false}
                            ListHeaderComponent={<View style={{ height: 6 }} />}
                            ListFooterComponent={<View style={{ height: 6 }} />}
                            scrollEventThrottle={16}
                        />
                    </View>
                </GestureDetector>

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
                        <ActivityIndicator size="small" color="#fff" />
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
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: "#fff" },
    surface: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderTopColor: COLORS.hairline,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    list: { flex: 1 },
    uploadOverlay: {
        position: "absolute",
        right: 16,
        bottom: 80,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: "rgba(15,23,42,0.75)",
    },

    // date chip styles (same sleek vibe)
    dateWrap: { width: "100%", alignItems: "center", paddingVertical: 10 },
    dateChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#EFF4FF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(45,158,255,0.10)",
    },
    dateText: {
        color: "#3A4A64",
        fontSize: 12,
        fontFamily: "Outfit_500Medium",
        letterSpacing: 0.2,
    },
});
