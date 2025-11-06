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
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import useChatMessages from "../helper/useChatMessages";
import useReportContentSheet from "../hooks/useReportContentSheet";

import ChatHeader from "../components/1.2_Chat/ChatHeader";
import MessageItem from "../components/1.2_Chat/MessageItem";
import MessageInput from "../components/1.2_Chat/MessageInput";
import ReactionPopover from "../components/1.2_Chat/ReactionPopover";
import MediaViewerModal from "../components/1.2_Chat/MediaViewerModal";

import sendMessageV2 from "../../backend/messages/sendMessageV2";
import registerChatParticipants from "../../backend/messages/registerChatParticipants";
import toggleReactionV2 from "../../backend/messages/toggleReactionV2";
import uploadMediaAssets from "../../backend/storage/uploadMediaAssets";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import theme from "../theme/mfpDark";
import Animated, { runOnJS, useSharedValue, withTiming } from "react-native-reanimated";

import scaleSize from "../helper/scaleSize";
import { ensureUidArray, coerceUid } from "../utils/userRefs";

const { width: W } = Dimensions.get("window");
const MAX_REVEAL = 72;
const BACK_START_WIDTH = W * 0.1; // capture left-edge pan for back gesture
const BACK_COMPLETE_DISTANCE = W * 0.33; // require ~33% drag to pop
const BACK_COMPLETE_VELOCITY = 1100; // px/s fling threshold
const MAX_ATTACHMENTS = 8;

const UPLOAD_ERROR_COPY = {
    UNRESOLVED_ASSET_URI: "We couldn't access that item. Download it to your device first, then try again.",
    ASSET_READ_FAILED: "We couldn't read the selected file. Please choose a different one.",
    ASSET_EMPTY: "The selected file appears to be empty. Please pick a different one.",
    VIDEO_NOT_ALLOWED: "Videos can't be shared in chat yet. Please pick images instead.",
};

const resolveUploadErrorMessage = (error) => {
    const code = typeof error?.code === "string" ? error.code : "";
    if (code && UPLOAD_ERROR_COPY[code]) return UPLOAD_ERROR_COPY[code];
    if (typeof error?.message === "string") {
        const directMessage = Object.entries(UPLOAD_ERROR_COPY).find(([, msg]) => msg === error.message);
        if (directMessage) return directMessage[1];
    }
    if (code && code.startsWith("storage/unauthorized")) {
        return "You don't have permission to upload to this chat right now.";
    }
    if (code && code.startsWith("storage/quota-exceeded")) {
        return "You've hit the upload limit for now. Please wait a bit and retry.";
    }
    return "Something went wrong while sending your message. Please try again.";
};

const AnimatedKeyboardAvoidingView = Animated.createAnimatedComponent(KeyboardAvoidingView);

const COLORS = { surface: theme.surface, primary: theme.primary, hairline: theme.hairline, bg: theme.bg, text: theme.textPrimary, subtext: theme.textSecondary, field: theme.field };

