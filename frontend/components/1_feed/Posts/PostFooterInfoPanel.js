/**
 * Displays additional information about the post
 * Shows "Liked by..." or the post's caption if not liked by any friends
 * * No user interactivity
 */

import React from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';

const PostFooterInfoPanel = ({ data, opacityAnim }) => {
    // Filter the likes to find those who are also in the user's following list
    const filteredLikes = data.likes.filter(like =>
        global.userData.following.some(following => following.uid === like.uid)
    ).slice(0, 3); // Take up to 3 elements

    // Extract the handles of the filtered likes
    const handles = filteredLikes.map(like => like.handle);

    return (
        <Animated.View style={[styles.container, { opacity: opacityAnim }]}>
            <View style={styles.profilePictures}>
                {filteredLikes.length > 0 ? (
                    filteredLikes.map((like, index) => (
                        <Image
                            key={index}
                            source={{ uri: like.pfp }}
                            style={[
                                styles.profilePicture,
                                index === 0 ? styles.profilePicture1 : index === 1 ? styles.profilePicture2 : styles.profilePicture3
                            ]}
                        />
                    ))
                ) : (
                    <Image
                        source={{ uri: data.pfp }}
                        style={styles.profilePicture}
                    />
                )}
            </View>
            <Text numberOfLines={1} ellipsizeMode='tail' style={styles.likedByText}>
                {filteredLikes.length > 0 ? `Liked by ${handles.join(', ')}` : data.caption}
            </Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 12,
        left: 22,
        right: 13,
        flexDirection: 'row',
        alignItems: 'center',
    },
    profilePictures: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profilePicture: {
        width: 28,
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
    },
    profilePicture1: {
        zIndex: 3,
    },
    profilePicture2: {
        marginLeft: -8,
        zIndex: 2,
    },
    profilePicture3: {
        marginLeft: -8,
        zIndex: 1,
    },
    likedByText: {
        marginLeft: 8,
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: 12.5,
        width: '85%'
    },
});

export default PostFooterInfoPanel;
