import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';
import getDisplayTime from '../../../helper/getDisplayTime';
import followUser from '../../../../backend/user/followUser';
import unfollowUser from '../../../../backend/user/unfollowUser';

function getDisplayMessage(item) {
    switch (item.type) {
        case 'follow':
            return 'followed you';
        case 'liked-post':
            return 'liked your post';
        case 'liked-comment':
            return `liked your comment "${item.content}"`
        case 'comment':
            return `commented "${item.content}"`;
        case 'replied-comment':
            return `replied to your comment "${item.content}"`;
        default:
            return '';
    }
}

export default function NotificationCard({ item }) {
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        if (item.type === 'follow') {
            const followerUID = item.uid;
            const isFollower = global.userData.following.some(follower => follower.uid === followerUID);
            if (isFollower) {
                setIsFollowing(true);
            }
        }
    }, [item]);


    const handleFollowToggle = () => {
        const this_user = {
            name: global.userData.name,
            handle: global.userData.handle,
            pfp: global.userData.image,
            uid: global.userData.uid
        }

        const user = {
            name: item.name,
            handle: item.handle,
            pfp: item.pfp,
            uid: item.uid,
        }

        if (!isFollowing) {
            followUser(this_user, user);
        } else {
            unfollowUser(this_user, user);
        }

        setIsFollowing(prevState => !prevState);
    };

    return (
        <Pressable>
            <View style={styles.card}>
                <Image source={{ uri: item.pfp }} style={styles.pfp} />
                <View style={styles.textContainer}>
                    <Text style={styles.handle}>{item.handle}</Text>
                    <Text>
                        <Text style={styles.message}>{getDisplayMessage(item)}</Text>
                        <Text style={styles.time}>  {getDisplayTime(item.timestamp)}</Text>
                    </Text>
                </View>
                {item.type === 'follow' && (
                    <RNBounceable
                        style={[styles.followButton, isFollowing && styles.followButtonPressed]}
                        onPress={handleFollowToggle}
                    >
                        <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextPressed]}>
                            {isFollowing ? 'Following' : 'Follow Back'}
                        </Text>
                    </RNBounceable>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 5.5,
        paddingHorizontal: 16,
        paddingVertical: 17,
        backgroundColor: '#f8f8f8',
        borderRadius: 25,
    },
    pfp: {
        width: 47,
        aspectRatio: 1,
        borderRadius: 20,
        marginRight: 11.5,
    },
    textContainer: {
        flex: 1,
    },
    handle: {
        fontSize: 14,
        fontFamily: 'Outfit_600SemiBold',
        paddingVertical: 1.5,
    },
    message: {
        fontSize: 12.5,
        color: '#555',
        fontFamily: 'Outfit_500Medium',
    },
    time: {
        fontSize: 12.5,
        color: '#aaa',
        fontFamily: 'Outfit_500Medium',
    },
    followButton: {
        backgroundColor: '#2D92FF',
        paddingVertical: 13.5,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginLeft: 10,
        shadowColor: '#2D92FF',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        elevation: 5,
    },
    followButtonPressed: {
        backgroundColor: '#fff',
        borderColor: '#2D92FF',
        borderWidth: 2,

        paddingVertical: 11,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginLeft: 10,
        shadowColor: '#2D92FF',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        elevation: 5,
    },
    followButtonText: {
        color: '#fff',
        fontSize: 12.5,
        fontFamily: 'Outfit_600SemiBold',
    },
    followButtonTextPressed: {
        color: '#2D92FF',
    },
});
