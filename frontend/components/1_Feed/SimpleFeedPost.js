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
    Alert,
} from "react-native";
import FastImage from "react-native-fast-image";
import { Heart, Messages1 } from "iconsax-react-native";
import { MaterialCommunityIcons, FontAwesome6 } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";

import CroppedVideo from "../common/CroppedVideo";
import theme from "../../theme/mfpDark";
import scaleSize from "../../helper/scaleSize";
import { usePfp } from "../../helper/usePFPs";
import usePostFooterInteractions from "./Posts/hooks/usePostFooterInteractions";
import { buildExerciseSummaries } from "../../utils/workoutSummary";
import { resolvePhotoURL } from "../../utils/profilePhoto";
import VerifiedHandle from "../common/VerifiedHandle";
import useUserVerified from "../../hooks/useUserVerified";
import { strong as hapticStrong } from "../../utils/haptics";
import useReportContentSheet from "../../hooks/useReportContentSheet";
import { getViewerUid } from "../../utils/userRefs";
import { subscribeUserData } from "../../utils/userDataEvents";
import { isClipPost } from "../../utils/postTypes";
import { toNumber } from "../../utils/feedItemUtils";
import { formatClockTime } from "../../utils/date";
import { isLivePostData } from "../../utils/livePostMeta";
import styles from "./SimpleFeedPost.styles";
import { MUSCLE_HIGHLIGHT, MUSCLE_SEGMENTS, formatNumber, resolveWorkoutTitle, resolveWeightUnit, initialsFrom } from "./workoutDisplay";
import { formatTimestamp, normalizeMediaEntry, mediaSignatureFor } from "./feedPost/feedPostUtils";
import useFeedPostCheer from "./feedPost/useFeedPostCheer";
import useLiveWorkoutDuration from "./feedPost/useLiveWorkoutDuration";
import useFeedPostDelete from "./feedPost/useFeedPostDelete";
import { AnimatedPressable, FeedPostOwnerOptionsModal, FeedPostReportOptionsModal } from "./feedPost/FeedPostOptionsModals";
import FeedPostWorkoutMetrics from "./feedPost/FeedPostWorkoutMetrics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SimpleFeedPost = ({
    data,
    index,
    highlightPid,
    highlightSignal,
    onPressProfile,
    onPressWorkout,
    onPressComments,
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
    const isLivePost = useMemo(() => isLivePostData(data), [data?.isLive, data?.liveWorkout, data?.pid]);
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
    const { confettiTick, confettiVisible, confettiRef, loadConfettiModule, handleCheer } = useFeedPostCheer(workoutWid);
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

    const captionIncludedInComments = useMemo(() => {
        if (isLivePost) return false;
        if (Array.isArray(data?.comments)) {
            return data.comments.some((entry) => entry?.isCaption);
        }
        return Boolean(caption);
    }, [caption, data?.comments, isLivePost]);

    const commentCount = (() => {
        const count = Array.isArray(data?.comments)
            ? data.comments.length
            : toNumber(data?.commentCount);
        const offset = captionIncludedInComments ? 1 : 0;
        return Math.max(0, count - offset);
    })();

    const {
        isLiked,
        assignButtonRef,
        handlePressLikeButton,
        pressComment,
    } = usePostFooterInteractions({
        data,
        onPressCommentButton: () => onPressComments?.(index, data),
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

    const durationLabel = useLiveWorkoutDuration(isLivePost, workout);
    const volumeLabel = formatNumber(workout?.volume);
    const caloriesLabel = (() => {
        const raw = typeof workout?.calories === "number" ? workout.calories : Number(workout?.calories);
        if (!Number.isFinite(raw) || raw <= 0) return "--";
        return formatNumber(raw);
    })();
    const hasCalories = caloriesLabel !== "--";
    const showCaloriesInfo = useCallback(() => {
        Alert.alert(
            "How calories are estimated",
            "Add a weight measurement in the weight chart in the Progress section in order for calories to be estimated in future workouts!"
        );
    }, []);
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

    const { deleteOptionLabel, runDefaultDelete } = useFeedPostDelete({ workout, isViewerOwner, postPid, postOwnerUid, viewerUid });

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
                                        textStyle={styles.nameText}
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
                    <FeedPostWorkoutMetrics
                        onPress={handlePressWorkout}
                        muscleFills={muscleFills}
                        isLivePost={isLivePost}
                        durationLabel={durationLabel}
                        volumeLabel={volumeLabel}
                        weightUnit={weightUnit}
                        caloriesLabel={caloriesLabel}
                        hasCalories={hasCalories}
                        onPressCaloriesInfo={showCaloriesInfo}
                        recordsLabel={recordsLabel}
                    />
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

                <View style={styles.sectionBottom}>
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
                                style={styles.actionButton}
                                onPress={pressComment}
                            >
                                <Messages1 size={scaleSize(20)} color={theme.textPrimary} variant="Bold" />
                                <Text style={styles.actionText}>{formatNumber(commentCount)}</Text>
                            </AnimatedPressable>
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
                <FeedPostOwnerOptionsModal
                    visible={isOptionsSheetVisible}
                    onRequestClose={handleBackdropPress}
                    backdropOpacity={optionsBackdropOpacity}
                    translateY={optionsSheetTranslateY}
                    onPressEditPost={handlePressEditPost}
                    clipPost={clipPost}
                    canEditWorkoutOption={canEditWorkoutOption}
                    onPressEditWorkout={handlePressEditWorkout}
                    onPressDeletePost={handlePressDeletePost}
                    deleteOptionLabel={deleteOptionLabel}
                />
            ) : (
                <FeedPostReportOptionsModal
                    visible={isReportOptionsVisible}
                    onRequestClose={handleReportOptionsBackdrop}
                    backdropOpacity={reportOptionsBackdropOpacity}
                    translateY={reportOptionsTranslateY}
                    onSelectReport={handleSelectReport}
                />
            )}
            {reportSheetNode}
        </View>
    );
};

export default React.memo(SimpleFeedPost);