const normalizeParticipant = (raw) => {
    if (!raw || typeof raw !== "object") return null;
    const uidCandidate =
        raw.uid ||
        raw.id ||
        raw.userUid ||
        raw.profileUid ||
        raw.memberUid ||
        raw.creatorUid ||
        raw.creatorUID;
    const uid = typeof uidCandidate === "string" || typeof uidCandidate === "number"
        ? String(uidCandidate).trim()
        : "";
    if (!uid) return null;
    const handle = typeof raw.handle === "string"
        ? raw.handle
        : (typeof raw.username === "string" ? raw.username : "");
    const name = typeof raw.name === "string"
        ? raw.name
        : (typeof raw.displayName === "string"
            ? raw.displayName
            : (handle || ""));
    const photo =
        (typeof raw.pfp === "string" && raw.pfp) ||
        (typeof raw.image === "string" && raw.image) ||
        (typeof raw.photoURL === "string" && raw.photoURL) ||
        "";
    const pfpVersion = Number(raw?.pfpVersion ?? raw?.imageVersion ?? 0) || 0;
    return {
        uid,
        handle,
        name,
        displayName: name,
        pfp: photo,
        image: photo,
        photoURL: photo,
        pfpVersion,
    };
};

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
    const [pendingMedia, setPendingMedia] = useState([]);

    const [replyDraft, setReplyDraft] = useState(null); // { mid, senderHandle, text, hasMedia }
    const [viewer, setViewer] = useState(null);         // { uri, type, anchor }
    const [sheet, setSheet] = useState({ visible: false, anchor: null, msg: null });
    const { openReportSheet, reportSheetNode } = useReportContentSheet();

    const flatRef = useRef(null);
    const registrationKeyRef = useRef("");
    const messagesRaw = useChatMessages(chatCid);
    const currentUid = global?.userData?.uid || null;
    const blockedSet = useMemo(
        () => new Set(ensureUidArray(global?.userData?.blockedUidList || global?.userData?.blocked)),
        [global?.userData?.blockedUidList, global?.userData?.blocked]
    );
    const blockedBySet = useMemo(
        () => new Set(ensureUidArray(global?.userData?.blockedByUidList || global?.userData?.blockedBy)),
        [global?.userData?.blockedByUidList, global?.userData?.blockedBy]
    );

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

    const toHeaderProfile = useCallback(() => {
        if (!Array.isArray(headerUsersExcludingSelf) || headerUsersExcludingSelf.length !== 1) return;
        const target = headerUsersExcludingSelf[0];
        if (!target || !target.uid) return;

        const targetUid = String(target.uid);
        const selfUid = currentUid ? String(currentUid) : null;
        const rootNav = navigation?.getParent?.("ROOT");

        if (selfUid && selfUid === targetUid) {
            if (rootNav?.navigate) rootNav.navigate("Profile", { transition: "slide-from-right" });
            else navigation.navigate("Profile", { transition: "slide-from-right" });
            return;
        }

        const userPayload = {
            uid: targetUid,
            handle: typeof target.handle === "string" ? target.handle : "",
            name: typeof target.name === "string" ? target.name : "",
            pfp: target?.pfp || target?.pfpUrl || target?.image || target?.photoURL || target?.avatar || "",
        };

        if (rootNav?.navigate) rootNav.navigate("ViewProfile", { user: userPayload });
        else navigation.navigate("ViewProfile", { user: userPayload });
    }, [headerUsersExcludingSelf, navigation, currentUid]);

    // Track whether user is near the latest message (bottom of inverted list)
    const isNearBottomRef = useRef(true);
    const latestSeenIdRef = useRef(null);
    const firstMessageSeenRef = useRef(false);

    const participantUids = useMemo(() => {
        const headerUids = Array.isArray(headerUsersExcludingSelf)
            ? headerUsersExcludingSelf.map((u) => coerceUid(u)).filter(Boolean)
            : [];
        const memberUids = Array.isArray(data?.memberUids) ? data.memberUids.map((uid) => String(uid || "")).filter(Boolean) : [];
        return Array.from(new Set([...headerUids, ...memberUids]));
    }, [headerUsersExcludingSelf, data?.memberUids]);

    useEffect(() => {
        if (!chatCid || !currentUid) return;

        const participantsMap = new Map();
        const push = (entry) => {
            const normalized = normalizeParticipant(entry);
            if (!normalized) return;
            if (!participantsMap.has(normalized.uid)) {
                participantsMap.set(normalized.uid, normalized);
            }
        };

        const selfRef = normalizeParticipant({
            uid: currentUid,
            handle: global?.userData?.handle || "",
            name: global?.userData?.name || global?.userData?.displayName || "",
            pfp: global?.userData?.image || global?.userData?.pfp || global?.userData?.photoURL || "",
            pfpVersion: global?.userData?.pfpVersion || global?.userData?.imageVersion || 0,
        });
        if (selfRef) push(selfRef);

        const candidateLists = [
            Array.isArray(data?.users) ? data.users : [],
            Array.isArray(headerUsersExcludingSelf) ? headerUsersExcludingSelf : [],
            Array.isArray(params?.participants) ? params.participants : [],
        ];
        candidateLists.forEach((list) => {
            list.forEach((item) => push(item));
        });

        const participants = Array.from(participantsMap.values());
        if (participants.length < 2) return;
        if (!participants.some((p) => p.uid === String(currentUid))) return;

        const key = JSON.stringify(participants.map((p) => [p.uid, p.handle, p.name, p.pfpVersion]));
        if (registrationKeyRef.current === key) return;
        registrationKeyRef.current = key;

        registerChatParticipants({ cid: chatCid, participants }).catch((err) => {
            console.log("[chat] register participants failed", err?.message || err);
            registrationKeyRef.current = "";
        });
    }, [chatCid, currentUid, data?.users, headerUsersExcludingSelf, params?.participants]);

    const isThreadBlocked = useMemo(() => {
        if (!currentUid) return false;
        if (Array.isArray(data?.hiddenFor) && data.hiddenFor.includes(currentUid)) return true;
        if (data?.isBlockedThread) return true;
        return participantUids.some((uid) => blockedSet.has(uid) || blockedBySet.has(uid));
    }, [currentUid, data?.hiddenFor, data?.isBlockedThread, participantUids, blockedSet, blockedBySet]);

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

    const sendMessage = async () => {
        if (!chatCid) return;
        const messageText = (text || "").trim();
        const mediaToSend = pendingMedia;
        if (!messageText && mediaToSend.length === 0) return;

        if (isThreadBlocked) {
            Alert.alert("Messaging Disabled", "You cannot send messages in this conversation.");
            return;
        }

        setUploading(true);
        try {
            let uploaded = [];
            if (mediaToSend.length) {
                uploaded = await uploadMediaAssets({
                    cid: chatCid,
                    uid: currentUid,
                    assets: mediaToSend,
                });
            }

            await sendMessageV2({
                cid: chatCid,
                sender: {
                    uid: currentUid,
                    handle: global.userData.handle,
                    pfp: global.userData.image,
                    name: global.userData.name,
                },
                text: messageText,
                media: uploaded,
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
            setPendingMedia([]);
            scrollToLatest();
        } catch (err) {
            console.error("Chat send failed", err);
            Alert.alert("Send failed", resolveUploadErrorMessage(err));
        } finally {
            setUploading(false);
        }
    };

    const openPicker = async () => {
        if (!chatCid) return;
        if (isThreadBlocked) {
            Alert.alert("Messaging Disabled", "You cannot share media in this conversation.");
            return;
        }
        if (pendingMedia.length >= MAX_ATTACHMENTS) {
            Alert.alert("Attachment limit reached", "You can attach up to 8 items per message.");
            return;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                "Permission needed",
                "We need access to your photo library to share media in chat."
            );
            return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
            allowsMultipleSelection: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            selectionLimit: MAX_ATTACHMENTS,
            quality: 0.9,
        });
        if (res.canceled) return;

        const pickedAssets = Array.isArray(res.assets) ? res.assets : [];
        const isImageAsset = (asset) => {
            const type = typeof asset?.type === "string" ? asset.type.toLowerCase() : "";
            const mime = typeof asset?.mimeType === "string" ? asset.mimeType.toLowerCase() : "";
            if (type.includes("video") || mime.startsWith("video/")) return false;
            if (type.includes("image") || mime.startsWith("image/")) return true;
            return true; // default to allow unknown types from the image picker
        };
        const imageAssets = pickedAssets.filter(isImageAsset);

        if (!imageAssets.length) {
            Alert.alert("Images only", "Videos can't be shared in chat yet. Please pick images instead.");
            return;
        }
        if (imageAssets.length < pickedAssets.length) {
            Alert.alert("Images only", "We added your images but skipped videos, which aren't supported here.");
        }

        const normalized = imageAssets.map((asset, idx) => ({
            ...asset,
            localId: `${asset.assetId || asset.id || asset.uri || "asset"}-${Date.now()}-${idx}`,
        }));
        if (!normalized.length) return;

        const existingKeys = new Set(
            pendingMedia.map((item) => item.assetId || item.id || item.uri || item.localId)
        );
        const next = [...pendingMedia];
        let added = 0;
        for (const asset of normalized) {
            const key = asset.assetId || asset.id || asset.uri || asset.localId;
            if (existingKeys.has(key)) continue;
            if (next.length >= MAX_ATTACHMENTS) break;
            next.push(asset);
            existingKeys.add(key);
            added += 1;
        }

        if (!added) {
            Alert.alert("Already added", "Those attachments are already queued or exceed the limit.");
            return;
        }
        if (added < normalized.length) {
            Alert.alert("Attachment limit", "Some items were skipped because they were duplicates or exceeded the 8 item limit.");
        }
        setPendingMedia(next);
    };

    const removePendingMedia = useCallback((localId) => {
        setPendingMedia((prev) => prev.filter((item) => item.localId !== localId));
    }, []);

    // Reaction/Reply sheet
    const openActions = (msg, anchorRect) => setSheet({ visible: true, anchor: anchorRect, msg });
    const closeActions = () => setSheet((s) => ({ ...s, visible: false }));

    const sheetSenderUid = useMemo(() => {
        if (!sheet?.msg) return '';
        const msg = sheet.msg;
        return (
            msg?.sender?.uid ??
            msg?.senderUid ??
            msg?.fromUid ??
            msg?.uid ??
            msg?.userId ??
            msg?.authorId ??
            msg?.from?.uid ??
            msg?.author?.uid ??
            ''
        );
    }, [sheet?.msg]);

    const sheetActions = useMemo(() => {
        const base = [
            { key: "reply", label: "Reply" },
            { key: "copy", label: "Copy" },
        ];
        if (sheet?.msg && sheetSenderUid && sheetSenderUid !== currentUid) {
            base.push({ key: "report", label: "Report" });
        }
        return base;
    }, [currentUid, sheet?.msg, sheetSenderUid]);

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
        if (key === "report") {
            const message = sheet.msg;
            closeActions();
            if (!message) return;
            const senderHandle =
                message?.sender?.handle ||
                message?.senderHandle ||
                message?.sender_name ||
                message?.handle ||
                "";
            const messageId = message.id || message.mid || message.clientId || `msg-${Date.now()}`;
            openReportSheet({
                targetType: "message",
                targetId: `${chatCid || "chat"}:${messageId}`,
                ownerUid: sheetSenderUid ? String(sheetSenderUid) : "",
                ownerHandle: senderHandle,
                source: "direct-message",
                metadata: {
                    chatId: chatCid || "",
                    text: message?.text || "",
                    hasMedia: Array.isArray(message?.media) && message.media.length > 0,
                },
            });
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
                    onPressParticipant={toHeaderProfile}
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
                        {isThreadBlocked && (
                            <View style={styles.blockedBanner}>
                                <Text style={styles.blockedBannerText}>
                                    You can no longer message participants in this conversation.
                                </Text>
                            </View>
                        )}
                        <MessageInput
                            text={text}
                            setText={setText}
                            onSend={sendMessage}
                            onOpenPicker={openPicker}
                            isFocused={isFocused}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            replyDraft={replyDraft}
                            clearReply={() => setReplyDraft(null)}
                            attachments={pendingMedia}
                            onRemoveAttachment={removePendingMedia}
                            canSend={!isThreadBlocked && (!!text.trim() || pendingMedia.length > 0)}
                            isSending={isUploading}
                            isBlocked={isThreadBlocked}
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
                            actions={sheetActions}
                            onReaction={handleReaction}
                            onAction={handleAction}
                        />

                        {reportSheetNode}

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
    blockedBanner: {
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(8),
        backgroundColor: "rgba(255, 95, 95, 0.15)",
        borderRadius: scaleSize(10),
        marginHorizontal: scaleSize(12),
        marginBottom: scaleSize(6),
    },
    blockedBannerText: {
        color: COLORS.subtext,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
        textAlign: "center",
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
