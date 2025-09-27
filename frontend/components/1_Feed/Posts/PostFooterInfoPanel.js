/**
 * Displays additional information about the post
 * Shows "Liked by..." or the post's caption if not liked by any friends
 * * No user interactivity
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
// No safe-area offset here; this panel sits inside the post card,
// not at the device edge.
import scaleSize from '../../../helper/scaleSize';
import FastImage from 'react-native-fast-image';
import { usePfp } from '../../../helper/usePFPs';

/* Small helper that resolves & renders a PFP with immutable caching */
const Pfp = ({ uid, version = 0, fallbackUri, style }) => {
    const uri = usePfp(uid, version, fallbackUri);
    return uri ? (
        <FastImage
            source={{
                uri,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable,
            }}
            style={style}
            resizeMode={FastImage.resizeMode.cover}
        />
    ) : (
        <View style={[style, styles.pfpPlaceholder]} />
    );
};

const PostFooterInfoPanel = ({ data, opacityAnim, focusModeSV, interactiveUnfocusSV }) => {
    const likes = Array.isArray(data?.likes) ? data.likes : [];

    // show at most two likes in the footer, regardless of follow state
    const visibleLikes = useMemo(() => likes.slice(0, 2), [likes]);

    const handles = useMemo(() => visibleLikes.map((like) => like?.handle ?? like?.name ?? ''), [visibleLikes]);
    const handleList = useMemo(() => handles.filter(Boolean), [handles]);

    // During unfocus, fade out interactively using shared value (0..1)
    const unfocusOpacityStyle = useAnimatedStyle(() => {
        try {
            const focusP = Math.max(0, Math.min(1, focusModeSV?.value ?? 0));
            const unfocusP = Math.max(0, Math.min(1, interactiveUnfocusSV?.value ?? 0));
            // Fade IN with focus progress, fade OUT with unfocus progress
            const op = focusP * (1 - unfocusP);
            return { opacity: op };
        } catch {
            return {};
        }
    });

    return (
        <Reanimated.View style={[styles.container, unfocusOpacityStyle]} pointerEvents="none">
            <View style={styles.profilePictures}>
                {visibleLikes.length > 0 ? (
                    visibleLikes.map((like, index) => (
                        <Pfp
                            key={`${like.uid}-${index}`}
                            uid={like.uid}
                            version={like.pfpVersion ?? 0}
                            fallbackUri={
                                like?.pfp ||
                                like?.pfpUrl ||
                                like?.image ||
                                like?.photoURL ||
                                like?.avatar ||
                                ""
                            }
                            style={[
                                styles.profilePicture,
                                index === 0
                                    ? styles.profilePicture1
                                    : index === 1
                                        ? styles.profilePicture2
                                        : styles.profilePicture3,
                            ]}
                        />
                    ))
                ) : (
                    <Pfp
                        uid={data.uid}
                        version={data.pfpVersion ?? 0}
                        fallbackUri={
                            data?.pfp ||
                            data?.pfpUrl ||
                            data?.image ||
                            data?.photoURL ||
                            ""
                        }
                        style={styles.profilePicture}
                    />
                )}
            </View>

            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.likedByText}>
                {visibleLikes.length > 0
                    ? `Liked by ${handleList.length > 0 ? handleList.join(', ') : 'someone'}`
                    : data.caption}
            </Text>
        </Reanimated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: scaleSize(12),
        left: scaleSize(22),
        right: scaleSize(13),
        flexDirection: 'row',
        alignItems: 'center',
    },
    profilePictures: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profilePicture: {
        width: scaleSize(28),
        aspectRatio: 1,
        borderRadius: scaleSize(12),
        borderWidth: scaleSize(2),
        borderColor: '#fff',
    },
    profilePicture1: {
        zIndex: 3,
    },
    profilePicture2: {
        marginLeft: scaleSize(-8),
        zIndex: 2,
    },
    profilePicture3: {
        marginLeft: scaleSize(-8),
        zIndex: 1,
    },
    pfpPlaceholder: {
        backgroundColor: '#EEE',
    },
    likedByText: {
        marginLeft: scaleSize(8),
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: scaleSize(12.5),
        width: '85%',
    },
});

export default PostFooterInfoPanel;
