import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Svg, { Path } from "react-native-svg";
import RNBounceable from '@freakycoder/react-native-bounceable';
import { getCommentCardStyles } from '../../../helper/getCommentCardStyles';
import getDisplayTimeDifference from '../../../helper/getDisplayTimeDifference';
import FastImage from "react-native-fast-image";
import { usePfp } from '../../../helper/usePFPs';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const dynamicStyles = getCommentCardStyles(SCREEN_WIDTH, SCREEN_HEIGHT);

// Small helper for a versioned, cached avatar
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
        <View style={[style, { backgroundColor: '#EEE' }]} />
    );
};

export default function CommentCard({
    data,
    likeComment,
    unlikeComment,
    index,
    setReplyingToIndex,
    isReply,
    replyIndex,
    toViewProfile,
}) {
    const navigation = useNavigation();
    const [isLiked, setIsLiked] = useState(
        data.isCaption ? false : data.likedUsers.includes(global.userData.uid)
    );

    function handlePressLikeButton() {
        if (!isLiked) {
            likeComment(index, replyIndex);
        } else {
            unlikeComment(index, replyIndex);
        }
        setIsLiked(!isLiked);
    }

    function handleNavigateToProfile() {
        if (data.uid === global.userData.uid) {
            try {
                const rootNav = navigation?.getParent?.('ROOT');
                if (rootNav?.navigate) rootNav.navigate('Profile', { transition: 'slide-from-right' });
                else navigation.navigate('Profile', { transition: 'slide-from-right' });
            } catch {}
        } else {
            try {
                const rootNav = navigation?.getParent?.('ROOT');
                if (rootNav?.navigate) rootNav.navigate('ViewProfile', { user: data });
                else toViewProfile(data);
            } catch { toViewProfile(data); }
        }
    }

    return (
        <View style={[styles.card, isReply && styles.replyCard]}>
            <Pressable onPress={handleNavigateToProfile}>
                <View style={styles.pfp_ctnr}>
                    <Pfp uid={data.uid} version={data.pfpVersion ?? 0} style={styles.pfp} />
                </View>
            </Pressable>

            <View style={styles.card_texts_ctnr}>
                <View style={styles.card_header}>
                    <Text style={styles.handle_text}>{data.handle}</Text>
                    <Text style={styles.time_text}>
                        · {getDisplayTimeDifference(data.timestamp, Date.now())}
                    </Text>
                </View>
                <View style={styles.content_text_ctnr}>
                    <Text style={styles.content_text}>{data.content}</Text>
                </View>
            </View>

            {!data.isCaption && (
                <View style={styles.right}>
                    {!isReply && (
                        <RNBounceable
                            style={styles.reply_button}
                            onPress={() => setReplyingToIndex(index)}
                        >
                            <Text style={styles.reply_text}>Reply</Text>
                        </RNBounceable>
                    )}

                    <RNBounceable onPress={handlePressLikeButton} style={styles.heart_icon_ctnr}>
                        {isLiked ? (
                            <Svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={dynamicStyles.heartIconSize}
                                height={dynamicStyles.heartIconSize}
                                viewBox="0 0 24 24"
                                fill="#FE5555"
                            >
                                <Path
                                    d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z"
                                    stroke="#FE5555"
                                    strokeWidth="2.1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                        ) : (
                            <Svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={dynamicStyles.heartIconSize}
                                height={dynamicStyles.heartIconSize}
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <Path
                                    d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z"
                                    stroke="#333"
                                    strokeWidth="2.1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                        )}
                        <Text style={styles.likeCount}>{data.likeCount}</Text>
                    </RNBounceable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9.5,
        paddingHorizontal: 4,
    },
    replyCard: {
        marginLeft: 25,
    },
    pfp_ctnr: {
        width: dynamicStyles.pfpSize,
        aspectRatio: 1,
        marginRight: 10,
    },
    pfp: {
        flex: 1,
        borderRadius: 100,
    },
    card_texts_ctnr: {
        flex: 1,
    },
    card_header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    handle_text: {
        fontSize: dynamicStyles.fontSize,
        fontFamily: 'Outfit_500Medium',
        color: '#B8BFCA',
    },
    time_text: {
        fontSize: dynamicStyles.fontSize - 1,
        fontFamily: 'Outfit_500Medium',
        color: '#A1A7B3',
        marginLeft: 6,
    },
    content_text_ctnr: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    content_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: dynamicStyles.fontSize,
        flexWrap: 'wrap',
        color: '#E5E7EB',
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    reply_button: {
        height: 34,
        width: dynamicStyles.replyButtonWidth,
        backgroundColor: '#1E2128',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 30,
    },
    reply_text: {
        fontSize: dynamicStyles.replyFontSize,
        fontFamily: 'Outfit_600SemiBold',
        color: '#E5E7EB',
    },
    heart_icon_ctnr: {
        width: dynamicStyles.heartIconSize * 1.7,
        height: dynamicStyles.heartIconSize * 1.7,
        marginLeft: 8,
        borderRadius: dynamicStyles.heartIconSize * 0.85,
        alignItems: 'center',
        position: 'relative',
    },
    likeCount: {
        position: 'absolute',
        bottom: dynamicStyles.likeCountBottom,
        fontSize: dynamicStyles.likeCountFontSize,
        color: '#E5E7EB',
        fontFamily: 'Outfit_600SemiBold',
        paddingHorizontal: 4,
        borderRadius: 10,
    },
});
