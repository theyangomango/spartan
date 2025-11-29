import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Image, Dimensions, FlatList, Alert, Platform, Pressable, Animated } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, FontAwesome6, Ionicons } from '@expo/vector-icons';
import FastImage from 'react-native-fast-image';
import CroppedVideo from '../../common/CroppedVideo';
import * as MediaLibrary from 'expo-media-library';
import Slider from '@react-native-community/slider';
import makeID from "../../../../backend/helper/makeID";
// Storage handled via native resumable helper to avoid RN Blob issues
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import uploadResumableNative from "../../../../backend/storage/uploadResumableNative";
import createPost from "../../../../backend/posts/createPost";
import arrayAppend from "../../../../backend/helper/firebase/arrayAppend";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import readDoc from "../../../../backend/helper/firebase/readDoc";
import { compressUnder250KB } from "./compressUnder250KB";
import PostHonestyModal from "./PostHonestyModal";
import theme from '../../../theme/mfpDark';
import { withStrongPress } from "../../../utils/haptics";
import { resolvePhotoURL } from "../../../utils/profilePhoto";
import { getViewerUid } from "../../../utils/userRefs";
import { subscribeUserData } from "../../../utils/userDataEvents";
import { addOptimisticFeedPost, removeOptimisticFeedPost } from "../../../utils/optimisticFeedPosts";

import DismissableTextInput from "../../common/DismissableTextInput";

const { width: screenWidth } = Dimensions.get('window');
const scale = screenWidth / 375; // Assuming a base screen width of 375 (like iPhone X)

function scaleSize(size) {
    return Math.round(size * scale);
}

const composeHorizontalPadding = scaleSize(18);
const avatarSize = scaleSize(36);
const headerBottomPadding = scaleSize(12);
const MAX_CAPTION_LINES = 10;

const formatClockTime = (seconds) => {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
};

const mediaSignatureFor = (entry) => {
    if (!entry) return 'null';
    const type = entry.type || 'image';
    const uri = typeof entry.uri === 'string' ? entry.uri : JSON.stringify(entry.uri || '');
    const crop = entry?.cropRect;
    let cropKey = '';
    if (crop && typeof crop === 'object') {
        const { x = 0, y = 0, width = 1, height = 1 } = crop;
        cropKey = `:${Number(x).toFixed(4)}-${Number(y).toFixed(4)}-${Number(width).toFixed(4)}-${Number(height).toFixed(4)}`;
    }
    return `${type}:${uri}${cropKey}`;
};

const normalizeMediaSelectionEntry = (entry, index = 0) => {
    if (!entry) return null;
    if (typeof entry === 'string') {
        return {
            uri: entry,
            previewUri: entry,
            originalUri: entry,
            localUri: entry.startsWith('file://') ? entry : null,
            type: 'image',
            duration: 0,
            assetId: null,
            cropRect: null,
        };
    }
    if (typeof entry === 'object') {
        const uri = entry.uri || entry.url || entry.image || entry.path || null;
        if (!uri) return null;
        const typeSource = entry.type
            || entry.mediaType
            || entry.kind
            || entry.mime
            || entry.mimeType
            || entry.contentType
            || entry.fileType
            || 'image';
        const normalizedType = String(typeSource).toLowerCase().includes('video') ? 'video' : 'image';
        const previewUri = entry.previewUri || uri;
        const originalUri = entry.originalUri || uri;
        const localUri = entry.localUri || (uri.startsWith('file://') ? uri : null);
        const assetId = entry.assetId || entry.id || null;
        const width = typeof entry.width === 'number' ? entry.width : null;
        const height = typeof entry.height === 'number' ? entry.height : null;
        return {
            uri,
            previewUri,
            originalUri,
            localUri,
            type: normalizedType,
            duration: Number(entry.duration) || 0,
            assetId,
            cropRect: entry.cropRect || null,
            width,
            height,
            aspectRatio: typeof entry.aspectRatio === 'number'
                ? entry.aspectRatio
                : (width && height ? width / height : null),
            isClip: Boolean(entry.isClip),
        };
    }
    return null;
};

const normalizeMediaList = (list) => {
    if (!Array.isArray(list)) return [];
    const normalized = [];
    list.forEach((entry, idx) => {
        const item = normalizeMediaSelectionEntry(entry, idx);
        if (!item) return;
        normalized.push(item);
    });
    return normalized;
};

const isRemoteUri = (uri) => /^https?:\/\//i.test(String(uri || ''));

