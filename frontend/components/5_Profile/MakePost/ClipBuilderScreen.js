import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import Slider from "@react-native-community/slider";
import DismissableTextInput from "../../common/DismissableTextInput";
import CroppedVideo from "../../common/CroppedVideo";
import theme from "../../../theme/mfpDark";
import { withStrongPress } from "../../../utils/haptics";
import FastImage from "react-native-fast-image";
import { resolvePhotoURL } from "../../../utils/profilePhoto";
import { addOptimisticFeedPost, removeOptimisticFeedPost } from "../../../utils/optimisticFeedPosts";
import makeID from "../../../../backend/helper/makeID";
import uploadResumableNative from "../../../../backend/storage/uploadResumableNative";
import createPost from "../../../../backend/posts/createPost";
import arrayAppend from "../../../../backend/helper/firebase/arrayAppend";
import { getViewerUid } from "../../../utils/userRefs";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const scale = SCREEN_WIDTH / 375;
const scaleSize = (value) => Math.round(value * scale);
const MAX_DURATION = 90;
const composeHorizontalPadding = scaleSize(18);
const avatarSize = scaleSize(36);

const formatClockTime = (seconds) => {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
};

const normalizeClipEntry = (entry) => {
    if (!entry) return null;
    const uri = entry.localUri || entry.uri || entry.previewUri;
    if (!uri) return null;
    const width = Number(entry.width) || 0;
    const height = Number(entry.height) || 0;
    return {
        uri,
        previewUri: entry.previewUri || uri,
        originalUri: entry.originalUri || uri,
        localUri: entry.localUri || uri,
        assetId: entry.assetId || entry.id || null,
        type: "video",
        duration: Number(entry.duration) || 0,
        width,
        height,
        aspectRatio: entry.aspectRatio || (width && height ? width / height : null),
        isClip: true,
    };
};

