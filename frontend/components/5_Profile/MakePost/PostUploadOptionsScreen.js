import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, Image, Dimensions } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import makeID from "../../../../backend/helper/makeID";
// Storage handled via native resumable helper to avoid RN Blob issues
import * as ImageManipulator from 'expo-image-manipulator';
import uploadResumableNative from "../../../../backend/storage/uploadResumableNative";
import createPost from "../../../../backend/posts/createPost";
import arrayAppend from "../../../../backend/helper/firebase/arrayAppend";
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
const mediaSpacing = scaleSize(8);
const mediaImageWidth = Math.round((screenWidth - composeHorizontalPadding * 2 - mediaSpacing) / 2);
const mediaImageHeight = Math.round(mediaImageWidth * 1.1);
const singleImageWidth = screenWidth - composeHorizontalPadding * 2;
const singleImageHeight = Math.round(singleImageWidth * 0.75);
const avatarSize = scaleSize(42);

export default function PostOptionsScreen({ navigation, route }) {
    const { images = [] } = route.params ?? {};

    const [caption, setCaption] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [honestyVisible, setHonestyVisible] = useState(false);
    const sharePromiseRef = useRef(null);
    const isMountedRef = useRef(true);
    const insets = useSafeAreaInsets();
    const headerTopPadding = useMemo(() => scaleSize(6) + Math.max(0, insets.top), [insets.top]);
    const userImage = global?.userData?.image;

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            sharePromiseRef.current = null;
        };
    }, []);

    function goBack() {
        navigation.goBack();
    }

    const beginShare = () => setHonestyVisible(true);

    async function sharePost() {
        if (isSharing || sharePromiseRef.current) return;
        if (!images || images.length === 0) return;

        setIsSharing(true);

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

        const runShare = async () => {
            try {
                const uploads = await Promise.all(images.map(async (image, index) => {
                    try {
                        let compressedUri = await compressUnder250KB(image);
                        if (!compressedUri || !compressedUri.startsWith('file://')) {
                            const tmp = await ImageManipulator.manipulateAsync(
                                compressedUri || image,
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
                        return { index, url };
                    } catch (error) {
                        console.error(`Error processing image ${index + 1}:`, error);
                        return null;
                    }
                }));

                const media = uploads
                    .filter(Boolean)
                    .sort((a, b) => a.index - b.index)
                    .map(({ url }) => ({ uri: url, type: 'image' }));

                if (media.length === 0) {
                    throw new Error('No media uploaded successfully');
                }

                const uid = global?.userData?.uid;
                if (!uid) throw new Error('Missing user UID for createPost');

                await createPost(
                    uid,
                    global?.userData?.handle,
                    global?.userData?.image,
                    caption,
                    media,
                    pid,
                    null
                );

                await Promise.allSettled([
                    arrayAppend('users', uid, 'posts', pid),
                    arrayAppend('global', 'posts', 'PIDs', pid),
                ]);
            } catch (error) {
                console.error('sharePost failed', error);
                if (appendedOptimistically && global?.userData) {
                    global.userData.posts = previousPosts ?? [];
                }
            } finally {
                sharePromiseRef.current = null;
                if (isMountedRef.current) {
                    setIsSharing(false);
                }
            }
        };

        sharePromiseRef.current = runShare();

        setTimeout(() => {
            try {
                const { jumpToTab } = require('../../../../navigationRef');
                jumpToTab('Feed');
            } catch {
                navigation.navigate('Tabs', { screen: 'Feed' });
            }
        }, 0);
    }

    const shareDisabled = caption.length === 0 || isSharing;

    return (
        <View style={styles.main_ctnr}>
            <View style={[styles.header, { paddingTop: headerTopPadding }]}>
                <TouchableOpacity onPress={withStrongPress(goBack)} style={styles.cancel_btn}>
                    <Text style={styles.cancel_text}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.header_text}>New Post</Text>
                <TouchableOpacity
                    onPress={withStrongPress(beginShare)}
                    style={[styles.share_btn, shareDisabled && styles.share_btn_disabled]}
                    disabled={shareDisabled}
                >
                    <Text style={styles.share_btn_text}>{isSharing ? 'Posting...' : 'Post'}</Text>
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
                            <Image source={{ uri: userImage }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatar_placeholder}>
                                <Feather name="user" size={scaleSize(20)} color={theme.textSecondary} />
                            </View>
                        )}
                    </View>
                    <View style={styles.caption_ctnr}>
                        <DismissableTextInput
                            placeholder="What's happening?"
                            placeholderTextColor={theme.textSecondary}
                            value={caption}
                            onChangeText={setCaption}
                            style={styles.caption_text}
                            multiline
                            returnKeyType="default"
                            maxLength={280}
                        />
                    </View>
                </View>

                {images.length > 0 && (
                    <View style={styles.media_grid}>
                        {images.map((uri, index) => (
                            <Image
                                key={`${uri}-${index}`}
                                source={{ uri }}
                                style={[
                                    images.length === 1 ? styles.media_image_single : styles.media_image,
                                    images.length > 1 && index % 2 === 0 ? styles.media_image_left : null
                                ]}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>

            <PostHonestyModal
                visible={honestyVisible}
                onCancel={() => setHonestyVisible(false)}
                onConfirm={() => { setHonestyVisible(false); sharePost(); }}
            />
        </View>
    );
}

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
        paddingBottom: scaleSize(12),
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.hairline
    },
    cancel_btn: {
        paddingVertical: scaleSize(6),
        paddingHorizontal: scaleSize(8)
    },
    cancel_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(14),
        color: theme.textSecondary
    },
    header_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
        textAlign: 'center',
        color: theme.textPrimary
    },
    share_btn: {
        minWidth: scaleSize(75),
        paddingHorizontal: scaleSize(14),
        height: scaleSize(32),
        borderRadius: scaleSize(16),
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center'
    },
    share_btn_text: {
        fontFamily: 'Outfit_700Bold',
        fontSize: scaleSize(14.5),
        color: '#fff'
    },
    share_btn_disabled: {
        opacity: 0.4
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
        marginLeft: scaleSize(12)
    },
    caption_text: {
        fontSize: scaleSize(18),
        fontFamily: 'Outfit_500Medium',
        color: theme.textPrimary,
        minHeight: avatarSize
    },
    media_grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: scaleSize(18)
    },
    media_image: {
        width: mediaImageWidth,
        height: mediaImageHeight,
        borderRadius: scaleSize(12),
        marginBottom: mediaSpacing,
        backgroundColor: theme.bg
    },
    media_image_single: {
        width: singleImageWidth,
        height: singleImageHeight,
        borderRadius: scaleSize(16),
        backgroundColor: theme.bg
    },
    media_image_left: {
        marginRight: mediaSpacing
    }
});
