import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Dimensions } from 'react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';
import getDisplayTime from '../../../helper/getDisplayTime';
import followUser from '../../../../backend/user/followUser';
import unfollowUser from '../../../../backend/user/unfollowUser';

const { width, height } = Dimensions.get('window');

// Function to determine the styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            pfpSize: 50,
            handleFontSize: 15,
            messageFontSize: 13.5,
            timeFontSize: 13.5,
            followButtonPaddingVertical: 14,
            followButtonPaddingHorizontal: 18,
            followButtonTextFontSize: 13.5,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            pfpSize: 47,
            handleFontSize: 14,
            messageFontSize: 12.5,
            timeFontSize: 12.5,
            followButtonPaddingVertical: 13.5,
            followButtonPaddingHorizontal: 16,
            followButtonTextFontSize: 12.5,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            pfpSize: 45,
            handleFontSize: 14,
            messageFontSize: 12,
            timeFontSize: 12,
            followButtonPaddingVertical: 13,
            followButtonPaddingHorizontal: 15,
            followButtonTextFontSize: 12,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            pfpSize: 43,
            handleFontSize: 13.5,
            messageFontSize: 11.5,
            timeFontSize: 11.5,
            followButtonPaddingVertical: 12.5,
            followButtonPaddingHorizontal: 14,
            followButtonTextFontSize: 11.5,
        };
    }
};

const dynamicStyles = getDynamicStyles();

function getDisplayMessage(item) {
    switch (item.type) {
        case 'follow':
            return 'followed you';
        case 'liked-post':
            return 'liked your post';
        case 'liked-comment':
            return `liked your comment "${item.content}"`;
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
        };

        const user = {
            name: item.name,
            handle: item.handle,
            pfp: item.pfp,
            uid: item.uid,
        };

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
        width: dynamicStyles.pfpSize,
        aspectRatio: 1,
        borderRadius: 20,
        marginRight: 11.5,
    },
    textContainer: {
        flex: 1,
    },
    handle: {
        fontSize: dynamicStyles.handleFontSize,
        fontFamily: 'Outfit_600SemiBold',
        paddingVertical: 1.5,
    },
    message: {
        fontSize: dynamicStyles.messageFontSize,
        color: '#555',
        fontFamily: 'Outfit_500Medium',
    },
    time: {
        fontSize: dynamicStyles.timeFontSize,
        color: '#aaa',
        fontFamily: 'Outfit_500Medium',
    },
    followButton: {
        backgroundColor: '#2D92FF',
        paddingVertical: dynamicStyles.followButtonPaddingVertical,
        paddingHorizontal: dynamicStyles.followButtonPaddingHorizontal,
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
        paddingVertical: dynamicStyles.followButtonPaddingVertical - 2,
        paddingHorizontal: dynamicStyles.followButtonPaddingHorizontal,
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
        fontSize: dynamicStyles.followButtonTextFontSize,
        fontFamily: 'Outfit_600SemiBold',
    },
    followButtonTextPressed: {
        color: '#2D92FF',
    },
});
