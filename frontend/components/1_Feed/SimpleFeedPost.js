import React, { useMemo, useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    FlatList,
    Dimensions,
    ActivityIndicator,
    Modal,
    Alert,
} from "react-native";
import FastImage from "react-native-fast-image";
import { Heart, Messages1 } from "iconsax-react-native";
import Svg, { Path } from "react-native-svg";
import { MaterialCommunityIcons, FontAwesome6 } from "@expo/vector-icons";
import CroppedVideo from "../common/CroppedVideo";
import Slider from "@react-native-community/slider";
import HumanMuscleOutline from "../../assets/human_muscle_outline";
import HumanMuscleBackOutline from "../../assets/human_muscle_back_outline";

import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import { usePfp } from "../../helper/usePFPs";
import usePostFooterInteractions from "./Posts/hooks/usePostFooterInteractions";
import { buildExerciseSummaries } from "../../utils/workoutSummary";
import deletePost from "../../../backend/posts/deletePost";
import deleteCompletedWorkout from "../../../backend/workouts/deleteCompletedWorkout";
import { emitHexagonUpdate } from "../../utils/hexagonEvents";
import { resolvePhotoURL } from "../../utils/profilePhoto";
import VerifiedHandle from "../common/VerifiedHandle";
import useUserVerified from "../../hooks/useUserVerified";
import { strong as hapticStrong } from "../../utils/haptics";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase.config";
import useReportContentSheet from "../../hooks/useReportContentSheet";
import { getViewerUid } from "../../utils/userRefs";
import { subscribeUserData, emitUserDataUpdate } from "../../utils/userDataEvents";
import { invalidateFeedCacheForUser } from "../../helper/feedCache";
import { isClipPost } from "../../utils/postTypes";
import { RANK_TIER_THEMES } from "./FeedSnapshotCard";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BODYGRAPH_OUTLINE_COLOR = "#40485c";
const MUSCLE_HIGHLIGHT = "#ff6f67";
const MUSCLE_SEGMENTS = {
    shoulders: ["shoulders"],
    chest: ["chest"],
    arms: ["arms", "forearms"],
    back: ["back", "traps"],
    abs: ["abs", "obliques"],
    legs: ["quads", "calves"],
};

const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const toMillis = (value) => {
    if (value == null) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value?.toMillis) {
        try {
            return value.toMillis();
        } catch {
            return 0;
        }
    }
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
};