export default function PostOptionsScreen({ navigation, route }) {
    const editingPost = route?.params?.editingPost || null;
    const isEditing = Boolean(editingPost?.pid);
    const editingPid = isEditing ? String(editingPost.pid) : null;
    const editingWorkoutName = isEditing && typeof editingPost?.workoutName === 'string'
        ? editingPost.workoutName.trim()
        : '';

    const editingMediaEntries = useMemo(() => {
        if (!isEditing) return [];
        const seen = new Set();
        const result = [];

        const pushEntry = (entry) => {
            const normalized = normalizeMediaSelectionEntry(entry);
            if (!normalized) return;
            const key = normalized.originalUri || normalized.uri;
            if (!key || seen.has(key)) return;
            seen.add(key);
            result.push(normalized);
        };

        if (Array.isArray(editingPost?.mediaEntries)) {
            editingPost.mediaEntries.forEach((entry) => {
                if (!entry) return;
                pushEntry(entry);
            });
        } else if (Array.isArray(editingPost?.media)) {
            editingPost.media.forEach((entry) => {
                pushEntry(entry);
            });
        }

        if (Array.isArray(editingPost?.images)) {
            editingPost.images.forEach((entry) => {
                if (!entry) return;
                if (typeof entry === 'string') {
                    pushEntry({ uri: entry, type: 'image' });
                    return;
                }
                pushEntry({ ...entry, type: 'image' });
            });
        }

        return result;
    }, [isEditing, editingPost]);

    const incomingRouteImages = useMemo(() => {
        const incoming = route?.params?.images;
        if (Array.isArray(incoming) && incoming.length > 0) {
            return normalizeMediaList(incoming);
        }
        return null;
    }, [route?.params?.images]);

    const editingRouteImages = useMemo(() => (
        isEditing ? editingMediaEntries : []
    ), [isEditing, editingMediaEntries]);
    const workoutParam = route?.params?.workout;
    const editingHasWorkoutPid = isEditing && Boolean(editingPost?.workoutPid);
    const editingHasWorkoutObject = isEditing && Boolean(editingPost?.workout);
    const hasWorkoutAttachment = useMemo(() => {
        if (workoutParam && typeof workoutParam === 'object') return true;
        if (!isEditing) return false;
        if (editingWorkoutName) return true;
        if (editingHasWorkoutPid) return true;
        if (editingHasWorkoutObject) return true;
        return false;
    }, [workoutParam, isEditing, editingWorkoutName, editingHasWorkoutPid, editingHasWorkoutObject]);

    const initialCaption = (isEditing && typeof editingPost?.caption === 'string')
        ? editingPost.caption
        : '';
    const [caption, setCaption] = useState(initialCaption);
    const [isSharing, setIsSharing] = useState(false);
    const [honestyVisible, setHonestyVisible] = useState(false);
    const [mediaIndex, setMediaIndex] = useState(0);
    const [mediaWidth, setMediaWidth] = useState(screenWidth);
    const [selectedImages, setSelectedImages] = useState(() => (
        incomingRouteImages || editingRouteImages
    ));
    const selectionSourceRef = useRef(
        incomingRouteImages
            ? "user"
            : (isEditing ? "editing" : "none")
    );
    const sharePromiseRef = useRef(null);
    const isMountedRef = useRef(true);
    const insets = useSafeAreaInsets();
    const headerTopPadding = useMemo(() => scaleSize(6) + Math.max(0, insets.top), [insets.top]);
    const userImage = resolvePhotoURL(global?.userData, "");
    const captionLastValidRef = useRef('');
    const [measureState, setMeasureState] = useState({ text: ' ', nonce: 0 });
    const measureRequestRef = useRef(null);
    const [lineLimitReached, setLineLimitReached] = useState(false);
    const compressionCacheRef = useRef(new Map()); // reuse compressed results across retries
    const [viewerUid, setViewerUid] = useState(() => getViewerUid());
    const [videoPauseState, setVideoPauseState] = useState({});
    const [areVideosMuted, setVideosMuted] = useState(true);
    const [videoDurations, setVideoDurations] = useState({});
    const [videoProgress, setVideoProgress] = useState({});
    const [videoControlsVisible, setVideoControlsVisible] = useState({});
    const videoRefs = useRef({});
    const scrubbingStateRef = useRef(null);
    const videoControlsHideTimeoutsRef = useRef({});
    const videoControlsOpacityRef = useRef({});
    const editingIsClip = isEditing && (
        Boolean(editingPost?.type === 'clip') ||
        Boolean(editingPost?.media?.some((entry) => entry?.isClip))
    );
    const [isClipMode, setIsClipMode] = useState(() => editingIsClip);

    useEffect(() => {
        return subscribeUserData(() => {
            setViewerUid((prev) => {
                const next = getViewerUid();
                return prev === next ? prev : next;
            });
        });
    }, []);

    useEffect(() => {
        if (!isEditing) return;
        if (selectionSourceRef.current === "user") return;
        setSelectedImages(editingRouteImages);
        selectionSourceRef.current = "editing";
    }, [editingRouteImages, isEditing]);

    useEffect(() => {
        if (!incomingRouteImages) return;
        setSelectedImages(incomingRouteImages);
        setIsClipMode(false);
        selectionSourceRef.current = "user";
        navigation.setParams({ images: undefined });
    }, [incomingRouteImages, navigation]);

    useEffect(() => {
        if (!route?.params?.clipMedia) return;
        const normalized = normalizeMediaSelectionEntry(route.params.clipMedia);
        if (normalized) {
            normalized.isClip = true;
            normalized.type = 'video';
            if (!normalized.aspectRatio && normalized.cropRect) {
                const { width = 0, height = 0 } = normalized.cropRect;
                if (width && height) normalized.aspectRatio = width / height;
            }
            setSelectedImages([normalized]);
            selectionSourceRef.current = "user";
            setIsClipMode(true);
        }
        navigation.setParams({ clipMedia: undefined });
    }, [navigation, route?.params?.clipMedia]);

    useEffect(() => {
        if (!route?.params) return;
        if (typeof route.params.clipCaption !== 'string') return;
        setCaption(route.params.clipCaption);
        captionLastValidRef.current = route.params.clipCaption;
        navigation.setParams({ clipCaption: undefined });
    }, [navigation, route?.params?.clipCaption]);

    const mediaList = useMemo(() => (
        Array.isArray(selectedImages)
            ? selectedImages.map((entry, idx) => normalizeMediaSelectionEntry(entry, idx)).filter(Boolean)
            : []
    ), [selectedImages]);
    const hasMedia = mediaList.length > 0;

    const mediaFingerprint = useMemo(() => {
        if (mediaList.length === 0) return 'empty';
        return mediaList.map(mediaSignatureFor).join('|');
    }, [mediaList]);

    const previousMediaFingerprintRef = useRef(mediaFingerprint);

    useEffect(() => {
        if (previousMediaFingerprintRef.current === mediaFingerprint) return;
        previousMediaFingerprintRef.current = mediaFingerprint;
        setVideoPauseState({});
        setVideosMuted(true);
        setVideoDurations({});
        setVideoProgress({});
        setVideoControlsVisible({});
        videoRefs.current = {};
        Object.values(videoControlsHideTimeoutsRef.current).forEach((id) => {
            if (id) clearTimeout(id);
        });
        videoControlsHideTimeoutsRef.current = {};
        videoControlsOpacityRef.current = {};
    }, [mediaFingerprint]);

    useEffect(() => {
        if (isClipMode && mediaList.length === 0) {
            setIsClipMode(false);
        }
    }, [isClipMode, mediaList.length]);

    const compressionPreset = useMemo(() => {
        const count = Math.max(1, mediaList.length || 1);
        const basePrimary = Platform.OS === 'android' ? 0.72 : 0.68;
        const baseFallback = Platform.OS === 'android' ? 0.62 : 0.58;

        let targetKB = 320;
        let maxDimension = 1380;
        let fallbackDimension = 1080;
        let minEdge = 720;
        let primaryQuality = basePrimary;
        let fallbackQuality = baseFallback;

        if (count === 2) {
            targetKB = 250;
            maxDimension = 1280;
            fallbackDimension = 980;
            primaryQuality -= 0.02;
            fallbackQuality -= 0.02;
        } else if (count === 3) {
            targetKB = 220;
            maxDimension = 1152;
            fallbackDimension = 928;
            minEdge = 680;
            primaryQuality -= 0.04;
            fallbackQuality -= 0.04;
        } else if (count >= 4) {
            targetKB = 200;
            maxDimension = 1024;
            fallbackDimension = 896;
            minEdge = 660;
            primaryQuality -= 0.06;
            fallbackQuality -= 0.06;
        }

        primaryQuality = Math.max(0.55, primaryQuality);
        fallbackQuality = Math.max(0.5, fallbackQuality);

        const cacheKey = `v2-${count}-${targetKB}-${maxDimension}-${fallbackDimension}-${minEdge}-${primaryQuality.toFixed(2)}-${fallbackQuality.toFixed(2)}`;

        return {
            targetKB,
            maxDimension,
            fallbackDimension,
            minEdge,
            primaryQuality,
            fallbackQuality,
            cacheKey,
        };
    }, [mediaList.length]);

    const ensurePreparedAsset = useCallback(async (entry) => {
        const sourceUri = entry?.localUri || entry?.uri;
        if (!sourceUri || isRemoteUri(sourceUri)) return null;

        const cache = compressionCacheRef.current;
        const cacheKey = `${sourceUri}::${compressionPreset.cacheKey}`;

        const cached = cache.get(cacheKey);
        if (cached) {
            if (cached.status === 'done') return cached.result;
            if (cached.status === 'pending') return cached.promise;
        }

        // purge stale entries for same source to keep memory in check
        const staleKeys = [];
        cache.forEach((_, key) => {
            if (key.startsWith(`${sourceUri}::`) && key !== cacheKey) {
                staleKeys.push(key);
            }
        });
        staleKeys.forEach((key) => cache.delete(key));

        const jobPromise = (async () => {
            let workingUri = sourceUri;
            try {
                workingUri = await compressUnder250KB(sourceUri, {
                    targetKB: compressionPreset.targetKB,
                    maxDimension: compressionPreset.maxDimension,
                    fallbackDimension: compressionPreset.fallbackDimension,
                    minEdge: compressionPreset.minEdge,
                    primaryQuality: compressionPreset.primaryQuality,
                    fallbackQuality: compressionPreset.fallbackQuality,
                });
            } catch (error) {
                console.warn('[PostUploadOptions] compressUnder250KB failed, falling back to original asset', error);
            }

            if (!workingUri || !workingUri.startsWith('file://')) {
                try {
                    const tmp = await ImageManipulator.manipulateAsync(
                        workingUri || sourceUri,
                        [],
                        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
                    );
                    if (tmp?.uri) workingUri = tmp.uri;
                } catch {
                    workingUri = sourceUri;
                }
            }

            if (!workingUri || !workingUri.startsWith('file://')) {
                throw new Error('Unable to resolve local file path for asset upload');
            }

            const withoutQuery = (workingUri || '').split('?')[0];
            const match = withoutQuery.match(/\.([a-zA-Z0-9]+)$/);
            let ext = (match ? match[1] : '').toLowerCase();
            if (ext === 'jpeg') ext = 'jpg';
            if (!ext) ext = (Platform.OS === 'android' ? 'webp' : 'jpg');
            if (!['jpg', 'png', 'webp'].includes(ext)) {
                ext = Platform.OS === 'android' ? 'webp' : 'jpg';
            }
            const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');

            const info = await FileSystem.getInfoAsync(workingUri).catch(() => null);
            const size = info?.size && Number.isFinite(info.size) ? info.size : null;

            return {
                fileUri: workingUri,
                ext,
                mime,
                size,
            };
        })();

        cache.set(cacheKey, { status: 'pending', promise: jobPromise });

        try {
            const result = await jobPromise;
            cache.set(cacheKey, { status: 'done', result });
            return result;
        } catch (error) {
            cache.delete(cacheKey);
            throw error;
        }
    }, [compressionPreset]);

    const ensureVideoAsset = useCallback(async (entry) => {
        if (!entry) return null;

        const ensureFileScheme = (uri) => (uri && uri.startsWith('file://') ? uri : null);
        let assetInfo = null;
        const loadAssetInfo = async () => {
            if (assetInfo || !entry.assetId) return assetInfo;
            try {
                assetInfo = await MediaLibrary.getAssetInfoAsync(entry.assetId);
            } catch (error) {
                console.warn('[PostUploadOptions] getAssetInfoAsync failed', error);
                assetInfo = null;
            }
            return assetInfo;
        };

        let sourceUri = entry.localUri || entry.uri || null;
        let fileUri = ensureFileScheme(sourceUri);

        if (!fileUri && entry.assetId) {
            const info = await loadAssetInfo();
            if (info?.localUri) {
                fileUri = ensureFileScheme(info.localUri);
                if (!fileUri) {
                    sourceUri = info.localUri;
                }
            }
        }

        let fallbackUri = fileUri ? null : sourceUri;

        const withoutQuery = (sourceUri || '').split('?')[0];
        let ext = (withoutQuery.match(/\.([a-zA-Z0-9]+)$/)?.[1] || '').toLowerCase();
        if (!ext && entry.assetId) {
            const info = await loadAssetInfo();
            if (info?.filename) {
                const parts = info.filename.split('.');
                const candidate = parts[parts.length - 1];
                if (candidate) ext = candidate.toLowerCase();
            }
        }
        if (!ext) ext = 'mp4';
        const normalizedExt = ['mp4', 'mov', 'm4v'].includes(ext) ? ext : 'mp4';

        if (!fileUri && fallbackUri) {
            const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || FileSystem.temporaryDirectory;
            if (!cacheDir) throw new Error('No cache directory available for video upload');
            const tempTarget = `${cacheDir}upload-video-${makeID()}.${normalizedExt}`;
            const isRemote = /^https?:\/\//i.test(fallbackUri);
            try {
                if (isRemote) {
                    const download = await FileSystem.downloadAsync(fallbackUri, tempTarget);
                    fileUri = download?.uri || tempTarget;
                } else {
                    await FileSystem.copyAsync({ from: fallbackUri, to: tempTarget });
                    fileUri = tempTarget;
                }
            } catch (error) {
                console.warn('[PostUploadOptions] copyAsync failed for video', error);
                fileUri = ensureFileScheme(fallbackUri);
            }
        }

        if (!fileUri) {
            throw new Error('Unable to resolve local video path for upload');
        }

        const info = await FileSystem.getInfoAsync(fileUri).catch(() => null);
        const size = typeof info?.size === 'number' ? info.size : null;

        let mime = entry?.mime || entry?.mimeType || null;
        if (!mime) {
            if (normalizedExt === 'mov') mime = 'video/quicktime';
            else mime = `video/${normalizedExt === 'm4v' ? 'mp4' : normalizedExt}`;
        }

        return {
            fileUri,
            ext: normalizedExt,
            mime,
            size,
        };
    }, []);

    useEffect(() => {
        if (!mediaList.length) return;
        const seen = new Set();
        mediaList.forEach((entry) => {
            if (!entry || entry.type !== 'image') return;
            const key = entry.localUri || entry.uri;
            if (!key || isRemoteUri(entry.uri)) return;
            if (seen.has(key)) return;
            seen.add(key);
            ensurePreparedAsset(entry).catch(() => {
                // Logged upstream; ignore background failures.
            });
        });
    }, [mediaList, ensurePreparedAsset]);

    const keyExtractor = useCallback((item, idx) => `${item?.originalUri || item?.uri || 'media'}-${idx}`, []);

    const handleMediaLayout = useCallback((event) => {
        const width = event?.nativeEvent?.layout?.width;
        if (!width) return;
        if (Math.abs(width - mediaWidth) < 0.5) return;
        setMediaWidth(width);
    }, [mediaWidth]);

    const updateMediaIndexFromOffset = useCallback((offsetX) => {
        if (!mediaWidth) return;
        const nextIndex = Math.round(offsetX / mediaWidth);
        if (Number.isFinite(nextIndex)) setMediaIndex(nextIndex);
    }, [mediaWidth]);

    const handleMediaScroll = useCallback((event) => {
        const offsetX = event?.nativeEvent?.contentOffset?.x ?? 0;
        updateMediaIndexFromOffset(offsetX);
    }, [updateMediaIndexFromOffset]);

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
            if (!visible) anim.setValue(0);
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
        setVideosMuted((prev) => !prev);
    }, []);

    const assignVideoRef = useCallback((idx, ref) => {
        if (ref) {
            videoRefs.current[idx] = ref;
        } else {
            delete videoRefs.current[idx];
        }
    }, []);

    const handleVideoLoad = useCallback((idx, meta) => {
        const duration = Number(meta?.duration) || 0;
        if (duration > 0) {
            setVideoDurations((prev) => (
                prev[idx] === duration ? prev : { ...prev, [idx]: duration }
            ));
        }
    }, []);

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
        setVideoProgress((prev) => ({ ...prev, [idx]: value }));
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

    const renderMediaItem = useCallback(({ item, index: slideIndex }) => {
        if (!item) return null;
        const containerStyle = [styles.media_slide, { width: mediaWidth, height: mediaWidth }];
        if (item.type === 'video') {
            const source = typeof item.uri === 'string' ? { uri: item.uri } : item.uri;
            const isActiveSlide = mediaIndex === slideIndex;
            const isManuallyPaused = Boolean(videoPauseState[slideIndex]);
            const paused = !isActiveSlide || isManuallyPaused;
            const fallbackDuration = Number(item?.duration) || 0;
            const videoDuration = videoDurations[slideIndex] || fallbackDuration;
            const sliderValue = Math.min(
                videoDuration || Number.MAX_SAFE_INTEGER,
                videoProgress[slideIndex] ?? 0
            );
            const controlsOpacity = getControlsOpacityValue(slideIndex);
            const shouldShowControls = paused || videoControlsVisible[slideIndex];
            return (
                <Pressable style={containerStyle} onPress={() => toggleVideoPlayback(slideIndex)}>
                    <CroppedVideo
                        ref={(ref) => assignVideoRef(slideIndex, ref)}
                        source={source}
                        style={styles.media_image}
                        cropRect={item.cropRect}
                        resizeMode="cover"
                        paused={paused}
                        repeat
                        muted={areVideosMuted}
                        onLoad={(meta) => handleVideoLoad(slideIndex, meta)}
                        onProgress={(event) => handleVideoProgress(slideIndex, event)}
                    />
                    {paused && (
                        <View style={styles.video_play_icon_wrap} pointerEvents="none">
                            <FontAwesome6 name="circle-play" size={scaleSize(56)} color="#fff" />
                        </View>
                    )}
                    {videoDuration > 0 && (
                        <Animated.View
                            style={[styles.video_slider_overlay, { opacity: controlsOpacity }]}
                            pointerEvents={shouldShowControls ? 'auto' : 'none'}
                        >
                            <View style={styles.video_time_row} pointerEvents="none">
                                <Text style={styles.video_time_text}>{formatClockTime(sliderValue)}</Text>
                                <Text style={styles.video_time_text}>{formatClockTime(videoDuration)}</Text>
                            </View>
                            <Slider
                                style={styles.video_slider}
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
                    <View style={styles.video_controls_overlay} pointerEvents="box-none">
                        <Pressable
                            style={styles.video_mute_button}
                            hitSlop={8}
                            onPress={(event) => {
                                event?.stopPropagation?.();
                                toggleVideoMute();
                            }}
                        >
                            <MaterialCommunityIcons
                                name={areVideosMuted ? 'volume-off' : 'volume-high'}
                                size={scaleSize(18)}
                                color="#fff"
                            />
                        </Pressable>
                    </View>
                </Pressable>
            );
        }
        const displayUri = item.previewUri || item.uri;
        return (
            <View style={containerStyle}>
                <Image source={{ uri: displayUri }} style={styles.media_image} resizeMode="cover" />
            </View>
        );
    }, [areVideosMuted, assignVideoRef, beginScrub, finishScrub, getControlsOpacityValue, handleScrubChange, handleVideoLoad, handleVideoProgress, mediaIndex, mediaWidth, toggleVideoMute, toggleVideoPlayback, videoControlsVisible, videoDurations, videoPauseState, videoProgress]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            sharePromiseRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (mediaIndex >= mediaList.length) {
            setMediaIndex(0);
        }
    }, [mediaIndex, mediaList.length]);

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

    function goBack() {
        navigation.goBack();
    }

    const formatMeasureValue = useCallback((value) => {
        if (!value) return ' ';
        return value.endsWith('\n') ? `${value} ` : value;
    }, []);

    const queueMeasure = useCallback((value, type) => {
        measureRequestRef.current = { text: value, type };
        setMeasureState((prev) => {
            const formatted = formatMeasureValue(value);
            return {
                text: formatted,
                nonce: prev.nonce + 1,
            };
        });
    }, [formatMeasureValue]);

    const handleCaptionChange = useCallback((nextValue) => {
        setCaption(nextValue);
        queueMeasure(nextValue, 'candidate');
    }, [queueMeasure]);

    const handleCaptionMeasureLayout = useCallback((event) => {
        const lines = Array.isArray(event?.nativeEvent?.lines) ? event.nativeEvent.lines.length : 0;
        const request = measureRequestRef.current;

        if (!request) {
            const effectiveLines = caption ? lines : 0;
            setLineLimitReached(effectiveLines >= MAX_CAPTION_LINES);
            captionLastValidRef.current = caption;
            return;
        }

        const targetText = request.text || '';
        const effectiveLines = targetText ? lines : 0;

        if (request.type === 'candidate') {
            if (effectiveLines <= MAX_CAPTION_LINES) {
                captionLastValidRef.current = targetText;
                setCaption(targetText);
                setLineLimitReached(effectiveLines >= MAX_CAPTION_LINES);
                measureRequestRef.current = null;
                return;
            }

            setLineLimitReached(true);
            queueMeasure(captionLastValidRef.current, 'sync');
            setCaption((prevCaption) => {
                if (prevCaption === captionLastValidRef.current) return prevCaption;
                return captionLastValidRef.current;
            });
            return;
        }

        setLineLimitReached(effectiveLines >= MAX_CAPTION_LINES);
        captionLastValidRef.current = targetText;
        measureRequestRef.current = null;
    }, [caption, queueMeasure]);

    useEffect(() => {
        if (measureRequestRef.current?.type === 'candidate') return;
        queueMeasure(caption, 'sync');
    }, [caption, queueMeasure]);

    const beginShare = () => {
        if (isEditing) {
            sharePost();
            return;
        }

        if (hasMedia) {
            setHonestyVisible(true);
            return;
        }

        sharePost();
    };

    const handleOpenSelectPhotos = useCallback(() => {
        const openPicker = () => {
            const params = { initialImages: mediaList };
            if (typeof workoutParam !== 'undefined') params.workout = workoutParam;
            navigation.navigate('SelectPhotos', params);
        };

        if (isClipMode && mediaList.length > 0) {
            Alert.alert(
                'Switch to regular post?',
                'Adding standard media will remove your clip.',
                [
                    { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Switch',
                            style: 'destructive',
                            onPress: () => {
                                setIsClipMode(false);
                                setSelectedImages([]);
                                selectionSourceRef.current = "user";
                                openPicker();
                            },
                        },
                ]
            );
            return;
        }

        openPicker();
    }, [isClipMode, mediaList, navigation, workoutParam, setSelectedImages]);

    const handleOpenClipBuilder = useCallback(() => {
        const proceed = () => {
            const target = isClipMode ? 'EditClip' : 'NewClip';
            const params = { initialCaption: caption };
            if (isClipMode && mediaList[0]) {
                params.initialClip = mediaList[0];
            }
            navigation.navigate(target, params);
        };

        if (!isClipMode && mediaList.length > 0) {
            Alert.alert(
                'Replace media with a clip?',
                'Adding a clip will remove your current photos and videos.',
                [
                    { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Replace',
                            style: 'destructive',
                            onPress: () => {
                                setSelectedImages([]);
                                selectionSourceRef.current = "user";
                                proceed();
                            },
                        },
                ]
            );
            return;
        }

        proceed();
    }, [caption, isClipMode, mediaList, navigation, setSelectedImages]);

    async function sharePost() {
        if (isSharing || sharePromiseRef.current) return;

        const trimmedCaption = caption.trim();
        if (!hasWorkoutAttachment && !trimmedCaption) {
            Alert.alert('Caption required', 'Please enter a caption before saving.');
            return;
        }

        if (isEditing && !editingPid) {
            Alert.alert('Unable to edit post', 'Missing post identifier.');
            return;
        }

        setIsSharing(true);
        if (honestyVisible) setHonestyVisible(false);

        const pid = isEditing ? editingPid : makeID();
        const previousPosts = !isEditing && global?.userData && Array.isArray(global.userData.posts)
            ? [...global.userData.posts]
            : null;
        let appendedOptimistically = false;
        if (!isEditing && global?.userData) {
            const existing = Array.isArray(global.userData.posts) ? global.userData.posts : [];
            if (!existing.includes(pid)) {
                global.userData.posts = [...existing, pid];
                appendedOptimistically = true;
            }
        }

        const currentImages = mediaList;
        const isClipPost = isClipMode && currentImages.length === 1 && currentImages[0]?.type === 'video';
        const resolvedViewerUid = viewerUid || getViewerUid() || (global?.userData?.uid ? String(global.userData.uid) : "");
        const viewerHandle = typeof global?.userData?.handle === 'string' ? global.userData.handle : '';
        const viewerName = typeof global?.userData?.name === 'string' ? global.userData.name : '';
        const viewerPfpVersion = Number(global?.userData?.pfpVersion ?? 0);
        const cloneWorkoutAttachment = () => {
            if (!workoutParam || typeof workoutParam !== 'object') return null;
            try {
                return JSON.parse(JSON.stringify(workoutParam));
            } catch {
                return { ...workoutParam };
            }
        };

        let optimisticPostAdded = false;
        if (!isEditing && resolvedViewerUid) {
            const now = Date.now();
            const optimisticMedia = currentImages
                .map((item, index) => {
                    if (!item) return null;
                    const localUri = item.localUri || item.previewUri || item.uri;
                    if (!localUri) return null;
                    const type = item.type === 'video' ? 'video' : 'image';
                    const duration = type === 'video' ? Number(item.duration) || 0 : 0;
                    const aspectRatio = item?.aspectRatio
                        || ((item?.width && item?.height) ? (item.width / item.height) : null);
                    return {
                        uri: localUri,
                        type,
                        duration,
                        cropRect: item.cropRect || null,
                        isClip: Boolean(isClipPost && index === 0 && type === 'video'),
                        aspectRatio: aspectRatio || null,
                    };
                })
                .filter(Boolean);
            const optimisticImages = optimisticMedia
                .filter((entry) => entry.type !== 'video')
                .map((entry) => entry.uri);
            try {
                addOptimisticFeedPost({
                    pid,
                    uid: resolvedViewerUid,
                    handle: viewerHandle,
                    name: viewerName,
                    pfp: userImage,
                    pfpVersion: viewerPfpVersion,
                    caption: trimmedCaption,
                    media: optimisticMedia,
                    images: optimisticImages,
                    workout: cloneWorkoutAttachment(),
                    type: isClipPost ? 'clip' : 'post',
                    created: now,
                    createdAt: now,
                    sortKey: now,
                    likes: [],
                    likeCount: 0,
                    comments: trimmedCaption
                        ? [{
                            content: trimmedCaption,
                            handle: viewerHandle,
                            isCaption: true,
                            pfp: userImage,
                            timestamp: now,
                            uid: resolvedViewerUid,
                        }]
                        : [],
                    commentCount: trimmedCaption ? 1 : 0,
                    pendingUpload: true,
                });
                optimisticPostAdded = true;
            } catch (error) {
                console.warn?.('Failed to add optimistic feed post', error);
            }
        }

        const runShare = async () => {
            try {
                const processedMedia = await Promise.all(currentImages.map(async (item, index) => {
                    if (!item) return null;
                    const uri = item.uri;
                    if (!uri) return null;
                    const type = item.type === 'video' ? 'video' : 'image';
                    const duration = type === 'video' ? Number(item.duration) || 0 : 0;
                    const cropRect = item.cropRect || null;

                    if (isRemoteUri(uri)) {
                        return { index, uri, type, duration, cropRect };
                    }

                    if (type === 'video') {
                        try {
                            const preparedVideo = await ensureVideoAsset(item);
                            if (!preparedVideo?.fileUri) throw new Error('Unable to resolve video for upload');
                            const id = makeID();
                            const path = `posts/${pid}-${id}.${preparedVideo.ext || 'mp4'}`;
                            const { url } = await uploadResumableNative({
                                fileUri: preparedVideo.fileUri,
                                path,
                                mime: preparedVideo.mime || 'video/mp4',
                                size: preparedVideo.size,
                            });
                            const aspectRatio = item?.aspectRatio
                                || ((item?.width && item?.height) ? (item.width / item.height) : null);
                            return {
                                index,
                                uri: url,
                                type: 'video',
                                duration,
                                cropRect,
                                isClip: Boolean(isClipPost && index === 0),
                                aspectRatio,
                            };
                        } catch (error) {
                            console.error(`Error uploading video ${index + 1}:`, error);
                            return null;
                        }
                    }

                    try {
                        const preparedImage = await ensurePreparedAsset(item);
                        if (!preparedImage?.fileUri) throw new Error('Unable to prepare image for upload');
                        const { fileUri: localUri, ext, mime, size } = preparedImage;
                        const safeExt = ext || 'jpg';
                        const mimeType = mime || (safeExt === 'png' ? 'image/png' : (safeExt === 'webp' ? 'image/webp' : 'image/jpeg'));
                        const id = makeID();
                        const path = `posts/${pid}-${id}.${safeExt}`;
                        const { url } = await uploadResumableNative({ fileUri: localUri, path, mime: mimeType, size });
                        const aspectRatio = ((item?.width && item?.height) ? (item.width / item.height) : null);
                        return { index, uri: url, type: 'image', cropRect, aspectRatio, duration: 0 };
                    } catch (error) {
                        console.error(`Error processing image ${index + 1}:`, error);
                        return null;
                    }
                }));

                const mediaPayload = processedMedia
                    .filter(Boolean)
                    .sort((a, b) => a.index - b.index)
                    .map(({ uri, type, duration, cropRect, isClip, aspectRatio }) => ({
                        uri,
                        type: type || 'image',
                        duration: Number(duration) || 0,
                        cropRect: cropRect || null,
                        isClip: Boolean(isClip),
                        aspectRatio: aspectRatio || null,
                    }));

                const imagesPayload = mediaPayload
                    .filter((entry) => entry.type !== 'video')
                    .map((entry) => entry.uri);

                const nextPostType = isClipPost ? 'clip' : 'post';

                if (isEditing) {
                    const latest = await readDoc('posts', pid);
                    if (!latest) throw new Error('Post not found');

                    const now = Date.now();
                    const commentsRaw = Array.isArray(latest.comments)
                        ? latest.comments.filter(Boolean)
                        : [];
                    const hadCaption = commentsRaw.some((comment) => comment?.isCaption);
                    const hasCaptionText = Boolean(trimmedCaption);

                    let updatedComments;
                    if (hasCaptionText) {
                        updatedComments = commentsRaw.map((comment) => (
                            comment?.isCaption
                                ? { ...comment, content: trimmedCaption, timestamp: now }
                                : { ...comment }
                        ));

                        if (!hadCaption) {
                            const authorHandleRaw = typeof latest.handle === 'string' ? latest.handle : (global?.userData?.handle || '');
                            const normalizedHandle = authorHandleRaw.startsWith('@') ? authorHandleRaw.slice(1) : authorHandleRaw;
                            const authorPfp = resolvePhotoURL(latest, userImage);
                            updatedComments.unshift({
                                content: trimmedCaption,
                                handle: normalizedHandle,
                                isCaption: true,
                                pfp: authorPfp,
                                timestamp: now,
                                uid: latest.uid || global?.userData?.uid || null,
                            });
                        }
                    } else {
                        updatedComments = commentsRaw
                            .filter((comment) => !comment?.isCaption)
                            .map((comment) => ({ ...comment }));
                    }

                    const commentCount = updatedComments.length;

                    await updateDoc('posts', pid, {
                        caption: trimmedCaption,
                        media: mediaPayload,
                        images: imagesPayload,
                        comments: updatedComments,
                        commentCount,
                        updatedAt: now,
                        type: nextPostType,
                    });

                } else {
                    const uid = viewerUid || getViewerUid();
                    if (!uid) throw new Error('Missing user UID for createPost');

                    await createPost(
                        uid,
                        global?.userData?.handle,
                        userImage,
                        trimmedCaption,
                        mediaPayload,
                        pid,
                        null,
                        { type: nextPostType }
                    );

                    await Promise.allSettled([
                        arrayAppend('usersPublic', uid, 'posts', pid),
                        arrayAppend('global', 'posts', 'PIDs', pid),
                    ]);
                }
            } catch (error) {
                console.error('sharePost failed', error);
                if (!isEditing && appendedOptimistically && global?.userData) {
                    global.userData.posts = previousPosts ?? [];
                }
                if (optimisticPostAdded) {
                    removeOptimisticFeedPost(pid);
                }
                Alert.alert('Post failed', 'We could not save your post. Please try again.');
            } finally {
                sharePromiseRef.current = null;
                if (isMountedRef.current) {
                    setIsSharing(false);
                }
            }
        };

        sharePromiseRef.current = runShare();

        const exitScreen = () => {
            if (isEditing) {
                navigation.goBack();
                return;
            }
            try {
                const { jumpToTab } = require('../../../../navigationRef');
                jumpToTab('Feed');
            } catch {
                navigation.navigate('Tabs', { screen: 'Feed' });
            }
        };

        requestAnimationFrame(exitScreen);
    }

    const shareDisabled = (!isEditing && !hasWorkoutAttachment && caption.trim().length === 0) || isSharing;
    const captionPlaceholder = hasWorkoutAttachment ? "What's popping (optional)" : "What's popping?";

    return (
        <View style={styles.main_ctnr}>
            <View style={[styles.header, { paddingTop: headerTopPadding }]}>
                <TouchableOpacity onPress={withStrongPress(goBack)} style={styles.cancel_btn} hitSlop={HIT_SLOP}>
                    <Feather name="x" size={scaleSize(20)} color={theme.textSecondary} />
                </TouchableOpacity>
                <View
                    style={[styles.header_title_ctnr, { top: headerTopPadding, bottom: headerBottomPadding }]}
                    pointerEvents="none"
                >
                    <Text style={styles.header_text}>{isEditing ? 'Edit Post' : 'New Post'}</Text>
                </View>
                <TouchableOpacity
                    onPress={withStrongPress(beginShare)}
                    style={styles.share_btn}
                    hitSlop={HIT_SLOP}
                    disabled={shareDisabled}
                >
                    <Text style={[styles.share_btn_text, shareDisabled && styles.share_btn_text_disabled]}>
                        {isSharing ? (isEditing ? 'Saving...' : 'Posting...') : (isEditing ? 'Save' : 'Post')}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.body_scrollview}
                contentContainerStyle={styles.body_content}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.compose_row}>
                    <View style={styles.avatar_ctnr}>
                        {userImage ? (
                            <FastImage
                                source={{ uri: userImage }}
                                style={styles.avatar}
                                resizeMode={FastImage.resizeMode.cover}
                            />
                        ) : (
                            <View style={styles.avatar_placeholder}>
                                <Feather name="user" size={scaleSize(20)} color={theme.textSecondary} />
                            </View>
                        )}
                    </View>
                    <View style={styles.caption_ctnr}>
                        <DismissableTextInput
                            placeholder={captionPlaceholder}
                            placeholderTextColor={theme.textSecondary}
                            value={caption}
                            onChangeText={handleCaptionChange}
                            style={styles.caption_text}
                            multiline
                            returnKeyType="default"
                        />
                        <Text
                            key={`caption-measure-${measureState.nonce}`}
                            style={[styles.caption_text, styles.caption_measure]}
                            accessible={false}
                            pointerEvents="none"
                            onTextLayout={handleCaptionMeasureLayout}
                        >
                            {measureState.text}
                        </Text>
                        {lineLimitReached && (
                            <Text style={styles.caption_limit_text}>
                                Posts can use up to {MAX_CAPTION_LINES} lines.
                            </Text>
                        )}
                    </View>
                </View>

                {hasMedia ? (
                    <View style={styles.media_carousel_wrapper}>
                        <View
                            style={[styles.media_container, mediaWidth ? { height: mediaWidth } : null]}
                            onLayout={handleMediaLayout}
                        >
                            {mediaWidth > 0 && (
                                <FlatList
                                    data={mediaList}
                                    horizontal
                                    pagingEnabled
                                    snapToInterval={mediaWidth}
                                    decelerationRate="fast"
                                    bounces={false}
                                    alwaysBounceHorizontal={false}
                                    overScrollMode="never"
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={keyExtractor}
                                    renderItem={renderMediaItem}
                                    style={styles.media_list}
                                    onScroll={handleMediaScroll}
                                    onMomentumScrollEnd={handleMediaScroll}
                                    scrollEventThrottle={16}
                                    nestedScrollEnabled
                                />
                            )}
                        </View>
                        {mediaList.length > 1 && (
                            <View style={styles.media_indicator_row} pointerEvents="none">
                                {mediaList.map((_, idx) => (
                                    <View
                                        key={`${idx}-indicator`}
                                        style={idx === mediaIndex ? styles.media_dash : styles.media_dot}
                                    />
                                ))}
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.media_manage_btn}
                            onPress={withStrongPress(isClipMode ? handleOpenClipBuilder : handleOpenSelectPhotos)}
                        >
                            <Feather
                                name={isClipMode ? 'film' : 'image'}
                                size={scaleSize(18)}
                                color={theme.primary}
                            />
                            <Text style={styles.media_manage_text}>{isClipMode ? 'Edit clip' : 'Edit media'}</Text>
                        </TouchableOpacity>
                        {isClipMode && (
                            <View style={styles.clip_badge}>
                                <Text style={styles.clip_badge_text}>Clip</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.add_media_stack}>
                        <TouchableOpacity
                            style={styles.add_media_cta}
                            onPress={withStrongPress(handleOpenSelectPhotos)}
                        >
                            <Feather name="image" size={scaleSize(22)} color={theme.primary} />
                            <Text style={styles.add_media_title}>Attatch Media (optional)</Text>
                            <Text style={styles.add_media_subtitle}>Share your progress with photos or videos</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {editingWorkoutName ? (
                    <View style={styles.edit_workout_container}>
                        <Text style={styles.edit_workout_label}>Workout</Text>
                        <Text style={styles.edit_workout_name}>{editingWorkoutName}</Text>
                    </View>
                ) : null}
            </ScrollView>

            {!isEditing && (
                <PostHonestyModal
                    visible={honestyVisible}
                    onCancel={() => setHonestyVisible(false)}
                    onConfirm={() => { setHonestyVisible(false); sharePost(); }}
                />
            )}
        </View>
    );
}

const HIT_SLOP = { top: scaleSize(8), bottom: scaleSize(8), left: scaleSize(8), right: scaleSize(8) };

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: theme.surface
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: scaleSize(18),
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: theme.bg,
        paddingBottom: headerBottomPadding,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.hairline,
        position: 'relative'
    },
    cancel_btn: {
        paddingVertical: scaleSize(6),
        paddingHorizontal: scaleSize(8)
    },
    header_title_ctnr: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center'
    },
    header_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
        textAlign: 'center',
        color: theme.textPrimary
    },
    share_btn: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    share_btn_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(14.5),
        color: theme.primary
    },
    share_btn_text_disabled: {
        color: theme.textSecondary
    },
    body_scrollview: {
        flex: 1,
        backgroundColor: theme.surface
    },
    body_content: {
        paddingHorizontal: composeHorizontalPadding,
        paddingTop: scaleSize(18),
        paddingBottom: scaleSize(40)
    },
    compose_row: {
        flexDirection: 'row'
    },
    avatar_ctnr: {
        width: avatarSize
    },
    avatar: {
        width: avatarSize,
        height: avatarSize,
        borderRadius: avatarSize / 2,
        backgroundColor: theme.surface
    },
    avatar_placeholder: {
        width: avatarSize,
        height: avatarSize,
        borderRadius: avatarSize / 2,
        backgroundColor: theme.hairline,
        alignItems: 'center',
        justifyContent: 'center'
    },
    caption_ctnr: {
        flex: 1,
        marginLeft: scaleSize(12),
        position: 'relative'
    },
    caption_text: {
        fontSize: scaleSize(17),
        fontFamily: 'Outfit_500Medium',
        color: theme.textPrimary,
        minHeight: avatarSize,
        paddingVertical: 0,
        paddingHorizontal: 0
    },
    caption_measure: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        opacity: 0,
        zIndex: -1,
        minHeight: 0
    },
    caption_limit_text: {
        marginTop: scaleSize(6),
        fontSize: scaleSize(12),
        fontFamily: 'Outfit_400Regular',
        color: theme.textSecondary
    },
    media_carousel_wrapper: {
        marginTop: scaleSize(18),
        marginHorizontal: -composeHorizontalPadding,
        alignItems: 'center'
    },
    media_container: {
        width: '100%',
        backgroundColor: theme.field,
        overflow: 'hidden'
    },
    media_list: {
        width: '100%',
        height: '100%'
    },
    media_slide: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    media_image: {
        width: '100%',
        height: '100%',
        borderRadius: 0
    },
    video_controls_overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: scaleSize(12),
    },
    video_mute_button: {
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: scaleSize(20),
        padding: scaleSize(8),
    },
    video_play_icon_wrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    video_slider_overlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: scaleSize(12),
        paddingBottom: scaleSize(10),
        paddingTop: scaleSize(6),
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    video_slider: {
        height: scaleSize(30),
    },
    video_time_row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: scaleSize(6),
    },
    video_time_text: {
        fontSize: scaleSize(11),
        color: '#fff',
        fontFamily: 'Outfit_600SemiBold',
    },
    media_indicator_row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: scaleSize(8)
    },
    media_manage_btn: {
        marginTop: scaleSize(16),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    media_manage_text: {
        marginLeft: scaleSize(8),
        color: theme.primary,
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(14)
    },
    add_media_stack: {
        marginTop: scaleSize(18)
    },
    add_media_cta: {
        marginTop: 0,
        marginHorizontal: -composeHorizontalPadding,
        paddingVertical: scaleSize(32),
        paddingHorizontal: composeHorizontalPadding,
        borderRadius: scaleSize(16),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        backgroundColor: theme.surface,
        alignItems: 'center'
    },
    add_media_title: {
        marginTop: scaleSize(12),
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
        color: theme.textPrimary
    },
    add_media_subtitle: {
        marginTop: scaleSize(6),
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(13),
        color: theme.textSecondary
    },
    clip_badge: {
        marginTop: scaleSize(12),
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: scaleSize(18),
        paddingVertical: scaleSize(6),
        borderRadius: scaleSize(20),
    },
    clip_badge_text: {
        color: theme.textPrimary,
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(13),
        letterSpacing: 0.5,
    },
    media_dot: {
        width: scaleSize(6),
        height: scaleSize(4.5),
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.22)',
        marginHorizontal: scaleSize(3)
    },
    media_dash: {
        width: scaleSize(22),
        height: scaleSize(4.5),
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.6)',
        marginHorizontal: scaleSize(3)
    },
    edit_workout_container: {
        marginTop: scaleSize(24),
        paddingHorizontal: 0,
    },
    edit_workout_label: {
        color: theme.textSecondary,
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: scaleSize(6),
    },
    edit_workout_name: {
        color: theme.primary,
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(16),
    }
});
