import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Image, Dimensions, FlatList, Alert } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import FastImage from 'react-native-fast-image';
import makeID from "../../../../backend/helper/makeID";
// Storage handled via native resumable helper to avoid RN Blob issues
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

export default function PostOptionsScreen({ navigation, route }) {
    const editingPost = route?.params?.editingPost || null;
    const isEditing = Boolean(editingPost?.pid);
    const editingPid = isEditing ? String(editingPost.pid) : null;

    const routeImages = useMemo(() => {
        const incoming = route?.params?.images;
        if (Array.isArray(incoming) && incoming.length > 0) {
            return incoming.filter(Boolean);
        }
        if (isEditing) {
            const fromMedia = Array.isArray(editingPost?.media)
                ? editingPost.media.map((entry) => (typeof entry === "string" ? entry : entry?.uri)).filter(Boolean)
                : [];
            const fromImages = Array.isArray(editingPost?.images)
                ? editingPost.images.map((entry) => (typeof entry === "string" ? entry : entry?.uri)).filter(Boolean)
                : [];
            return Array.from(new Set([...fromMedia, ...fromImages]));
        }
        return Array.isArray(incoming) ? incoming.filter(Boolean) : [];
    }, [route?.params?.images, isEditing, editingPost]);
    const workoutParam = route?.params?.workout;

    const [caption, setCaption] = useState(() => (isEditing && typeof editingPost?.caption === 'string') ? editingPost.caption : '');
    const [isSharing, setIsSharing] = useState(false);
    const [honestyVisible, setHonestyVisible] = useState(false);
    const [mediaIndex, setMediaIndex] = useState(0);
    const [mediaWidth, setMediaWidth] = useState(screenWidth);
    const [selectedImages, setSelectedImages] = useState(routeImages);
    const sharePromiseRef = useRef(null);
    const isMountedRef = useRef(true);
    const insets = useSafeAreaInsets();
    const headerTopPadding = useMemo(() => scaleSize(6) + Math.max(0, insets.top), [insets.top]);
    const userImage = global?.userData?.image;
    const captionLastValidRef = useRef('');
    const [measureState, setMeasureState] = useState({ text: ' ', nonce: 0 });
    const measureRequestRef = useRef(null);
    const [lineLimitReached, setLineLimitReached] = useState(false);

    useEffect(() => {
        setSelectedImages(routeImages);
    }, [routeImages]);

    const mediaList = useMemo(
        () => (Array.isArray(selectedImages) ? selectedImages.filter(Boolean) : []),
        [selectedImages]
    );
    const hasMedia = mediaList.length > 0;

    const keyExtractor = useCallback((item, idx) => `${item}-${idx}`, []);

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

    const renderMediaItem = useCallback(({ item }) => (
        <View style={[styles.media_slide, { width: mediaWidth, height: mediaWidth }]}>
            <Image
                source={{ uri: item }}
                style={styles.media_image}
                resizeMode="cover"
            />
        </View>
    ), [mediaWidth]);

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
        } else {
            setHonestyVisible(true);
        }
    };

    const handleOpenSelectPhotos = useCallback(() => {
        const params = { initialImages: mediaList };
        if (typeof workoutParam !== 'undefined') params.workout = workoutParam;
        navigation.navigate('SelectPhotos', params);
    }, [mediaList, navigation, workoutParam]);

    async function sharePost() {
        if (isSharing || sharePromiseRef.current) return;

        const trimmedCaption = caption.trim();
        if (!trimmedCaption) {
            Alert.alert('Caption required', 'Please enter a caption before saving.');
            return;
        }

        if (isEditing && !editingPid) {
            Alert.alert('Unable to edit post', 'Missing post identifier.');
            return;
        }

        setIsSharing(true);

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

        const runShare = async () => {
            try {
                const processedMedia = await Promise.all(currentImages.map(async (image, index) => {
                    const uri = typeof image === 'string' ? image : image?.uri;
                    if (!uri) return null;

                    if (/^https?:\/\//i.test(uri)) {
                        return { index, uri };
                    }

                    try {
                        let compressedUri = await compressUnder250KB(uri);
                        if (!compressedUri || !compressedUri.startsWith('file://')) {
                            const tmp = await ImageManipulator.manipulateAsync(
                                compressedUri || uri,
                                [],
                                { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
                            );
                            compressedUri = tmp?.uri;
                        }

                        const withoutQuery = (compressedUri || '').split('?')[0];
                        const match = withoutQuery.match(/\.([a-zA-Z0-9]+)$/);
                        const ext = (match ? match[1] : 'jpg').toLowerCase();
                        const mime = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');

                        const id = makeID();
                        const path = `posts/${pid}-${id}.${ext}`;
                        const { url } = await uploadResumableNative({ fileUri: compressedUri, path, mime });
                        return { index, uri: url };
                    } catch (error) {
                        console.error(`Error processing image ${index + 1}:`, error);
                        return null;
                    }
                }));

                const media = processedMedia
                    .filter(Boolean)
                    .sort((a, b) => a.index - b.index)
                    .map(({ uri }) => ({ uri, type: 'image' }));

                if (isEditing) {
                    const latest = await readDoc('posts', pid);
                    if (!latest) throw new Error('Post not found');

                    const now = Date.now();
                    const commentsRaw = Array.isArray(latest.comments) ? latest.comments : [];
                    const hadCaption = commentsRaw.some((comment) => comment?.isCaption);
                    const updatedComments = commentsRaw.map((comment) => (
                        comment?.isCaption
                            ? { ...comment, content: trimmedCaption, timestamp: now }
                            : { ...comment }
                    ));

                    if (!hadCaption) {
                        const authorHandleRaw = typeof latest.handle === 'string' ? latest.handle : (global?.userData?.handle || '');
                        const normalizedHandle = authorHandleRaw.startsWith('@') ? authorHandleRaw.slice(1) : authorHandleRaw;
                        updatedComments.unshift({
                            content: trimmedCaption,
                            handle: normalizedHandle,
                            isCaption: true,
                            pfp: latest.pfp || global?.userData?.image || '',
                            timestamp: now,
                            uid: latest.uid || global?.userData?.uid || null,
                        });
                    }

                let commentCount = Number(latest.commentCount);
                if (!Number.isFinite(commentCount)) {
                    commentCount = updatedComments.length;
                } else if (!hadCaption) {
                    commentCount += 1;
                }

                    await updateDoc('posts', pid, {
                        caption: trimmedCaption,
                        media,
                        images: media.map((entry) => entry.uri),
                        comments: updatedComments,
                        commentCount,
                        updatedAt: now,
                    });

                    navigation.goBack();
                } else {
                    const uid = global?.userData?.uid;
                    if (!uid) throw new Error('Missing user UID for createPost');

                    await createPost(
                        uid,
                        global?.userData?.handle,
                        global?.userData?.image,
                        trimmedCaption,
                        media,
                        pid,
                        null
                    );

                    await Promise.allSettled([
                        arrayAppend('users', uid, 'posts', pid),
                        arrayAppend('global', 'posts', 'PIDs', pid),
                    ]);

                    setTimeout(() => {
                        try {
                            const { jumpToTab } = require('../../../../navigationRef');
                            jumpToTab('Feed');
                        } catch {
                            navigation.navigate('Tabs', { screen: 'Feed' });
                        }
                    }, 0);
                }
            } catch (error) {
                console.error('sharePost failed', error);
                if (!isEditing && appendedOptimistically && global?.userData) {
                    global.userData.posts = previousPosts ?? [];
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
    }

    const shareDisabled = caption.trim().length === 0 || isSharing;

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
                            placeholder="What's popping?"
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
                            onPress={withStrongPress(handleOpenSelectPhotos)}
                        >
                            <Feather name="image" size={scaleSize(18)} color={theme.primary} />
                            <Text style={styles.media_manage_text}>Edit photos</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.add_media_cta}
                        onPress={withStrongPress(handleOpenSelectPhotos)}
                    >
                        <Feather name="image" size={scaleSize(22)} color={theme.primary} />
                        <Text style={styles.add_media_title}>Add photos (optional)</Text>
                        <Text style={styles.add_media_subtitle}>Share your progress with an image</Text>
                    </TouchableOpacity>
                )}
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
        fontSize: scaleSize(18),
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
    add_media_cta: {
        marginTop: scaleSize(18),
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
    }
});