const formatTimestamp = (value) => {
    if (!value && value !== 0) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    let datePart = "";
    let timePart = "";
    try {
        datePart = date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch { }
    try {
        timePart = date.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
        timePart = timePart.replace(/\s?(AM|PM)$/i, (_, meridiem) => meridiem.toUpperCase());
    } catch { }

    if (datePart && timePart) return `${datePart} at ${timePart}`;
    return datePart || timePart || "";
};

const formatDuration = (durationMs) => {
    const ms = Number(durationMs);
    if (!Number.isFinite(ms) || ms <= 0) return "--";
    const totalMinutes = Math.max(0, Math.round(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    if (totalSeconds >= 60) {
        const mins = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${mins}m ${seconds}s`;
    }
    return `${totalSeconds}s`;
};

const formatNumber = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "--";
    try {
        return num.toLocaleString();
    } catch {
        return String(num);
    }
};

const formatClockTime = (seconds) => {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
};

const resolveWorkoutTitle = (workout, caption) => (
    workout?.templateName ||
    workout?.template?.name ||
    workout?.name ||
    caption ||
    "Workout"
);

const resolveWeightUnit = () => {
    try {
        const raw = global?.userData?.settings?.units || global?.userData?.units;
        if (!raw) return "lb";
        const normalized = String(raw).toLowerCase();
        return normalized === "kg" ? "kg" : "lb";
    } catch {
        return "lb";
    }
};

const normalizeMediaEntry = (entry) => {
    if (!entry) return null;
    if (typeof entry === "string") {
        const uri = entry.trim();
        return uri ? { uri, type: "image", cropRect: null } : null;
    }
    if (typeof entry === "object") {
        const uri = entry.uri || entry.url || entry.image || entry.photoURL || null;
        if (!uri) return null;
        const rawType = (entry.type || entry.mediaType || entry.kind || "image").toLowerCase();
        const type = rawType.includes("video") ? "video" : "image";
        return { ...entry, uri, type, cropRect: entry.cropRect || null };
    }
    return null;
};

const mediaSignatureFor = (entry) => {
    if (!entry) return "null";
    const type = entry.type || "image";
    const uri = (() => {
        if (typeof entry.uri === "string") return entry.uri;
        if (entry.uri && typeof entry.uri === "object") {
            try {
                return JSON.stringify(entry.uri);
            } catch {
                return "";
            }
        }
        return "";
    })();
    const crop = entry?.cropRect;
    let cropKey = "";
    if (crop && typeof crop === "object") {
        const { x = 0, y = 0, width = 1, height = 1 } = crop;
        cropKey = `:${Number(x).toFixed(4)}-${Number(y).toFixed(4)}-${Number(width).toFixed(4)}-${Number(height).toFixed(4)}`;
    }
    return `${type}:${uri}${cropKey}`;
};

const initialsFrom = (name = "") => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const OptionsWeightIcon = ({ size, color, style }) => (
    <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={style}
    >
        <Path
            d="M17.18 18c2.4 0 3-1.35 3-3V9c0-1.65-.6-3-3-3s-3 1.35-3 3v6c0 1.65.6 3 3 3Z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M6.82 18c-2.4 0-3-1.35-3-3V9c0-1.65.6-3 3-3s3 1.35 3 3v6c0 1.65-.6 3-3 3Z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M9.82 12h4.36M22.5 14.5v-5M1.5 14.5v-5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

const SimpleFeedPost = ({
    data,
    index,
    highlightPid,
    highlightSignal,
    onPressProfile,
    onPressWorkout,
    onPressComments,
    onPressShare,
    onPressLikes,
    onPressEditPost,
    onPressDeletePost,
    onPressEditWorkout,
    areVideosMuted: externalAreVideosMuted,
    onToggleVideosMuted,
    shouldPlayMedia = true,
}) => {
    const highlightOpacity = useRef(new Animated.Value(0)).current;
    const isHighlighted = useMemo(() => {
        if (!highlightPid) return false;
        const pid = data?.pid ?? data?.id;
        if (pid === undefined || pid === null) return false;
        return String(pid) === String(highlightPid);
    }, [data?.pid, data?.id, highlightPid]);

    useEffect(() => {
        if (!isHighlighted) {
            highlightOpacity.setValue(0);
            return;
        }
        if (!highlightSignal) return;
        highlightOpacity.setValue(0);
        Animated.sequence([
            Animated.timing(highlightOpacity, {
                toValue: 0.35,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.timing(highlightOpacity, {
                toValue: 0,
                duration: 420,
                useNativeDriver: true,
            }),
        ]).start();
    }, [highlightSignal, isHighlighted, highlightOpacity]);

    const workout = data?.workout || null;
    const clipPost = useMemo(() => isClipPost(data), [data]);
    const isLivePost = useMemo(() => (
        Boolean(
            data?.isLive ||
            data?.liveWorkout ||
            (typeof data?.pid === "string" && data.pid.startsWith("workout:live"))
        )
    ), [data?.isLive, data?.liveWorkout, data?.pid]);
    const workoutWid = useMemo(() => {
        const candidates = [
            workout?.wid,
            workout?.workoutId,
            workout?.id,
            workout?.widRef,
            data?.workoutWid,
            data?.liveWorkout?.wid,
            data?.liveWorkout?.workoutId,
            data?.liveWorkout?.id,
            data?.wid,
            data?.workoutId,
        ];
        for (const candidate of candidates) {
            if (candidate === undefined || candidate === null) continue;
            const str = String(candidate).trim();
            if (str) return str;
        }
        return "";
    }, [
        workout?.wid,
        workout?.workoutId,
        workout?.id,
        workout?.widRef,
        data?.workoutWid,
        data?.liveWorkout?.wid,
        data?.liveWorkout?.workoutId,
        data?.liveWorkout?.id,
        data?.wid,
        data?.workoutId,
    ]);
    const [confettiTick, setConfettiTick] = useState(0);
    const [confettiVisible, setConfettiVisible] = useState(false);
    const confettiRef = useRef(null);
    const ConfettiModuleRef = useRef(null);
    const loadConfettiModule = useCallback(() => {
        if (!ConfettiModuleRef.current) {
            try { ConfettiModuleRef.current = require("react-native-confetti-cannon").default; } catch { }
        }
        return ConfettiModuleRef.current;
    }, []);
    const fireConfetti = useCallback(() => {
        loadConfettiModule();
        setConfettiVisible(true);
        requestAnimationFrame(() => {
            try {
                const api = confettiRef.current;
                if (api && typeof api.start === "function") {
                    api.start();
                    return;
                }
            } catch { }
            setConfettiTick((t) => t + 1);
        });
    }, [loadConfettiModule]);
    const sendCheerEvent = useCallback(async () => {
        try {
            const wid = workoutWid;
            if (!wid) return;
            const fromUid = String(global?.userData?.uid || "");
            if (!fromUid) return;
            const fromHandle = String(global?.userData?.handle || "");
            const fromName = String(global?.userData?.name || "");
            const fromPfp = resolvePhotoURL(global?.userData, "");
            const fromPfpVersion = Number(global?.userData?.pfpVersion ?? 0);
            await addDoc(collection(db, "workouts", wid, "events"), {
                type: "cheer",
                fromUid,
                fromHandle,
                fromName,
                fromPfp,
                fromPfpVersion,
                createdAt: serverTimestamp(),
                source: "feed",
            });
        } catch (e) {
            console.log("SimpleFeedPost cheer error", e?.message || e);
        }
    }, [workoutWid]);
    const title = resolveWorkoutTitle(workout, data?.caption);
    const formattedTimestamp = formatTimestamp(data?.created);
    const timestamp = isLivePost ? "Live now" : formattedTimestamp;
    const caption = (data?.caption || "").trim();
    const weightUnit = resolveWeightUnit();

    const shouldShowSubtitle = useMemo(() => {
        if (!workout) return false;
        if (caption.length === 0) return false;
        const normalizedCaption = caption.toLowerCase();
        const normalizedTitle = (title || "").trim().toLowerCase();
        if (!normalizedTitle) return true;
        return normalizedCaption !== normalizedTitle;
    }, [caption, workout, title]);

    const exerciseSummaries = useMemo(() => {
        if (!workout) return [];
        return buildExerciseSummaries(workout, Number.MAX_SAFE_INTEGER);
    }, [workout]);

    const workoutName = useMemo(() => {
        if (!workout) return "";
        const candidate = workout?.templateName || workout?.template?.name || workout?.name;
        if (typeof candidate === "string") return candidate.trim();
        if (candidate) return String(candidate).trim();
        return "";
    }, [workout]);

    const isWorkoutTitle = useMemo(() => {
        if (!workoutName) return false;
        const normalizedTitle = (title || "").trim();
        if (!normalizedTitle) return false;
        return normalizedTitle.toLowerCase() === workoutName.toLowerCase();
    }, [title, workoutName]);

    const mediaList = useMemo(() => {
        const fromMedia = Array.isArray(data?.media) ? data.media.map(normalizeMediaEntry) : [];
        const fromImages = Array.isArray(data?.images) ? data.images.map(normalizeMediaEntry) : [];
        const merged = [...fromMedia, ...fromImages].filter(Boolean);
        if (merged.length === 0) return [];
        const seen = new Set();
        const deduped = [];
        merged.forEach((entry) => {
            const key = typeof entry?.uri === 'string' ? entry.uri : JSON.stringify(entry);
            if (key && !seen.has(key)) {
                seen.add(key);
                deduped.push(entry);
            }
        });
        return deduped;
    }, [data?.media, data?.images]);

    const [mediaIndex, setMediaIndex] = useState(0);
    const [mediaSize, setMediaSize] = useState(0);
    const [mediaLoadedCount, setMediaLoadedCount] = useState(0);
    const [contentReady, setContentReady] = useState(mediaList.length === 0);
    const [isOptionsSheetVisible, setOptionsSheetVisible] = useState(false);
    const optionsSheetAnim = useRef(new Animated.Value(0)).current;
    const [isReportOptionsVisible, setReportOptionsVisible] = useState(false);
    const reportOptionsAnim = useRef(new Animated.Value(0)).current;
    const [pendingDeletePid, setPendingDeletePid] = useState(null);
    const [videoPauseState, setVideoPauseState] = useState({});
    const [internalVideoMuteState, setInternalVideoMuteState] = useState(true);
    const [videoDurations, setVideoDurations] = useState({});
    const [videoProgress, setVideoProgress] = useState({});
    const [videoControlsVisible, setVideoControlsVisible] = useState({});
    const videoRefs = useRef({});
    const scrubbingStateRef = useRef(null);
    const videoControlsHideTimeoutsRef = useRef({});
    const videoControlsOpacityRef = useRef({});
    const { openReportSheet, reportSheetNode } = useReportContentSheet();
    const isUsingExternalMute = typeof externalAreVideosMuted === "boolean";
    const resolvedAreVideosMuted = isUsingExternalMute ? externalAreVideosMuted : internalVideoMuteState;
    const allowMediaPlayback = shouldPlayMedia !== false;

    const mediaFingerprint = useMemo(() => {
        if (mediaList.length === 0) return "empty";
        return mediaList.map(mediaSignatureFor).join("|");
    }, [mediaList]);

    const previousMediaFingerprintRef = useRef(mediaFingerprint);

    const postPid = useMemo(() => {
        const candidate = data?.pid ?? data?.id ?? null;
        if (candidate === undefined || candidate === null) return "";
        const str = String(candidate).trim();
        return str;
    }, [data?.pid, data?.id]);

    useEffect(() => {
        if (previousMediaFingerprintRef.current === mediaFingerprint) return;
        previousMediaFingerprintRef.current = mediaFingerprint;

        if (mediaList.length === 0) {
            setContentReady(true);
            setMediaLoadedCount(0);
            return;
        }
        setContentReady(false);
        setMediaLoadedCount(0);
        setVideoPauseState({});
        if (!isUsingExternalMute) {
            setInternalVideoMuteState(true);
        }
        setVideoDurations({});
        setVideoProgress({});
        setVideoControlsVisible({});
        videoControlsOpacityRef.current = {};
    }, [isUsingExternalMute, mediaFingerprint, mediaList.length]);

    useEffect(() => {
        if (contentReady) return;
        if (mediaList.length === 0) {
            setContentReady(true);
            return;
        }
        if (mediaLoadedCount >= mediaList.length) {
            setContentReady(true);
        }
    }, [contentReady, mediaLoadedCount, mediaList.length]);

    useEffect(() => {
        if (contentReady || mediaList.length === 0) return () => { };
        const timeout = setTimeout(() => setContentReady(true), 3000);
        return () => clearTimeout(timeout);
    }, [contentReady, mediaList.length]);

    useEffect(() => () => {
        Object.values(videoControlsHideTimeoutsRef.current).forEach((id) => {
            if (id) clearTimeout(id);
        });
        videoControlsHideTimeoutsRef.current = {};
    }, []);

    useEffect(() => {
        const current = mediaList?.[mediaIndex];
        if (!current || current.type !== 'video') return;
        if (videoPauseState[mediaIndex]) {
            setControlsVisibility(mediaIndex, true, false);
        } else {
            setControlsVisibility(mediaIndex, true, true);
        }
        return () => {
            setControlsVisibility(mediaIndex, false);
        };
    }, [mediaIndex, mediaList, setControlsVisibility, videoPauseState]);

    const handleMediaLoad = useCallback(() => {
        setMediaLoadedCount((count) => count + 1);
    }, []);

    useEffect(() => {
        if (mediaIndex >= mediaList.length) {
            setMediaIndex(0);
        }
    }, [mediaList.length, mediaIndex]);

    const baseMediaAspectRatio = useMemo(() => {
        const first = mediaList?.[0];
        const ratio = Number(first?.aspectRatio);
        if (Number.isFinite(ratio) && ratio > 0) return ratio;
        return 1;
    }, [mediaList]);
    const resolvedMediaHeight = useMemo(() => (
        mediaSize > 0 ? mediaSize / baseMediaAspectRatio : 0
    ), [baseMediaAspectRatio, mediaSize]);

    const handleMediaLayout = useCallback((event) => {
        const width = event?.nativeEvent?.layout?.width;
        if (!width) return;
        if (Math.abs(width - mediaSize) < 0.5) return;
        setMediaSize(width);
    }, [mediaSize]);

    const handleMediaScroll = useCallback((event) => {
        if (!mediaSize) return;
        const offsetX = event?.nativeEvent?.contentOffset?.x ?? 0;
        const nextIndex = Math.round(offsetX / mediaSize);
        if (Number.isFinite(nextIndex)) setMediaIndex(nextIndex);
    }, [mediaSize]);

    const getControlsOpacityValue = useCallback((idx) => {
        if (!videoControlsOpacityRef.current[idx]) {
            videoControlsOpacityRef.current[idx] = new Animated.Value(0);
        }
        return videoControlsOpacityRef.current[idx];
    }, []);

    const clearControlsHideTimeout = useCallback((idx) => {
        const existing = videoControlsHideTimeoutsRef.current[idx];
        if (existing) {
            clearTimeout(existing);
            delete videoControlsHideTimeoutsRef.current[idx];
        }
    }, []);

    const setControlsVisibility = useCallback((idx, visible, autoHide = false) => {
        setVideoControlsVisible((prev) => {
            const alreadyVisible = Boolean(prev[idx]);
            if (visible) {
                if (alreadyVisible) return prev;
                return { ...prev, [idx]: true };
            }
            if (!alreadyVisible) return prev;
            const next = { ...prev };
            delete next[idx];
            return next;
        });
        clearControlsHideTimeout(idx);
        const anim = getControlsOpacityValue(idx);
        Animated.timing(anim, {
            toValue: visible ? 1 : 0,
            duration: 180,
            useNativeDriver: true,
        }).start(() => {
            if (!visible) {
                anim.setValue(0);
            }
        });
        if (visible && autoHide) {
            videoControlsHideTimeoutsRef.current[idx] = setTimeout(() => {
                setVideoControlsVisible((prev) => {
                    if (!prev[idx]) return prev;
                    const next = { ...prev };
                    delete next[idx];
                    return next;
                });
                delete videoControlsHideTimeoutsRef.current[idx];
                const hideAnim = getControlsOpacityValue(idx);
                Animated.timing(hideAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }).start(() => hideAnim.setValue(0));
            }, 2000);
        }
    }, [clearControlsHideTimeout, getControlsOpacityValue]);

    const toggleVideoPlayback = useCallback((idx) => {
        setVideoPauseState((prev) => {
            const wasPaused = Boolean(prev[idx]);
            const next = { ...prev };
            if (wasPaused) {
                delete next[idx];
                setControlsVisibility(idx, true, true);
            } else {
                next[idx] = true;
                setControlsVisibility(idx, true, false);
            }
            return next;
        });
    }, [setControlsVisibility]);

    const toggleVideoMute = useCallback(() => {
        if (typeof onToggleVideosMuted === "function") {
            onToggleVideosMuted();
            return;
        }
        setInternalVideoMuteState((prev) => !prev);
    }, [onToggleVideosMuted]);

    const assignVideoRef = useCallback((idx, ref) => {
        if (ref) {
            videoRefs.current[idx] = ref;
        } else {
            delete videoRefs.current[idx];
        }
    }, []);

    const handleVideoLoad = useCallback((idx, meta) => {
        handleMediaLoad();
        const duration = Number(meta?.duration) || 0;
        if (duration > 0) {
            setVideoDurations((prev) => (
                prev[idx] === duration ? prev : { ...prev, [idx]: duration }
            ));
        }
    }, [handleMediaLoad]);

    const handleVideoProgress = useCallback((idx, progressEvent) => {
        if (scrubbingStateRef.current?.index === idx) return;
        const currentTime = Number(progressEvent?.currentTime) || 0;
        setVideoProgress((prev) => {
            const previousValue = prev[idx] ?? 0;
            if (Math.abs(previousValue - currentTime) < 0.05) return prev;
            return { ...prev, [idx]: currentTime };
        });
    }, []);

    const beginScrub = useCallback((idx) => {
        const wasPlaying = !videoPauseState[idx] && mediaIndex === idx;
        scrubbingStateRef.current = { index: idx, resumePlayback: wasPlaying };
        if (mediaIndex === idx) {
            setVideoPauseState((prev) => ({ ...prev, [idx]: true }));
        }
        setControlsVisibility(idx, true, false);
    }, [mediaIndex, setControlsVisibility, videoPauseState]);

    const handleScrubChange = useCallback((idx, value) => {
        setVideoProgress((prev) => {
            const next = { ...prev, [idx]: value };
            return next;
        });
        const seekValue = Number(value);
        if (Number.isFinite(seekValue)) {
            videoRefs.current[idx]?.seek?.(seekValue, 0);
        }
    }, []);

    const finishScrub = useCallback((idx, value) => {
        const shouldResume = scrubbingStateRef.current?.index === idx
            ? scrubbingStateRef.current?.resumePlayback
            : false;
        scrubbingStateRef.current = null;
        if (Number.isFinite(value)) {
            videoRefs.current[idx]?.seek?.(value, 0);
            setVideoProgress((prev) => ({ ...prev, [idx]: value }));
        }
        if (shouldResume) {
            setVideoPauseState((prev) => {
                const next = { ...prev };
                delete next[idx];
                return next;
            });
            setControlsVisibility(idx, true, true);
        } else {
            setControlsVisibility(idx, true, false);
        }
    }, [setControlsVisibility]);

    const handleCheer = useCallback(() => {
        try { hapticStrong(); } catch { }
        fireConfetti();
        sendCheerEvent();
    }, [fireConfetti, sendCheerEvent]);

    const openReportOptions = useCallback(() => {
        if (isViewerOwner) return;
        setReportOptionsVisible(true);
    }, [isViewerOwner]);

    const closeReportOptions = useCallback((afterClose) => {
        if (!isReportOptionsVisible) {
            if (typeof afterClose === 'function') afterClose();
            return;
        }
        Animated.timing(reportOptionsAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setReportOptionsVisible(false);
            if (typeof afterClose === 'function') afterClose();
        });
    }, [isReportOptionsVisible, reportOptionsAnim]);

    const handleReportOptionsBackdrop = useCallback(() => {
        closeReportOptions();
    }, [closeReportOptions]);

    const handleReportPost = useCallback(() => {
        try { hapticStrong(); } catch { }
        const fallbackId = data?.id ? String(data.id).trim() : "";
        const targetId = postPid || fallbackId || `post-${Date.now()}`;
        openReportSheet({
            targetType: "post",
            targetId,
            ownerUid: postOwnerUid,
            ownerHandle: reportHandle,
            source: "feed-post",
            metadata: {
                caption,
                workoutTitle: workoutName,
            },
        });
    }, [caption, data?.id, openReportSheet, postOwnerUid, postPid, reportHandle, workoutName]);

    const handleSelectReport = useCallback(() => {
        closeReportOptions(() => {
            handleReportPost();
        });
    }, [closeReportOptions, handleReportPost]);

    const getAspectRatioForEntry = useCallback((entry) => {
        const ratio = Number(entry?.aspectRatio);
        if (Number.isFinite(ratio) && ratio > 0) return ratio;
        return baseMediaAspectRatio || 1;
    }, [baseMediaAspectRatio]);

    const renderMediaItem = useCallback(({ item, index: slideIndex }) => {
        const mediaWidth = mediaSize || SCREEN_WIDTH;
        const aspectRatio = getAspectRatioForEntry(item);
        const slideHeight = mediaWidth > 0 ? mediaWidth / aspectRatio : mediaWidth;
        const containerStyle = [
            styles.mediaSlide,
            { width: mediaWidth, height: slideHeight },
        ];
        if (!item?.uri) {
            return <View style={containerStyle} />;
        }
        if (item.type === "video") {
            const source = typeof item.uri === "string" ? { uri: item.uri } : item.uri;
            const isActiveSlide = mediaIndex === slideIndex;
            const isManuallyPaused = Boolean(videoPauseState[slideIndex]);
            const paused = !allowMediaPlayback || !isActiveSlide || isManuallyPaused;
            const fallbackDuration = Number(item?.duration) || 0;
            const videoDuration = videoDurations[slideIndex] || fallbackDuration;
            const sliderValue = Math.min(
                videoDuration || Number.MAX_SAFE_INTEGER,
                videoProgress[slideIndex] ?? 0
            );
            const shouldShowVideoControls = paused || videoControlsVisible[slideIndex];
            return (
                <Pressable
                    style={containerStyle}
                    onPress={() => toggleVideoPlayback(slideIndex)}
                >
                    <CroppedVideo
                        ref={(ref) => assignVideoRef(slideIndex, ref)}
                        source={source}
                        style={styles.mediaContent}
                        cropRect={item.cropRect}
                        resizeMode="cover"
                        paused={paused}
                        repeat
                        muted={resolvedAreVideosMuted}
                        onLoad={(meta) => handleVideoLoad(slideIndex, meta)}
                        onProgress={(event) => handleVideoProgress(slideIndex, event)}
                    />
                    {paused && (
                        <View style={styles.videoPlayIconWrap} pointerEvents="none">
                            <FontAwesome6
                                name="circle-play"
                                size={scaleSize(50)}
                                color="#fff"
                            />
                        </View>
                    )}
                    {videoDuration > 0 && (
                        <Animated.View
                            style={[styles.videoSliderOverlay, { opacity: getControlsOpacityValue(slideIndex) }]}
                            pointerEvents={shouldShowVideoControls ? 'auto' : 'none'}
                        >
                            <View style={styles.videoTimeRow} pointerEvents="none">
                                <Text style={styles.videoTimeText}>{formatClockTime(sliderValue)}</Text>
                                <Text style={styles.videoTimeText}>{formatClockTime(videoDuration)}</Text>
                            </View>
                            <Slider
                                style={styles.videoSlider}
                                minimumValue={0}
                                maximumValue={videoDuration}
                                value={sliderValue}
                                minimumTrackTintColor={theme.primary}
                                maximumTrackTintColor="rgba(255,255,255,0.25)"
                                thumbTintColor="#fff"
                                onSlidingStart={() => beginScrub(slideIndex)}
                                onValueChange={(value) => handleScrubChange(slideIndex, value)}
                                onSlidingComplete={(value) => finishScrub(slideIndex, value)}
                            />
                        </Animated.View>
                    )}
                    <View style={styles.videoControlsOverlay} pointerEvents="box-none">
                        <Pressable
                            style={styles.videoMuteButton}
                            hitSlop={8}
                            onPress={(event) => {
                                event?.stopPropagation?.();
                                toggleVideoMute();
                            }}
                        >
                            <MaterialCommunityIcons
                                name={resolvedAreVideosMuted ? "volume-off" : "volume-high"}
                                size={scaleSize(18)}
                                color="#fff"
                            />
                        </Pressable>
                    </View>
                </Pressable>
            );
        }
        return (
            <View style={containerStyle}>
                <FastImage
                    source={{
                        uri: item.uri,
                        priority: FastImage.priority.normal,
                        cache: FastImage.cacheControl.immutable,
                    }}
                    style={styles.mediaContent}
                    resizeMode={FastImage.resizeMode.cover}
                    onLoad={handleMediaLoad}
                />
            </View>
        );
    }, [allowMediaPlayback, assignVideoRef, beginScrub, finishScrub, getAspectRatioForEntry, handleScrubChange, handleVideoLoad, handleVideoProgress, mediaIndex, mediaSize, resolvedAreVideosMuted, toggleVideoMute, toggleVideoPlayback, videoControlsVisible, videoDurations, videoPauseState, videoProgress]);

    const pfpUri = usePfp(
        data?.uid ? String(data.uid) : "",
        data?.pfpVersion ?? 0,
        resolvePhotoURL(data, "")
    );

    const likeCount = useMemo(() => (
        Array.isArray(data?.likes)
            ? data.likes.length
            : toNumber(data?.likeCount)
    ), [data?.likes, data?.likeCount]);

    const commentCount = (() => {
        const count = Array.isArray(data?.comments)
            ? data.comments.length
            : toNumber(data?.commentCount);
        return Math.max(0, count - 1);
    })();

    const {
        isLiked,
        assignButtonRef,
        handlePressLikeButton,
        pressComment,
        handlePressSaveButton,
        isSaved,
    } = usePostFooterInteractions({
        data,
        onPressCommentButton: () => onPressComments?.(index, data),
        onPressShareButton: () => onPressShare?.(index, data),
    });

    const normalizedLikes = useMemo(() => {
        if (!Array.isArray(data?.likes)) return [];
        const seen = new Set();

        return data.likes
            .map((entry) => {
                if (!entry) return null;
                if (typeof entry === "string" || typeof entry === "number") {
                    const uid = String(entry).trim();
                    if (!uid) return null;
                    return { uid };
                }

                const uid = entry?.uid ?? entry?.id ?? null;
                const handle = entry?.handle ?? entry?.username ?? entry?.tag ?? "";
                const name = entry?.name ?? entry?.displayName ?? "";
                const avatar = resolvePhotoURL(entry, entry?.avatar || "");
                const versionSource =
                    entry?.pfpVersion ??
                    entry?.pfpVer ??
                    entry?.imageVersion ??
                    entry?.image_version ??
                    entry?.pfp_version ??
                    entry?.avatarVersion ??
                    entry?.avatar_version ??
                    entry?.profileImageVersion ??
                    entry?.profile_image_version ??
                    entry?.version ??
                    entry?.ver ??
                    0;
                const pfpVersion = Math.max(0, toNumber(versionSource, 0));

                return {
                    uid: uid ? String(uid) : null,
                    handle: typeof handle === "string" ? handle : "",
                    name: typeof name === "string" ? name : "",
                    avatar,
                    pfpVersion,
                };
            })
            .filter((entry) => {
                if (!entry) return false;
                if (!entry.uid && !entry.handle && !entry.name) return false;
                const key = entry.uid || entry.handle?.toLowerCase() || entry.name?.toLowerCase();
                if (!key) return true;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }, [data?.likes]);

    const firstLiker = normalizedLikes[0] || null;

    const formattedFirstHandle = useMemo(() => {
        if (!firstLiker) return "";
        const handle = (firstLiker.handle || "").trim();
        if (handle) return `${handle}`;
        const name = (firstLiker.name || "").trim();
        if (name) return name;
        if (firstLiker.uid) return `User ${firstLiker.uid.slice(-4)}`;
        return "someone";
    }, [firstLiker]);

    const likeMessage = useMemo(() => {
        if (likeCount <= 0) return "No likes yet — be the first!";
        if (likeCount === 1) {
            if (formattedFirstHandle) return `Liked by ${formattedFirstHandle}`;
            return "Liked by someone";
        }
        if (formattedFirstHandle) {
            const others = Math.max(0, likeCount - 1);
            return `Liked by ${formattedFirstHandle} and ${formatNumber(others)} more`;
        }
        return `Liked by ${formatNumber(likeCount)} people`;
    }, [likeCount, formattedFirstHandle]);

    const firstLikerUid = firstLiker?.uid ? String(firstLiker.uid) : "";
    const firstLikerAvatarFallback = firstLiker?.avatar || null;
    const firstLikerVersion = firstLiker ? Math.max(0, toNumber(firstLiker.pfpVersion ?? 0)) : 0;
    const firstLikerAvatar = usePfp(firstLikerUid, firstLikerVersion, firstLikerAvatarFallback) || firstLikerAvatarFallback;
    const firstLikerInitials = useMemo(() => {
        if (!firstLiker) return "";
        const source = (firstLiker.name || firstLiker.handle || "").replace(/^@/, "");
        return initialsFrom(source);
    }, [firstLiker]);

    const getMillis = (value) => {
        if (value == null) return null;
        if (typeof value === "number") return Number.isFinite(value) ? value : null;
        if (typeof value === "object") {
            if (typeof value.toMillis === "function") {
                try { return value.toMillis(); } catch { return null; }
            }
            const seconds = Number(value.seconds ?? value._seconds);
            if (Number.isFinite(seconds)) {
                const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
                const extra = Number.isFinite(nanos) ? Math.floor(nanos / 1e6) : 0;
                return seconds * 1000 + extra;
            }
        }
        const parsed = new Date(value).getTime();
        return Number.isFinite(parsed) ? parsed : null;
    };

    const liveDurationRef = useRef(0);
    const [liveDurationTick, setLiveDurationTick] = useState(0);

    useEffect(() => {
        if (!isLivePost) return undefined;
        const startedAt = getMillis(workout?.startedAt ?? workout?.createdAt ?? workout?.created);
        if (!startedAt) return undefined;

        const DRIFT_MS = 500; // keep feed timer in sync with ActiveWorkoutModal
        const update = () => {
            const elapsed = Math.max(0, Date.now() - startedAt - DRIFT_MS);
            liveDurationRef.current = elapsed;
            setLiveDurationTick(Date.now());
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [isLivePost, workout?.startedAt, workout?.createdAt, workout?.created]);

    const durationLabel = (() => {
        if (!isLivePost) return formatDuration(workout?.duration);
        const base = Math.max(0, Number(workout?.duration) || 0);
        const elapsed = Math.max(base, liveDurationRef.current || 0);
        return formatDuration(elapsed);
    })();
    const volumeLabel = formatNumber(workout?.volume);
    const caloriesLabel = (() => {
        const raw = typeof workout?.calories === "number" ? workout.calories : Number(workout?.calories);
        return Number.isFinite(raw) ? formatNumber(raw) : "--";
    })();
    const recordsLabel = formatNumber(workout?.PBs ?? workout?.pbs ?? 0);

    const displayName = useMemo(() => {
        const rawHandle = (data?.handle || "user").trim();
        if (!rawHandle) return "user";
        if (isLivePost) {
            return rawHandle.replace(/^@+/, "");
        }
        return rawHandle;
    }, [data?.handle, isLivePost]);
    const reportHandle = useMemo(() => {
        const source = data?.handle || displayName || "";
        return String(source || "").replace(/^@+/, "");
    }, [data?.handle, displayName]);

    const rankTierKey = useMemo(() => {
        const candidates = [
            data?.rankTier,
            data?.currentRank?.tier,
            data?.currentRank?.rankTier,
            data?.rank?.tier,
            data?.rank?.rankTier,
        ];
        for (const val of candidates) {
            if (typeof val === "string" && val.trim()) return val.trim().toLowerCase();
        }
        return null;
    }, [data?.rank?.rankTier, data?.rank?.tier, data?.rankTier, data?.currentRank?.tier, data?.currentRank?.rankTier]);

    const rankTheme = useMemo(() => {
        const key = rankTierKey || "gold";
        return RANK_TIER_THEMES[key] || RANK_TIER_THEMES.gold;
    }, [rankTierKey]);

    const handleColor = useMemo(() => {
        const bronzeAccent =
            rankTierKey === "bronze"
                ? (Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[1] : "#b94f1f")
                : null;
        const candidates = [
            bronzeAccent,
            Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[1] : null,
            Array.isArray(rankTheme?.gradientColors) ? rankTheme.gradientColors[2] : null,
            rankTheme?.borderColor,
            rankTheme?.titleSecondaryColor,
        ];
        for (const c of candidates) {
            if (typeof c === "string" && c.trim()) return c;
        }
        return theme.textPrimary;
    }, [rankTierKey, rankTheme]);

    const likeColor = isLiked ? "#FE5555" : theme.textPrimary;
    const keyExtractor = useCallback((item, idx) => `${item?.uri || 'media'}-${idx}`, []);

    const [viewerUid, setViewerUid] = useState(() => getViewerUid());
    useEffect(() => {
        return subscribeUserData(() => {
            setViewerUid((prev) => {
                const next = getViewerUid();
                return prev === next ? prev : next;
            });
        });
    }, []);

    const postOwnerUid = useMemo(() => {
        const candidates = [
            data?.uid,
            data?.creatorUid,
            data?.creatorUID,
            data?.ownerUid,
            data?.userUid,
        ];
        for (const value of candidates) {
            if (value === undefined || value === null) continue;
            const str = String(value).trim();
            if (str) return str;
        }
        return '';
    }, [data?.uid, data?.creatorUid, data?.creatorUID, data?.ownerUid, data?.userUid]);

    const fallbackVerified = useMemo(() => (
        Boolean(
            data?.isVerified ||
            data?.verified ||
            data?.creator?.isVerified ||
            data?.creator?.verified ||
            data?.owner?.isVerified ||
            data?.owner?.verified ||
            data?.author?.isVerified ||
            data?.author?.verified ||
            data?.user?.isVerified ||
            data?.user?.verified
        )
    ), [
        data?.isVerified,
        data?.verified,
        data?.creator?.isVerified,
        data?.creator?.verified,
        data?.owner?.isVerified,
        data?.owner?.verified,
        data?.author?.isVerified,
        data?.author?.verified,
        data?.user?.isVerified,
        data?.user?.verified,
    ]);

    const isPostVerified = useUserVerified(postOwnerUid, fallbackVerified);

    const isViewerOwner = viewerUid && postOwnerUid && viewerUid === postOwnerUid;
    const showOverflowActions = !isLivePost;

    const workoutDeleteIdentifier = useMemo(() => {
        if (!workout || typeof workout !== "object") return null;
        const widCandidates = [
            workout?.wid,
            workout?.id,
            workout?.workoutId,
            workout?.pid,
            workout?.postPid,
        ];
        let wid = "";
        for (const value of widCandidates) {
            if (value === undefined || value === null) continue;
            const str = String(value).trim();
            if (str) {
                wid = str;
                break;
            }
        }

        const createdCandidates = [
            workout?.created,
            workout?.createdAt,
            workout?.finishedAt,
            workout?.completedAt,
            workout?.startedAt,
        ];
        let created = 0;
        for (const candidate of createdCandidates) {
            const ms = toMillis(candidate);
            if (ms) {
                created = ms;
                break;
            }
        }

        if (!wid && !created) return null;
        return { wid: wid || null, created: created || 0 };
    }, [workout]);

    const canAutoDeleteWorkout = useMemo(() => Boolean(isViewerOwner && workoutDeleteIdentifier), [isViewerOwner, workoutDeleteIdentifier]);
    const canEditWorkoutOption = useMemo(
        () => Boolean(isViewerOwner && workout && typeof onPressEditWorkout === "function"),
        [isViewerOwner, workout, onPressEditWorkout]
    );
    const workedSegments = useMemo(() => {
        if (!workout || !Array.isArray(workout.exercises)) return [];
        const set = new Set();
        workout.exercises.forEach((ex) => {
            const groupRaw = ex?.muscleGroup || ex?.muscle;
            if (typeof groupRaw !== "string") return;
            const key = groupRaw.trim().toLowerCase();
            if (!key) return;
            if (key.includes("shoulder")) MUSCLE_SEGMENTS.shoulders.forEach((s) => set.add(s));
            else if (key === "chest") MUSCLE_SEGMENTS.chest.forEach((s) => set.add(s));
            else if (key.includes("arm") || key.includes("bicep") || key.includes("tricep") || key.includes("forearm"))
                MUSCLE_SEGMENTS.arms.forEach((s) => set.add(s));
            else if (key.includes("leg") || key.includes("quad") || key.includes("calf") || key.includes("hamstring"))
                MUSCLE_SEGMENTS.legs.forEach((s) => set.add(s));
            else if (key.includes("back") || key.includes("trap")) MUSCLE_SEGMENTS.back.forEach((s) => set.add(s));
            else if (key.includes("ab") || key.includes("core") || key.includes("oblique")) MUSCLE_SEGMENTS.abs.forEach((s) => set.add(s));
        });
        return Array.from(set);
    }, [workout]);
    const muscleFills = useMemo(() => {
        const map = {};
        workedSegments.forEach((seg) => {
            map[seg] = MUSCLE_HIGHLIGHT;
        });
        return map;
    }, [workedSegments]);
    const deleteOptionLabel = canAutoDeleteWorkout ? "Delete Post & Workout" : "Delete Post";
    const deleteConfirmTitle = canAutoDeleteWorkout ? "Delete post & workout?" : "Delete post?";
    const deleteConfirmMessage = canAutoDeleteWorkout
        ? "This will delete the post and remove the workout from your history and stats."
        : "This will permanently remove the post and its comments.";

    useEffect(() => {
        if (!isViewerOwner && isOptionsSheetVisible) {
            optionsSheetAnim.stopAnimation();
            optionsSheetAnim.setValue(0);
            setOptionsSheetVisible(false);
        }
    }, [isViewerOwner, isOptionsSheetVisible, optionsSheetAnim]);

    useEffect(() => {
        if (!isOptionsSheetVisible) return;
        optionsSheetAnim.stopAnimation();
        optionsSheetAnim.setValue(0);
        requestAnimationFrame(() => {
            Animated.timing(optionsSheetAnim, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }).start();
        });
    }, [isOptionsSheetVisible, optionsSheetAnim]);

    useEffect(() => () => {
        optionsSheetAnim.stopAnimation();
    }, [optionsSheetAnim]);

    useEffect(() => {
        if (!isReportOptionsVisible) return;
        reportOptionsAnim.stopAnimation();
        reportOptionsAnim.setValue(0);
        requestAnimationFrame(() => {
            Animated.timing(reportOptionsAnim, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }).start();
        });
    }, [isReportOptionsVisible, reportOptionsAnim]);

    useEffect(() => () => {
        reportOptionsAnim.stopAnimation();
    }, [reportOptionsAnim]);

    const handlePressWorkout = useCallback(() => {
        if (!workout) return;
        try { hapticStrong(); } catch { }
        onPressWorkout?.(index, data);
    }, [workout, onPressWorkout, index, data]);

    const openOptionsSheet = useCallback(() => {
        if (!isViewerOwner) return;
        setOptionsSheetVisible(true);
    }, [isViewerOwner]);

    const closeOptionsSheet = useCallback((afterClose) => {
        if (!isOptionsSheetVisible) {
            if (typeof afterClose === "function") afterClose();
            return;
        }
        Animated.timing(optionsSheetAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setOptionsSheetVisible(false);
            if (typeof afterClose === "function") {
                afterClose();
            }
        });
    }, [isOptionsSheetVisible, optionsSheetAnim]);

    const runDefaultDelete = useCallback(() => {
        if (!isViewerOwner) return;
        if (!postPid) return;
        if (pendingDeletePid) return;

        const targetUid = postOwnerUid || viewerUid;
        if (!targetUid) return;

        const performDelete = () => {
            if (pendingDeletePid) return;
            setPendingDeletePid(postPid);
            (async () => {
                let postError = null;
                let workoutError = null;
                let workoutResult = null;

                if (canAutoDeleteWorkout && workoutDeleteIdentifier) {
                    try {
                        const res = await deleteCompletedWorkout(targetUid, workoutDeleteIdentifier);
                        workoutResult = res;
                        if (res?.ok && global?.userData && String(global.userData.uid) === targetUid) {
                            try {
                                global.userData.completedWorkouts = Array.isArray(res.completedWorkouts) ? res.completedWorkouts : [];
                                global.userData.statsExercises = res.statsExercises || {};
                                global.userData.statsHexagon = res.statsHexagon || {};
                                global.userData.statsHexagonMeta = res.statsHexagonMeta || {};
                                global.userData.statsTotalVolume = res.statsTotalVolume || 0;
                                global.userData.statsTotalHours = res.statsTotalHours || 0;
                                global.userData.statsTotalWorkouts = res.statsTotalWorkouts || 0;
                                global.userData.workoutsByDate = res.workoutsByDate || {};
                                emitHexagonUpdate();
                                emitUserDataUpdate();
                            } catch (error) {
                                console.warn("SimpleFeedPost: failed to update cached workout stats after deletion", error);
                            }
                        }
                        invalidateFeedCacheForUser(targetUid);
                    } catch (error) {
                        workoutError = error;
                        console.error("SimpleFeedPost: deleteCompletedWorkout failed", error);
                    }
                }

                try {
                    await deletePost(postPid, targetUid);
                    invalidateFeedCacheForUser(targetUid);
                    if (targetUid && global?.userData && String(global.userData.uid) === targetUid) {
                        try {
                            if (Array.isArray(global.userData.posts)) {
                                global.userData.posts = global.userData.posts
                                    .map((value) => (value == null ? value : String(value)))
                                    .filter((value) => value && value !== postPid);
                            }
                            if (typeof global.userData.postCount === "number") {
                                global.userData.postCount = Math.max(0, global.userData.postCount - 1);
                            }
                            emitUserDataUpdate();
                        } catch (error) {
                            console.warn("SimpleFeedPost: failed to update cached global.userData posts", error);
                        }
                    }
                } catch (error) {
                    postError = error;
                    console.error("SimpleFeedPost: deletePost failed", error);
                }

                if (postError) {
                    Alert.alert("Unable to delete post", "Please try again in a moment.");
                } else if (workoutError) {
                    Alert.alert(
                        "Workout removal incomplete",
                        "The post was deleted, but the workout is still in your history. Please retry from the workout details screen."
                    );
                }

                setPendingDeletePid((current) => (current === postPid ? null : current));
            })();
        };

        Alert.alert(
            deleteConfirmTitle,
            deleteConfirmMessage,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: canAutoDeleteWorkout ? "Delete Post & Workout" : "Delete",
                    style: "destructive",
                    onPress: () => {
                        if (pendingDeletePid) return;
                        performDelete();
                    },
                },
            ]
        );
    }, [isViewerOwner, postPid, pendingDeletePid, postOwnerUid, viewerUid, canAutoDeleteWorkout, deleteConfirmTitle, deleteConfirmMessage, workoutDeleteIdentifier]);

    const handleBackdropPress = useCallback(() => {
        closeOptionsSheet();
    }, [closeOptionsSheet]);

    const handlePressEditPost = useCallback(() => {
        closeOptionsSheet(() => onPressEditPost?.(index, data, { isClip: clipPost }));
    }, [closeOptionsSheet, onPressEditPost, index, data, clipPost]);

    const handlePressEditWorkout = useCallback(() => {
        if (!workout) return;
        closeOptionsSheet(() => onPressEditWorkout?.(index, data));
    }, [closeOptionsSheet, onPressEditWorkout, index, data, workout]);

    const handlePressDeletePost = useCallback(() => {
        closeOptionsSheet(() => {
            if (typeof onPressDeletePost === "function") {
                onPressDeletePost(index, data);
            } else {
                runDefaultDelete();
            }
        });
    }, [closeOptionsSheet, onPressDeletePost, index, data, runDefaultDelete]);

    const optionsBackdropOpacity = useMemo(() => (
        optionsSheetAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.45],
        })
    ), [optionsSheetAnim]);

    const optionsSheetTranslateY = useMemo(() => (
        optionsSheetAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [scaleSize(240), 0],
        })
    ), [optionsSheetAnim]);

    const reportOptionsBackdropOpacity = useMemo(() => (
        reportOptionsAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.45],
        })
    ), [reportOptionsAnim]);

    const reportOptionsTranslateY = useMemo(() => (
        reportOptionsAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [scaleSize(200), 0],
        })
    ), [reportOptionsAnim]);

    return (
        <View style={styles.wrapper}>
            <View style={[
                styles.card,
                isLivePost && styles.cardLive,
                !contentReady && styles.cardHidden,
            ]}>
                {isLivePost ? (
                    <View pointerEvents="none" style={styles.liveBackdrop} />
                ) : null}
                <View style={styles.sectionTop}>
                    <View style={styles.headerRow}>
                        <Pressable style={styles.avatarWrap} onPress={() => onPressProfile?.(index, data)}>
                            {pfpUri ? (
                                <FastImage
                                    source={{
                                        uri: pfpUri,
                                        priority: FastImage.priority.high,
                                        cache: FastImage.cacheControl.immutable,
                                    }}
                                    style={styles.avatar}
                                    resizeMode={FastImage.resizeMode.cover}
                                />
                            ) : (
                                <View style={[styles.avatar, styles.avatarFallback]}>
                                    <Text style={styles.avatarInitials}>{initialsFrom(displayName)}</Text>
                                </View>
                            )}
                        </Pressable>

                        <View style={styles.headerTextCol}>
                            <View style={styles.nameRow}>
                                <Pressable
                                    onPress={() => onPressProfile?.(index, data)}
                                    style={styles.namePressable}
                                >
                                    <VerifiedHandle
                                        handle={displayName}
                                        isVerified={isPostVerified}
                                        textStyle={[styles.nameText, { color: handleColor }]}
                                        iconSize={scaleSize(15)}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        containerStyle={styles.nameHandle}
                                    />
                                </Pressable>
                            </View>
                            {!!timestamp && (
                                <Text
                                    style={isLivePost ? styles.liveTimestampText : styles.timestampText}
                                    numberOfLines={1}
                                >
                                    {timestamp}
                                </Text>
                            )}
                        </View>

                        <View style={styles.headerActions}>
                            {isLivePost && !isViewerOwner ? (
                                <Pressable
                                    style={styles.cheerButton}
                                    onPress={handleCheer}
                                    hitSlop={{ top: scaleSize(6), bottom: scaleSize(6), left: scaleSize(6), right: scaleSize(6) }}
                                >
                                    <Text style={styles.cheerButtonText}>Cheer</Text>
                                </Pressable>
                            ) : null}
                            {showOverflowActions ? (
                                isViewerOwner ? (
                                    <Pressable
                                        style={styles.moreButton}
                                        onPress={openOptionsSheet}
                                        hitSlop={{ top: scaleSize(6), bottom: scaleSize(6), left: scaleSize(6), right: scaleSize(6) }}
                                    >
                                        <MaterialCommunityIcons name="dots-vertical" size={scaleSize(20)} color={theme.textPrimary} />
                                    </Pressable>
                                ) : (
                                    <Pressable
                                        style={styles.moreButton}
                                        onPress={openReportOptions}
                                        hitSlop={{ top: scaleSize(6), bottom: scaleSize(6), left: scaleSize(6), right: scaleSize(6) }}
                                    >
                                        <MaterialCommunityIcons name="dots-vertical" size={scaleSize(20)} color={theme.textPrimary} />
                                    </Pressable>
                                )
                            ) : null}
                        </View>
                    </View>

                {workout ? (
                    <Pressable onPress={handlePressWorkout} style={styles.titleBlock} hitSlop={{ top: scaleSize(6), bottom: scaleSize(6) }}>
                        <Text style={[styles.titleText, isWorkoutTitle ? styles.workoutTitleText : null]} numberOfLines={2}>
                            {title}
                        </Text>
                            {shouldShowSubtitle ? (
                                <Text style={styles.captionText}>
                                    {caption}
                                </Text>
                            ) : null}
                        </Pressable>
                ) : (
                    <View style={styles.titleBlock}>
                        <Text style={[styles.titleText, isWorkoutTitle ? styles.workoutTitleText : null]} numberOfLines={2}>
                            {title}
                        </Text>
                            {shouldShowSubtitle ? (
                                <Text style={styles.captionText}>
                                    {caption}
                                </Text>
                            ) : null}
                        </View>
                    )}
                </View>

                {workout ? (
                    <Pressable
                        onPress={handlePressWorkout}
                        style={styles.metricsRow}
                    >
                            <View style={styles.metricsFigures}>
                                <View style={[styles.metricsFigureSlot, styles.metricsFigureFront]}>
                                    <HumanMuscleOutline
                                        color={BODYGRAPH_OUTLINE_COLOR}
                                        width="120%"
                                        height="120%"
                                        preserveAspectRatio="xMidYMid meet"
                                        fills={muscleFills}
                                        style={styles.metricsFigure}
                                    />
                                </View>
                                <View style={[styles.metricsFigureSlot, styles.metricsFigureBack]}>
                                    <HumanMuscleBackOutline
                                        color={BODYGRAPH_OUTLINE_COLOR}
                                        width="120%"
                                        height="120%"
                                        preserveAspectRatio="xMidYMid meet"
                                        fills={muscleFills}
                                        style={styles.metricsFigure}
                                    />
                                </View>
                            </View>

                            <View style={styles.metricsColumnStack}>
                                <View style={styles.metricTopStack}>
                                    <View style={styles.metricStackRow}>
                                        <View style={styles.metricLabelRow}>
                                            {isLivePost ? <View style={styles.metricLiveDot} /> : null}
                                            <Text style={[styles.metricLabel, styles.metricLabelRight]}>Duration</Text>
                                        </View>
                                        <Text style={[styles.metricValue, styles.metricValueRight]}>{durationLabel}</Text>
                                    </View>

                                    <View style={styles.metricStackRow}>
                                        <View style={styles.metricLabelRow}>
                                            {isLivePost ? <View style={styles.metricLiveDot} /> : null}
                                            <Text style={[styles.metricLabel, styles.metricLabelRight]}>Volume</Text>
                                        </View>
        <Text style={[styles.metricValue, styles.metricValueRight]}>{volumeLabel} {weightUnit}</Text>
                                    </View>

                                    <View style={styles.metricStackRow}>
                                        <View style={styles.metricLabelRow}>
                                            {isLivePost ? <View style={styles.metricLiveDot} /> : null}
                                            <Text style={[styles.metricLabel, styles.metricLabelRight]}>Calories</Text>
                                        </View>
                                        <Text style={[styles.metricValue, styles.metricValueRight]}>
                                            {caloriesLabel}
                                            {caloriesLabel !== "--" ? " kcal" : ""}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.metricStackRow, styles.metricStackRowLast]}>
                                    <View style={styles.metricLabelRow}>
                                        {isLivePost ? <View style={styles.metricLiveDot} /> : null}
                                        <Text style={[styles.metricLabel, styles.metricLabelRight]}>Records</Text>
                                    </View>
                                    <View style={styles.recordsValueRow}>
                                        <MaterialCommunityIcons name="medal" size={scaleSize(16)} color="#FFD700" />
                                        <Text style={[styles.metricValue, styles.metricValueText, styles.metricValueRight]}>{recordsLabel}</Text>
                                    </View>
                                </View>
                            </View>
                    </Pressable>
                ) : null}

                {workout && exerciseSummaries.length > 0 ? (
                    <Pressable style={styles.workoutSummaryBlock} onPress={handlePressWorkout}>
                        <View style={styles.workoutSummaryHeader}>
                            <Text style={[styles.workoutSummaryHeaderText, styles.workoutSummaryHeaderExercise]}>Exercise</Text>
                            <Text style={[styles.workoutSummaryHeaderText, styles.workoutSummaryHeaderBest]}>Best Set</Text>
                        </View>
                        {exerciseSummaries.map((row, idx) => {
                            const key = `${row.exercise || 'exercise'}-${idx}`;
                            const isLast = idx === exerciseSummaries.length - 1;
                            return (
                                <View
                                    style={[styles.workoutSummaryRow, !isLast && styles.workoutSummaryRowBorder]}
                                    key={key}
                                >
                                    <Text style={styles.workoutSummaryExercise} numberOfLines={1}>{row.exercise || 'Exercise'}</Text>
                                    <Text style={styles.workoutSummaryBest} numberOfLines={1}>{row.bestSet || '--'}</Text>
                                </View>
                            );
                        })}
                    </Pressable>
                ) : null}

                {mediaList.length > 0 ? (
                    <View
                        style={[styles.mediaContainer, mediaSize ? { height: resolvedMediaHeight } : null]}
                        onLayout={handleMediaLayout}
                    >
                        {mediaSize > 0 ? (
                            <FlatList
                                data={mediaList}
                                horizontal
                                pagingEnabled
                                snapToInterval={mediaSize}
                                decelerationRate="fast"
                                bounces={false}
                                alwaysBounceHorizontal={false}
                                overScrollMode="never"
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={keyExtractor}
                                renderItem={renderMediaItem}
                                style={styles.mediaList}
                                onScroll={handleMediaScroll}
                                onMomentumScrollEnd={handleMediaScroll}
                                scrollEventThrottle={16}
                                nestedScrollEnabled
                            />
                        ) : null}
                    </View>
                ) : null}

                {mediaList.length > 1 && (
                    <View style={styles.mediaIndicatorRow} pointerEvents="none">
                        {mediaList.map((_, idx) => (
                            <View
                                key={`${idx}-indicator`}
                                style={idx === mediaIndex ? styles.mediaDash : styles.mediaDot}
                            />
                        ))}
                    </View>
                )}

                <View style={[
                    styles.sectionBottom,
                    mediaList.length === 0 ? styles.sectionBottomDivider : null,
                ]}>
                    <View style={styles.actionsRow}>
                        <Pressable
                            onPress={() => onPressLikes?.(index, data)}
                            disabled={!onPressLikes}
                            style={({ pressed }) => [
                                styles.likesContainer,
                                pressed ? styles.likesContainerPressed : null,
                            ]}
                        >
                            {likeCount > 0 && (firstLikerAvatar || firstLikerInitials) ? (
                                <View style={styles.likesAvatarWrap}>
                                    {firstLikerAvatar ? (
                                        <FastImage
                                            source={{
                                                uri: firstLikerAvatar,
                                                priority: FastImage.priority.low,
                                                cache: FastImage.cacheControl.immutable,
                                            }}
                                            style={styles.likesAvatar}
                                            resizeMode={FastImage.resizeMode.cover}
                                        />
                                    ) : (
                                        <View style={[styles.likesAvatar, styles.likesAvatarFallback]}>
                                            <Text style={styles.likesAvatarInitials}>{firstLikerInitials}</Text>
                                        </View>
                                    )}
                                </View>
                            ) : null}
                            <Text style={styles.likesText} numberOfLines={1}>
                                {likeMessage}
                            </Text>
                        </Pressable>

                        <View style={styles.buttonsContainer}>
                            <AnimatedPressable
                                ref={(node) => assignButtonRef?.("like", node)}
                                style={styles.actionButton}
                                onPress={handlePressLikeButton}
                            >
                                <Heart size={scaleSize(20)} color={likeColor} variant="Bold" />
                                <Text style={styles.actionText}>{formatNumber(likeCount)}</Text>
                            </AnimatedPressable>

                            <AnimatedPressable
                                ref={(node) => assignButtonRef?.("comment", node)}
                                style={[styles.actionButton, styles.actionButtonMiddle]}
                                onPress={pressComment}
                            >
                                <Messages1 size={scaleSize(20)} color={theme.textPrimary} variant="Bold" />
                                <Text style={styles.actionText}>{formatNumber(commentCount)}</Text>
                            </AnimatedPressable>

                            {/* <AnimatedPressable
                                ref={(node) => assignButtonRef?.("save", node)}
                                style={styles.actionButton}
                                onPress={handlePressSaveButton}
                            >
                                <MaterialCommunityIcons
                                    name={isSaved ? "bookmark" : "bookmark-outline"}
                                    size={scaleSize(20)}
                                    color={theme.textPrimary}
                                />
                            </AnimatedPressable> */}
                        </View>
                    </View>
                </View>
            </View>
            {isLivePost && (confettiVisible || confettiTick > 0) ? (() => {
                const ConfettiCannon = loadConfettiModule();
                return ConfettiCannon ? (
                    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                        <ConfettiCannon
                            ref={confettiRef}
                            autoStart={false}
                            count={120}
                            origin={{ x: SCREEN_WIDTH / 2, y: -scaleSize(60) }}
                            fadeOut
                            explosionSpeed={220}
                            fallSpeed={1500}
                        />
                        {confettiTick > 0 && (
                            <ConfettiCannon
                                key={confettiTick}
                                count={120}
                                origin={{ x: SCREEN_WIDTH / 2, y: -scaleSize(60) }}
                                fadeOut
                                explosionSpeed={220}
                                fallSpeed={1500}
                            />
                        )}
                    </View>
                ) : null;
            })() : null}
            <Animated.View
                pointerEvents="none"
                style={[styles.highlightOverlay, { opacity: highlightOpacity }]}
            />
            {!contentReady ? (
                <View style={styles.loadingOverlay} pointerEvents="none">
                    <ActivityIndicator size="small" color="#93C5FD" />
                </View>
            ) : null}
            {isViewerOwner ? (
                <Modal
                    transparent
                    animationType="none"
                    visible={isOptionsSheetVisible}
                    onRequestClose={handleBackdropPress}
                >
                    <View style={styles.optionsModalRoot}>
                        <AnimatedPressable
                            style={[styles.optionsBackdrop, { opacity: optionsBackdropOpacity }]}
                            onPress={handleBackdropPress}
                        />
                        <Animated.View
                            style={[
                                styles.optionsSheet,
                                { transform: [{ translateY: optionsSheetTranslateY }] },
                            ]}
                        >
                            <Pressable
                                style={({ pressed }) => [
                                    styles.optionsItem,
                                    pressed ? styles.optionsItemPressed : null,
                                ]}
                                onPress={handlePressEditPost}
                            >
                                <View style={styles.optionsItemRow}>
                                    <View style={styles.optionsItemLeft}>
                                        <MaterialCommunityIcons
                                            name="pencil-outline"
                                            size={scaleSize(20)}
                                            color={theme.textPrimary}
                                            style={styles.optionsItemIcon}
                                        />
                                        <Text style={styles.optionsItemText}>{clipPost ? "Edit Clip" : "Edit Post"}</Text>
                                    </View>
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={scaleSize(20)}
                                        color="rgba(255,255,255,0.32)"
                                    />
                                </View>
                            </Pressable>
                            {canEditWorkoutOption ? (
                                <>
                                    <View style={styles.optionsDivider} />
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.optionsItem,
                                            pressed ? styles.optionsItemPressed : null,
                                        ]}
                                        onPress={handlePressEditWorkout}
                                    >
                                        <View style={styles.optionsItemRow}>
                                            <View style={styles.optionsItemLeft}>
                                                <OptionsWeightIcon
                                                    size={scaleSize(20)}
                                                    color={theme.textPrimary}
                                                    style={styles.optionsItemIcon}
                                                />
                                                <Text style={styles.optionsItemText}>Edit Workout</Text>
                                            </View>
                                            <MaterialCommunityIcons
                                                name="chevron-right"
                                                size={scaleSize(20)}
                                                color="rgba(255,255,255,0.32)"
                                            />
                                        </View>
                                    </Pressable>
                                </>
                            ) : null}
                            <View style={styles.optionsDivider} />
                            <Pressable
                                style={({ pressed }) => [
                                    styles.optionsItem,
                                    pressed ? styles.optionsItemPressed : null,
                                ]}
                                onPress={handlePressDeletePost}
                            >
                                <View style={styles.optionsItemRow}>
                                    <View style={styles.optionsItemLeft}>
                                        <MaterialCommunityIcons
                                            name="trash-can-outline"
                                            size={scaleSize(20)}
                                            color="#FF6B6B"
                                            style={styles.optionsItemIcon}
                                        />
                                        <Text style={[styles.optionsItemText, styles.optionsItemDeleteText]}>
                                            {deleteOptionLabel}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={scaleSize(20)}
                                        color="rgba(255,107,107,0.5)"
                                    />
                                </View>
                            </Pressable>
                        </Animated.View>
                    </View>
                </Modal>
            ) : (
                <Modal
                    transparent
                    animationType="none"
                    visible={isReportOptionsVisible}
                    onRequestClose={handleReportOptionsBackdrop}
                >
                    <View style={styles.optionsModalRoot}>
                        <AnimatedPressable
                            style={[styles.optionsBackdrop, { opacity: reportOptionsBackdropOpacity }]}
                            onPress={handleReportOptionsBackdrop}
                        />
                        <Animated.View
                            style={[styles.optionsSheet, { transform: [{ translateY: reportOptionsTranslateY }] }]}
                        >
                            <Pressable
                                style={({ pressed }) => [
                                    styles.optionsItem,
                                    pressed ? styles.optionsItemPressed : null,
                                ]}
                                onPress={handleSelectReport}
                            >
                                <View style={styles.optionsItemRow}>
                                    <View style={styles.optionsItemLeft}>
                                        <MaterialCommunityIcons
                                            name="flag-outline"
                                            size={scaleSize(20)}
                                            color="#EF4444"
                                            style={styles.optionsItemIcon}
                                        />
                                        <Text style={[styles.optionsItemText, styles.optionsItemDeleteText]}>Report</Text>
                                    </View>
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={scaleSize(20)}
                                        color="rgba(255,107,107,0.5)"
                                    />
                                </View>
                            </Pressable>
                            <View style={styles.optionsDivider} />
                            <Pressable
                                style={({ pressed }) => [
                                    styles.optionsItem,
                                    pressed ? styles.optionsItemPressed : null,
                                ]}
                                onPress={handleReportOptionsBackdrop}
                            >
                                <View style={styles.optionsItemRow}>
                                    <View style={styles.optionsItemLeft}>
                                        <MaterialCommunityIcons
                                            name="close"
                                            size={scaleSize(20)}
                                            color={theme.textSecondary}
                                            style={styles.optionsItemIcon}
                                        />
                                        <Text style={styles.optionsItemText}>Cancel</Text>
                                    </View>
                                </View>
                            </Pressable>
                        </Animated.View>
                    </View>
                </Modal>
            )}
            {reportSheetNode}
        </View>
    );
};

export default React.memo(SimpleFeedPost);

const styles = StyleSheet.create({
    wrapper: {
        width: "100%",
        marginBottom: scaleSize(22),
        position: 'relative',
    },
    card: {
        backgroundColor: theme.surface,
        position: 'relative',
    },
    cardHidden: {
        opacity: 0,
    },
    cardLive: {
        backgroundColor: '#22141a',
    },
    sectionTop: {
        paddingHorizontal: scaleSize(18),
        paddingTop: scaleSize(14),
    },
    metricColumnLeft: {
        width: '31%'
    },
    sectionBottom: {
        paddingTop: scaleSize(6),
        paddingBottom: scaleSize(8),
    },
    sectionBottomDivider: {
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatarWrap: {
        width: scaleSize(38),
        aspectRatio: 1,
        borderRadius: scaleSize(24),
        overflow: "hidden",
        marginRight: scaleSize(11),
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: scaleSize(24),
        backgroundColor: theme.field,
    },
    avatarFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    avatarInitials: {
        color: theme.textPrimary,
        fontFamily: "Poppins_600SemiBold",
        fontSize: scaleSize(15.5),
    },
    headerTextCol: {
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
    },
    namePressable: {
        flexShrink: 1,
    },
    nameHandle: {
        flexDirection: "row",
        alignItems: "center",
        flexShrink: 1,
    },
    nameText: {
        color: theme.textPrimary,
        fontFamily: "Poppins_700Bold",
        fontSize: scaleSize(13.5),
    },
    timestampText: {
        color: theme.textSecondary,
        fontFamily: "Outfit_400Regular",
        fontSize: scaleSize(11.5),
        marginTop: scaleSize(2),
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: scaleSize(8),
    },
    cheerButton: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(5),
        borderRadius: scaleSize(12),
        backgroundColor: "rgba(255,77,103,0.18)",
        marginRight: scaleSize(8),
    },
    cheerButtonText: {
        color: "#FF8596",
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(10.5),
        letterSpacing: 0.4,
        textTransform: "uppercase",
    },
    liveTimestampText: {
        color: '#FF8596',
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11.5),
        marginTop: scaleSize(2),
    },
    liveBackdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255,77,103,0.06)",
    },
    moreButton: {
        paddingHorizontal: scaleSize(4),
        paddingVertical: scaleSize(4),
    },
    titleBlock: {
        marginTop: scaleSize(12),
        paddingBottom: scaleSize(5)
    },
    titleText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
    },
    workoutTitleText: {
        color: '#74abf7ff',
    },
    captionText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(13),
        marginTop: scaleSize(4),
    },
    metricsLeft: {
        flexDirection: "row",
        flex: 1,
    },
    metricsFigures: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        flex: 1.8,
        paddingLeft: 0,
        
    },
    metricsFigureSlot: {
        flex: 1,
        maxWidth: "94%",
        height: scaleSize(240),
        alignItems: "center",
        justifyContent: "center",
    },
    metricsFigureFront: {
        marginRight: scaleSize(20),
    },
    metricsFigureBack: {
        marginLeft: scaleSize(20),
    },
    metricsFigure: {
        width: "125%",
        height: "125%",
    },
    metricsRow: {
        flexDirection: "row",
        justifyContent: 'space-between',
        paddingVertical: scaleSize(10),
        marginLeft: scaleSize(30),
        marginRight: scaleSize(20),
        alignItems: "center",
    },
    metricCenter: {
        paddingHorizontal: scaleSize(1),
    },
    metricRight: {
        alignItems: 'flex-end',
    },
    metricsColumnStack: {
        flex: 0.6,
        alignSelf: "stretch",
        justifyContent: "space-between",
        paddingBottom: scaleSize(10)
    },
    metricTopStack: {
        width: "100%",
        gap: scaleSize(10),
    },
    metricStackRow: {
        alignSelf: "stretch",
        marginBottom: scaleSize(10),
        alignItems: "flex-end",
    },
    metricStackRowLast: {
        marginBottom: 0,
    },
    metricLabel: {
        color: 'rgba(255,255,255,0.58)',
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(11),
        letterSpacing: 0.2,
        paddingBottom: scaleSize(1.5),
        textAlign: "right",
    },
    metricLabelRight: {
        textAlign: "right",
    },
    metricLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: scaleSize(1.5),
        alignSelf: "stretch",
        justifyContent: "flex-end",
    },
    metricLiveDot: {
        width: scaleSize(6.5),
        height: scaleSize(6.5),
        borderRadius: scaleSize(3.25),
        backgroundColor: "#FF4D67",
        marginRight: scaleSize(6),
        shadowColor: "#FF4D67",
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(6),
        shadowOffset: { width: 0, height: 0 },
    },
    metricValue: {
        color: theme.textPrimary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(14),
        textAlign: "right",
    },
    metricValueRight: {
        textAlign: "right",
    },
    workoutSummaryBlock: {
        marginTop: scaleSize(6),
        marginHorizontal: scaleSize(20),
        paddingTop: scaleSize(10),
        paddingBottom: scaleSize(4),
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    workoutSummaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: scaleSize(2),
    },
    workoutSummaryHeaderText: {
        color: theme.textSecondary,
        fontFamily: "Outfit_700Bold",
        fontSize: scaleSize(11),
        letterSpacing: 0.2,
        textTransform: 'uppercase',
    },
    workoutSummaryHeaderExercise: {
        flex: 1,
        paddingRight: scaleSize(12),
    },
    workoutSummaryHeaderBest: {
        minWidth: scaleSize(96),
        textAlign: 'right',
    },
    workoutSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: scaleSize(4),
    },
    workoutSummaryRowBorder: {
        borderColor: 'rgba(255,255,255,0.08)',
    },
    workoutSummaryExercise: {
        flex: 1,
        paddingRight: scaleSize(12),
        color: theme.textPrimary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
    },
    workoutSummaryBest: {
        minWidth: scaleSize(96),
        flexShrink: 0,
        textAlign: 'right',
        color: theme.textSecondary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12),
    },
    recordsValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordsValueText: {
        marginLeft: scaleSize(6),
    },
    mediaContainer: {
        width: "100%",
        marginTop: scaleSize(4),
        borderRadius: 0,
        overflow: "hidden",
        backgroundColor: theme.field,
        position: 'relative',
    },
    mediaList: {
        width: '100%',
        height: '100%',
    },
    mediaSlide: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaContent: {
        width: '100%',
        height: '100%',
    },
    mediaIndicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: scaleSize(6),
    },
    mediaDot: {
        width: scaleSize(6),
        height: scaleSize(4.5),
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.22)',
        marginHorizontal: scaleSize(3),
    },
    mediaDash: {
        width: scaleSize(22),
        height: scaleSize(4.5),
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.6)',
        marginHorizontal: scaleSize(3),
    },
    videoControlsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: scaleSize(12),
    },
    videoMuteButton: {
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: scaleSize(20),
        padding: scaleSize(8),
    },
    videoPlayIconWrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoSliderOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: scaleSize(12),
        paddingBottom: scaleSize(10),
        paddingTop: scaleSize(6),
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    videoSlider: {
        height: scaleSize(30),
    },
    videoTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: scaleSize(6),
    },
    videoTimeText: {
        fontSize: scaleSize(11),
        color: '#fff',
        fontFamily: 'Outfit_600SemiBold',
    },
    videoPlayIconCircle: {
        width: scaleSize(70),
        height: scaleSize(70),
        borderRadius: scaleSize(35),
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.45)',
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(16),
    },
    likesContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingRight: scaleSize(12),
    },
    likesContainerPressed: {
        opacity: 0.8,
    },
    likesAvatarWrap: {
        marginRight: scaleSize(6),
    },
    likesAvatar: {
        width: scaleSize(23),
        aspectRatio: 1,
        borderRadius: scaleSize(32) / 2,
        borderWidth: scaleSize(2),
        borderColor: "#fff",
        backgroundColor: theme.field,
    },
    likesAvatarFallback: {
        alignItems: "center",
        justifyContent: "center",
    },
    likesAvatarInitials: {
        color: theme.textPrimary,
        fontFamily: "Poppins_600SemiBold",
        fontSize: scaleSize(13),
    },
    likesText: {
        flex: 1,
        color: theme.textPrimary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(13),
    },
    buttonsContainer: {
        width: "32%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleSize(6),
    },
    actionButtonMiddle: {
    },
    actionText: {
        color: theme.textPrimary,
        fontFamily: "Outfit_500Medium",
        fontSize: scaleSize(12.5),
        marginLeft: scaleSize(6),
    },
    highlightOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: scaleSize(14),
        bottom: scaleSize(12),
        backgroundColor: "#FFF4B3",
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(17, 24, 39, 0.35)',
    },
    optionsModalRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    optionsBackdrop: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#000',
    },
    optionsSheet: {
        backgroundColor: theme.surface,
        paddingHorizontal: scaleSize(26),
        paddingTop: scaleSize(22),
        paddingBottom: scaleSize(32),
        borderTopLeftRadius: scaleSize(26),
        borderTopRightRadius: scaleSize(26),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.06)',
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: scaleSize(24),
        shadowOffset: { width: 0, height: -6 },
        elevation: 18,
    },
    optionsItem: {
        paddingVertical: scaleSize(12),
        borderRadius: scaleSize(16),
    },
    optionsItemPressed: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    optionsItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    optionsItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionsItemIcon: {
        marginRight: scaleSize(10),
    },
    optionsItemText: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(14.5),
        letterSpacing: 0.2,
        color: theme.textPrimary,
    },
    optionsItemDeleteText: {
        color: '#FF6B6B',
    },
    optionsDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginVertical: scaleSize(4),
    },
});
