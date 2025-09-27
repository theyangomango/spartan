import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Svg, { Path } from "react-native-svg";
import RNBounceable from '@freakycoder/react-native-bounceable';
import { getCommentCardStyles } from '../../../helper/getCommentCardStyles';
import getDisplayTimeDifference from '../../../helper/getDisplayTimeDifference';
import FastImage from "react-native-fast-image";
import { usePfp } from '../../../helper/usePFPs';
import { useNavigation } from '@react-navigation/native';

import scaleSize from "../../../helper/scaleSize";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const dynamicStyles = getCommentCardStyles(SCREEN_WIDTH, SCREEN_HEIGHT);

// Small helper for a versioned, cached avatar
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
    isFirst = false,
    onOpenLikesList,
}) {
    const navigation = useNavigation();
    const viewerUid = global?.userData?.uid;
    const initialLiked = !data.isCaption && Array.isArray(data?.likedUsers)
        ? data.likedUsers.some((entry) => {
            if (!entry) return false;
            if (typeof entry === 'string' || typeof entry === 'number') {
                return String(entry) === String(viewerUid || '');
            }
            return String(entry?.uid || '') === String(viewerUid || '');
        })
        : false;
    const [isLiked, setIsLiked] = useState(initialLiked);

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

    const hasLikes = !data.isCaption && Number(data.likeCount) > 0;

    const handlePressLikeCount = () => {
        if (!hasLikes) return;
        if (typeof onOpenLikesList === 'function') {
            onOpenLikesList();
        }
    };

    return (
        <View style={[styles.card, isReply && styles.replyCard, isFirst && styles.firstCard]}>
            <Pressable onPress={handleNavigateToProfile}>
                <View style={styles.pfp_ctnr}>
                    <Pfp
                        uid={data.uid}
                        version={data.pfpVersion ?? 0}
                        fallbackUri={
                            data?.pfp ||
                            data?.pfpUrl ||
                            data?.image ||
                            data?.photoURL ||
                            data?.avatar ||
                            ""
                        }
                        style={styles.pfp}
                    />
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
                                    stroke="#ffffffec"
                                    strokeWidth="2.1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                        )}
                        <Text
                            style={styles.likeCount}
                            onPress={handlePressLikeCount}
                            suppressHighlighting
                        >
                            {data.likeCount}
                        </Text>
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
        paddingTop: scaleSize(9.5),
        paddingBottom: scaleSize(9.5),
        paddingHorizontal: scaleSize(4),
    },
    firstCard: {
        paddingTop: 0,
    },
    replyCard: {
        marginLeft: scaleSize(25),
    },
    pfp_ctnr: {
        width: dynamicStyles.pfpSize,
        aspectRatio: 1,
        marginRight: scaleSize(10),
    },
    pfp: {
        flex: 1,
        borderRadius: scaleSize(100),
    },
    card_texts_ctnr: {
        flex: 1,
    },
    card_header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    handle_text: {
        fontSize: scaleSize(dynamicStyles.fontSize),
        fontFamily: 'Outfit_500Medium',
        color: '#B8BFCA',
    },
    time_text: {
        fontSize: scaleSize(dynamicStyles.fontSize - 1),
        fontFamily: 'Outfit_500Medium',
        color: '#A1A7B3',
        marginLeft: scaleSize(6),
    },
    content_text_ctnr: {
        flexDirection: 'row',
        marginBottom: scaleSize(2),
    },
    content_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(dynamicStyles.fontSize),
        flexWrap: 'wrap',
        color: '#E5E7EB',
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: scaleSize(8),
    },
    reply_button: {
        height: scaleSize(34),
        width: dynamicStyles.replyButtonWidth,
        backgroundColor: '#1E2128',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scaleSize(30),
    },
    reply_text: {
        fontSize: scaleSize(dynamicStyles.replyFontSize),
        fontFamily: 'Outfit_600SemiBold',
        color: '#E5E7EB',
    },
    heart_icon_ctnr: {
        width: scaleSize(dynamicStyles.heartIconSize * 1.7),
        height: scaleSize(dynamicStyles.heartIconSize * 1.7),
        marginLeft: scaleSize(8),
        borderRadius: scaleSize(dynamicStyles.heartIconSize * 0.85),
        alignItems: 'center',
        position: 'relative',
    },
    likeCount: {
        position: 'absolute',
        bottom: dynamicStyles.likeCountBottom,
        fontSize: scaleSize(dynamicStyles.likeCountFontSize),
        color: '#E5E7EB',
        fontFamily: 'Outfit_600SemiBold',
        paddingHorizontal: scaleSize(4),
        borderRadius: scaleSize(10),
    },
});