export default function ClipBuilderScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const mode = route?.params?.mode || "new";
    const isEditing = mode === "edit";
    const initialClip = useMemo(() => normalizeClipEntry(route?.params?.initialClip), [route?.params?.initialClip]);
    const initialCaption = typeof route?.params?.initialCaption === "string" ? route.params.initialCaption : "";
    const editingContext = route?.params?.editingContext || null;
    const [selectedClip, setSelectedClip] = useState(initialClip);
    const [captionInput, setCaptionInput] = useState(initialCaption);
    const clipSource = useMemo(() => {
        if (!selectedClip) return null;
        const clipUri = selectedClip.localUri || selectedClip.uri;
        if (!clipUri) return null;
        return typeof clipUri === "string" ? { uri: clipUri } : clipUri;
    }, [selectedClip]);
    const clipAspectRatio = useMemo(() => {
        const width = Number(selectedClip?.width) || 0;
        const height = Number(selectedClip?.height) || 0;
        const ratioFromSize = width && height ? width / height : null;
        const ratio = ratioFromSize || Number(selectedClip?.aspectRatio) || 0;
        if (!ratio || !Number.isFinite(ratio) || ratio <= 0) {
            return 9 / 16;
        }
        return ratio;
    }, [selectedClip?.width, selectedClip?.height, selectedClip?.aspectRatio]);
    const [isPaused, setIsPaused] = useState(false);
    const [videoDuration, setVideoDuration] = useState(() => Number(initialClip?.duration) || 0);
    const [videoProgress, setVideoProgress] = useState(0);
    const [areVideosMuted, setVideosMuted] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const videoRef = useRef(null);
    const scrubStateRef = useRef(false);
    const [permissionRequested, setPermissionRequested] = useState(false);
    const userImage = resolvePhotoURL(global?.userData, "");
    const captionPlaceholder = "Add caption";
    const isMountedRef = useRef(true);
    const collapseTimeoutRef = useRef(null);
    const hasCollapsedRef = useRef(false);

    const headerTitle = isEditing ? "Edit Clip" : "New Clip";

    const ensurePermission = useCallback(async () => {
        if (permissionRequested) return true;
        const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setPermissionRequested(true);
        if (!granted) {
            Alert.alert("Access needed", "Please allow photo library access to select a clip.");
            return false;
        }
        return true;
    }, [permissionRequested]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (collapseTimeoutRef.current) {
                clearTimeout(collapseTimeoutRef.current);
                collapseTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        setIsPaused(false);
        setVideoDuration(Number(selectedClip?.duration) || 0);
        setVideoProgress(0);
        scrubStateRef.current = false;
    }, [selectedClip]);

    const clearCollapseTimeout = useCallback(() => {
        if (collapseTimeoutRef.current) {
            clearTimeout(collapseTimeoutRef.current);
            collapseTimeoutRef.current = null;
        }
    }, []);

    const exitToFeed = useCallback(() => {
        try {
            const { jumpToTab } = require('../../../../navigationRef');
            if (!jumpToTab('Feed')) {
                navigation.navigate('Tabs', { screen: 'Feed' });
            }
        } catch {
            navigation.navigate('Tabs', { screen: 'Feed' });
        }
    }, [navigation]);

    const collapseComposer = useCallback(() => {
        if (hasCollapsedRef.current) return;
        hasCollapsedRef.current = true;
        clearCollapseTimeout();
        try {
            navigation.goBack();
        } catch {}
        requestAnimationFrame(exitToFeed);
    }, [clearCollapseTimeout, exitToFeed, navigation]);

    const scheduleAutoCollapse = useCallback(() => {
        if (hasCollapsedRef.current || collapseTimeoutRef.current) return;
        collapseTimeoutRef.current = setTimeout(() => {
            collapseTimeoutRef.current = null;
            collapseComposer();
        }, 900);
    }, [collapseComposer]);

    const pickVideo = useCallback(async () => {
        const permitted = await ensurePermission();
        if (!permitted) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: false,
            quality: 1,
            videoMaxDuration: MAX_DURATION,
        });

        if (result.canceled) return;
        const asset = result.assets?.[0];
        if (!asset) return;

        const rawDuration = Number(asset.duration) || 0;
        const duration = rawDuration > 400 ? rawDuration / 1000 : rawDuration;
        if (duration === 0 || duration > MAX_DURATION) {
            Alert.alert("Video too long", "Clips must be shorter than 90 seconds.");
            return;
        }

        const normalized = normalizeClipEntry({
            uri: asset.uri,
            previewUri: asset.uri,
            originalUri: asset.uri,
            localUri: asset.uri,
            assetId: asset.assetId,
            duration,
            width: Number(asset.width) || 0,
            height: Number(asset.height) || 0,
        });
        setSelectedClip(normalized);
    }, [ensurePermission]);

    const toggleVideoPlayback = useCallback(() => {
        if (!clipSource) return;
        setIsPaused((prev) => !prev);
    }, [clipSource]);

    const toggleVideoMute = useCallback(() => {
        setVideosMuted((prev) => !prev);
    }, []);

    const handleVideoLoad = useCallback(
        (meta) => {
            const duration = Number(meta?.duration) || Number(selectedClip?.duration) || 0;
            if (duration) {
                setVideoDuration(duration);
            }
            setVideoProgress(0);
        },
        [selectedClip?.duration]
    );

    const handleVideoProgress = useCallback((event) => {
        const seconds = Number(event?.currentTime);
        if (!Number.isFinite(seconds)) return;
        setVideoProgress(seconds);
    }, []);

    const ensureClipVideoAsset = useCallback(async (entry) => {
        if (!entry) return null;

        const ensureFileScheme = (uri) => (uri && uri.startsWith('file://') ? uri : null);
        let assetInfo = null;
        const loadAssetInfo = async () => {
            if (assetInfo || !entry.assetId) return assetInfo;
            try {
                assetInfo = await MediaLibrary.getAssetInfoAsync(entry.assetId);
            } catch (error) {
                console.warn('[ClipBuilder] getAssetInfoAsync failed', error);
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
                console.warn('[ClipBuilder] copyAsync failed for video', error);
                fileUri = ensureFileScheme(fallbackUri);
            }
        }

        if (!fileUri) {
            throw new Error('Unable to resolve video file for upload');
        }

        const info = await FileSystem.getInfoAsync(fileUri).catch(() => null);
        const size = info?.size && Number.isFinite(info.size) ? info.size : null;
        const mime = normalizedExt === 'mov' ? 'video/quicktime' : 'video/mp4';

        return {
            fileUri,
            ext: normalizedExt,
            mime,
            size,
        };
    }, []);

    const beginScrub = useCallback(() => {
        scrubStateRef.current = !isPaused;
        setIsPaused(true);
    }, [isPaused]);

    const handleScrubChange = useCallback((value) => {
        if (!Number.isFinite(value)) return;
        setVideoProgress(value);
    }, []);

    const finishScrub = useCallback((value) => {
        if (!Number.isFinite(value)) return;
        videoRef.current?.seek?.(value, 0);
        setVideoProgress(value);
        if (scrubStateRef.current) {
            setIsPaused(false);
        }
    }, []);

    const sliderValue = Math.min(videoDuration || Number.MAX_SAFE_INTEGER, videoProgress);
    const resolvedPaused = !clipSource || isPaused;

    const postClip = useCallback(async () => {
        if (isPosting) return;
        if (!selectedClip) {
            Alert.alert('No clip selected', 'Please choose a clip video first.');
            return;
        }
        const trimmedCaption = captionInput.trim();
        if (!trimmedCaption) {
            Alert.alert('Caption required', 'Please enter a caption before posting.');
            return;
        }

        const uid = getViewerUid();
        if (!uid) {
            Alert.alert('Unable to post', 'Please try again after logging in.');
            return;
        }

        setIsPosting(true);
        scheduleAutoCollapse();
        const pid = makeID();
        const previousPosts = global?.userData && Array.isArray(global.userData.posts)
            ? [...global.userData.posts]
            : null;
        let appendedOptimistically = false;
        if (global?.userData) {
            const existing = Array.isArray(global.userData.posts) ? global.userData.posts : [];
            if (!existing.includes(pid)) {
                global.userData.posts = [...existing, pid];
                appendedOptimistically = true;
            }
        }
        let optimisticPostAdded = false;
        const localClipUri = selectedClip?.localUri || selectedClip?.uri || selectedClip?.previewUri || null;
        if (localClipUri) {
            const now = Date.now();
            try {
                addOptimisticFeedPost({
                    pid,
                    uid,
                    handle: typeof global?.userData?.handle === 'string' ? global.userData.handle : '',
                    name: typeof global?.userData?.name === 'string' ? global.userData.name : '',
                    pfp: userImage,
                    pfpVersion: Number(global?.userData?.pfpVersion ?? 0),
                    caption: trimmedCaption,
                    media: [{
                        uri: localClipUri,
                        type: 'video',
                        duration: Number(selectedClip?.duration) || 0,
                        cropRect: null,
                        isClip: true,
                        aspectRatio: selectedClip?.aspectRatio
                            || ((selectedClip?.width && selectedClip?.height)
                                ? (selectedClip.width / selectedClip.height)
                                : null),
                    }],
                    images: [],
                    type: 'clip',
                    created: now,
                    createdAt: now,
                    sortKey: now,
                    likes: [],
                    likeCount: 0,
                    comments: trimmedCaption
                        ? [{
                            content: trimmedCaption,
                            handle: typeof global?.userData?.handle === 'string' ? global.userData.handle : '',
                            isCaption: true,
                            pfp: userImage,
                            timestamp: now,
                            uid,
                        }]
                        : [],
                    commentCount: trimmedCaption ? 1 : 0,
                    pendingUpload: true,
                });
                optimisticPostAdded = true;
            } catch (error) {
                console.warn?.('[ClipBuilder] Failed to add optimistic clip', error);
            }
        }

        try {
            const preparedVideo = await ensureClipVideoAsset(selectedClip);
            if (!preparedVideo?.fileUri) throw new Error('Unable to resolve video for upload');
            const uploadId = makeID();
            const path = `posts/${pid}-${uploadId}.${preparedVideo.ext || 'mp4'}`;
            const { url } = await uploadResumableNative({
                fileUri: preparedVideo.fileUri,
                path,
                mime: preparedVideo.mime || 'video/mp4',
                size: preparedVideo.size,
            });

            const width = Number(selectedClip?.width) || 0;
            const height = Number(selectedClip?.height) || 0;
            const aspectRatio = selectedClip?.aspectRatio || (width && height ? (width / height) : null);

            const mediaPayload = [{
                uri: url,
                type: 'video',
                duration: Number(selectedClip?.duration) || 0,
                cropRect: null,
                isClip: true,
                aspectRatio: aspectRatio || null,
            }];

            const viewerHandle = global?.userData?.handle;
            const viewerPhoto = userImage;

            await createPost(uid, viewerHandle, viewerPhoto, trimmedCaption, mediaPayload, pid, null, { type: 'clip' });
            await Promise.allSettled([
                arrayAppend('usersPublic', uid, 'posts', pid),
                arrayAppend('global', 'posts', 'PIDs', pid),
            ]);

            collapseComposer();
        } catch (error) {
            console.error('[ClipBuilder] share failed', error);
            if (global?.userData && previousPosts) {
                global.userData.posts = previousPosts;
            }
            if (optimisticPostAdded) {
                removeOptimisticFeedPost(pid);
            }
            clearCollapseTimeout();
            Alert.alert('Post failed', 'We could not save your clip. Please try again.');
        } finally {
            if (isMountedRef.current) {
                setIsPosting(false);
            }
        }
    }, [captionInput, clearCollapseTimeout, collapseComposer, ensureClipVideoAsset, isPosting, scheduleAutoCollapse, selectedClip, userImage]);

    const handleSave = useCallback(() => {
        if (!selectedClip) {
            Alert.alert("No clip selected", "Please choose a clip video first.");
            return;
        }
        if (!isEditing) {
            postClip();
            return;
        }
        navigation.navigate({
            name: "PostOptions",
            params: {
                clipMedia: selectedClip,
                clipCaption: captionInput,
                ...(editingContext || {}),
            },
            merge: true,
        });
    }, [captionInput, editingContext, isEditing, navigation, postClip, selectedClip]);

    const clearSelection = useCallback(() => {
        setSelectedClip(null);
        setVideosMuted(true);
        setIsPaused(false);
        setVideoDuration(0);
        setVideoProgress(0);
    }, []);

    const headerActionLabel = isEditing
        ? (isPosting ? "Saving..." : "Save")
        : (isPosting ? "Posting..." : "Post");
    const headerActionDisabled = !selectedClip || isPosting;

    const headerTopPadding = insets.top + scaleSize(4);
    const headerBottomPadding = scaleSize(12);

    return (
        <View style={styles.main}>
            <View style={[styles.header, { paddingTop: headerTopPadding, paddingBottom: headerBottomPadding }]}>
                <TouchableOpacity onPress={withStrongPress(() => navigation.goBack())} style={styles.header_btn}>
                    <Feather name="chevron-left" size={scaleSize(22)} color={theme.textSecondary} />
                </TouchableOpacity>
                <View
                    style={[
                        styles.header_title_ctnr,
                        {
                            top: headerTopPadding,
                            bottom: headerBottomPadding,
                        },
                    ]}
                    pointerEvents="none"
                >
                    <Text style={styles.header_title}>{headerTitle}</Text>
                </View>
                <TouchableOpacity
                    onPress={withStrongPress(handleSave)}
                    style={styles.header_action_btn}
                    disabled={headerActionDisabled}
                >
                    <Text
                        style={[
                            styles.header_action_text,
                            headerActionDisabled && styles.header_action_text_disabled,
                        ]}
                    >
                        {headerActionLabel}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.body}>
                <ScrollView
                    contentContainerStyle={styles.body_content}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View style={styles.caption_block}>
                        <View style={styles.caption_row}>
                            <View style={styles.avatar_ctnr}>
                                {userImage ? (
                                    <FastImage
                                        source={{
                                            uri: userImage,
                                            priority: FastImage.priority.normal,
                                            cache: FastImage.cacheControl.immutable,
                                        }}
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
                                    style={styles.caption_text}
                                    multiline
                                    maxLength={2200}
                                    value={captionInput}
                                    onChangeText={setCaptionInput}
                                    autoCapitalize="sentences"
                                    autoCorrect
                                    textAlignVertical="top"
                                    keyboardAppearance="dark"
                                    returnKeyType="default"
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.media_block}>
                        {selectedClip ? (
                            <View style={styles.previewWrapper}>
                                <View style={[styles.videoStage, { aspectRatio: clipAspectRatio }]}>
                            <Pressable
                                style={styles.video_pressable}
                                onPress={toggleVideoPlayback}
                            >
                                <CroppedVideo
                                    ref={videoRef}
                                    source={clipSource}
                                    style={styles.previewVideo}
                                    paused={resolvedPaused}
                                    resizeMode="contain"
                                    repeat
                                    muted={areVideosMuted}
                                    onLoad={handleVideoLoad}
                                    onProgress={handleVideoProgress}
                                />
                                {resolvedPaused && (
                                    <View style={styles.video_play_icon_wrap} pointerEvents="none">
                                        <FontAwesome6 name="circle-play" size={scaleSize(56)} color="#fff" />
                                    </View>
                                )}
                            </Pressable>
                            {videoDuration > 0 && (
                                <View style={styles.video_slider_overlay}>
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
                                        onSlidingStart={beginScrub}
                                        onValueChange={handleScrubChange}
                                        onSlidingComplete={finishScrub}
                                    />
                                </View>
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
                                        name={areVideosMuted ? "volume-off" : "volume-high"}
                                        size={scaleSize(18)}
                                        color="#fff"
                                    />
                                </Pressable>
                            </View>
                        </View>
                        <Text style={styles.previewMeta}>
                            {Math.round((selectedClip.duration || 0) * 10) / 10}s
                        </Text>
                        <TouchableOpacity
                            style={styles.clear_btn}
                            onPress={withStrongPress(clearSelection)}
                        >
                            <Feather name="trash-2" size={scaleSize(16)} color={theme.error || "#EF4444"} />
                            <Text style={styles.clear_btn_text}>Remove video</Text>
                        </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.placeholder, styles.placeholder_full]}
                                onPress={withStrongPress(pickVideo)}
                                activeOpacity={0.82}
                            >
                                <Feather name="video" size={scaleSize(22)} color={theme.primary} />
                                <Text style={styles.placeholder_title}>Add a video</Text>
                                <Text style={styles.placeholder_text}>
                                    Share a single clip under 90 seconds.
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    main: {
        flex: 1,
        backgroundColor: theme.surface,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(18),
        paddingBottom: scaleSize(12),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        position: "relative",
    },
    header_btn: {
        width: scaleSize(40),
        height: scaleSize(32),
        alignItems: "center",
        justifyContent: "center",
    },
    header_title_ctnr: {
        position: "absolute",
        left: 0,
        right: 0,
        top: scaleSize(4),
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    header_title: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(16),
        color: theme.textPrimary,
        textAlign: "center",
    },
    header_action_btn: {
        minWidth: scaleSize(48),
        alignItems: "flex-end",
        justifyContent: "center",
        paddingVertical: scaleSize(6),
    },
    header_action_text: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(16),
        color: theme.primary,
    },
    header_action_text_disabled: {
        color: "rgba(148,163,184,0.6)",
    },
    body: {
        flex: 1,
    },
    body_content: {
        paddingHorizontal: composeHorizontalPadding,
        paddingTop: scaleSize(18),
        paddingBottom: scaleSize(48),
        flexGrow: 1,
    },
    media_block: {
        marginTop: scaleSize(18),
        marginHorizontal: -composeHorizontalPadding,
    },
    previewWrapper: {
        marginBottom: scaleSize(12),
    },
    videoStage: {
        width: "100%",
        aspectRatio: 9 / 16,
        backgroundColor: "#000",
        position: "relative",
        borderRadius: 0,
        overflow: "hidden",
    },
    video_pressable: {
        width: "100%",
        height: "100%",
    },
    previewVideo: {
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
    },
    video_play_icon_wrap: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    video_slider_overlay: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: scaleSize(12),
        paddingBottom: scaleSize(10),
        paddingTop: scaleSize(6),
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    video_slider: {
        height: scaleSize(30),
    },
    video_time_row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: scaleSize(6),
    },
    video_time_text: {
        fontSize: scaleSize(11),
        color: "#fff",
        fontFamily: "Outfit_600SemiBold",
    },
    video_controls_overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "flex-start",
        alignItems: "flex-end",
        padding: scaleSize(12),
    },
    video_mute_button: {
        width: scaleSize(36),
        height: scaleSize(36),
        borderRadius: scaleSize(18),
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
    },
    previewMeta: {
        paddingVertical: scaleSize(12),
        paddingHorizontal: composeHorizontalPadding,
        fontFamily: "Outfit_600SemiBold",
        color: theme.textPrimary,
    },
    clear_btn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: scaleSize(12),
        paddingHorizontal: composeHorizontalPadding,
    },
    clear_btn_text: {
        fontFamily: "Outfit_600SemiBold",
        color: theme.error || "#EF4444",
        fontSize: scaleSize(14),
        marginLeft: scaleSize(6),
    },
    placeholder: {
        borderRadius: scaleSize(16),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.hairline,
        paddingVertical: scaleSize(32),
        paddingHorizontal: composeHorizontalPadding,
        alignItems: "center",
        marginBottom: scaleSize(16),
        backgroundColor: theme.surface,
    },
    placeholder_full: {
        marginHorizontal: 0,
        alignSelf: "stretch",
    },
    placeholder_title: {
        marginTop: scaleSize(12),
        fontFamily: "Outfit_600SemiBold",
        fontSize: scaleSize(16),
        color: theme.textPrimary,
    },
    placeholder_text: {
        marginTop: scaleSize(6),
        fontFamily: "Outfit_500Medium",
        color: theme.textSecondary,
        fontSize: scaleSize(13),
        textAlign: "center",
    },
    caption_block: {
        marginTop: 0,
        paddingHorizontal: 0,
    },
    caption_row: {
        flexDirection: "row",
    },
    avatar_ctnr: {
        width: avatarSize,
    },
    avatar: {
        width: avatarSize,
        height: avatarSize,
        borderRadius: avatarSize / 2,
        backgroundColor: theme.surface,
    },
    avatar_placeholder: {
        width: avatarSize,
        height: avatarSize,
        borderRadius: avatarSize / 2,
        backgroundColor: theme.hairline,
        alignItems: "center",
        justifyContent: "center",
    },
    caption_ctnr: {
        flex: 1,
        marginLeft: scaleSize(12),
    },
    caption_text: {
        fontSize: scaleSize(17),
        fontFamily: "Outfit_500Medium",
        color: theme.textPrimary,
        minHeight: avatarSize,
        paddingVertical: 0,
        paddingHorizontal: 0,
    },
});
