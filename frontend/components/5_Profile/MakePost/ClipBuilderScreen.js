import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Alert, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Slider from "@react-native-community/slider";
import FastImage from "react-native-fast-image";
import DismissableTextInput from "../../common/DismissableTextInput";
import CroppedVideo from "../../common/CroppedVideo";
import theme from "../../../theme/mfpDark";
import { withStrongPress } from "../../../utils/haptics";
import { resolvePhotoURL } from "../../../utils/profilePhoto";
import { addOptimisticFeedPost, removeOptimisticFeedPost } from "../../../utils/optimisticFeedPosts";
import makeID from "../../../../backend/helper/makeID";
import uploadResumableNative from "../../../../backend/storage/uploadResumableNative";
import createPost from "../../../../backend/posts/createPost";
import arrayAppend from "../../../../backend/helper/firebase/arrayAppend";
import { jumpToTab } from "../../../../navigationRef";
import { scaleWidth375 } from "../../../helper/scaleSize";
import { formatClockTime } from "../../../utils/date";
import { getViewerUid } from "../../../utils/userRefs";
import { ensureClipVideoAsset } from "./videoUploadAsset";
import styles from "./ClipBuilderScreen.styles";

const MAX_DURATION = 90;

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
        if (global?.userData) {
            const existing = Array.isArray(global.userData.posts) ? global.userData.posts : [];
            if (!existing.includes(pid)) {
                global.userData.posts = [...existing, pid];
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

    const headerTopPadding = insets.top + scaleWidth375(4);
    const headerBottomPadding = scaleWidth375(12);

    return (
        <View style={styles.main}>
            <View style={[styles.header, { paddingTop: headerTopPadding, paddingBottom: headerBottomPadding }]}>
                <TouchableOpacity onPress={withStrongPress(() => navigation.goBack())} style={styles.header_btn}>
                    <Feather name="chevron-left" size={scaleWidth375(22)} color={theme.textSecondary} />
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
                                        <Feather name="user" size={scaleWidth375(20)} color={theme.textSecondary} />
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
                                        <FontAwesome6 name="circle-play" size={scaleWidth375(56)} color="#fff" />
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
                                        size={scaleWidth375(18)}
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
                            <Feather name="trash-2" size={scaleWidth375(16)} color={theme.error || "#EF4444"} />
                            <Text style={styles.clear_btn_text}>Remove video</Text>
                        </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.placeholder, styles.placeholder_full]}
                                onPress={withStrongPress(pickVideo)}
                                activeOpacity={0.82}
                            >
                                <Feather name="video" size={scaleWidth375(22)} color={theme.primary} />
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
