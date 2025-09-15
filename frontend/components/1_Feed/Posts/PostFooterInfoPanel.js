/**
 * Displays additional information about the post
 * Shows "Liked by..." or the post's caption if not liked by any friends
 * * No user interactivity
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
// No safe-area offset here; this panel sits inside the post card,
// not at the device edge.
import scaleSize from '../../../helper/scaleSize';
import FastImage from 'react-native-fast-image';
import { usePfp } from '../../../helper/usePFPs';

/* Small helper that resolves & renders a PFP with immutable caching */
const Pfp = ({ uid, version = 0, style }) => {
    const uri = usePfp(uid, version);
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

const PostFooterInfoPanel = ({ data, opacityAnim }) => {
    const following = global?.userData?.following ?? [];
    const likes = Array.isArray(data?.likes) ? data.likes : [];

    // up to 3 likes from people the user follows
    const filteredLikes = likes
        .filter(like => following.some(f => f?.uid === like?.uid))
        .slice(0, 3);

    const handles = filteredLikes.map(like => like.handle);

    return (
        <Animated.View style={[styles.container, { opacity: opacityAnim, bottom: scaleSize(12) }]} pointerEvents="none">
            <View style={styles.profilePictures}>
                {filteredLikes.length > 0 ? (
                    filteredLikes.map((like, index) => (
                        <Pfp
                            key={`${like.uid}-${index}`}
                            uid={like.uid}
                            version={like.pfpVersion ?? 0}
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
                        style={styles.profilePicture}
                    />
                )}
            </View>

            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.likedByText}>
                {filteredLikes.length > 0
                    ? `Liked by ${handles.join(', ')}`
                    : data.caption}
            </Text>
        </Animated.View>
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
