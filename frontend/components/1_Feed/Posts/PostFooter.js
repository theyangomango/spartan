/**
 * Contains Like, Comment and Share/Bookmark Buttons
 * * Handles backend calls from user interactions
 */

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { Heart, Messages1 } from 'iconsax-react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';
import Svg, { Path } from "react-native-svg";

import PostFooterInfoPanel from './PostFooterInfoPanel';
import { getPostFooterStyles } from '../../../helper/getPostFooterStyles';
import { FOCUS_ANIM_MS, FOCUS_EASING } from './animConfig';

import usePostFooterInteractions from './hooks/usePostFooterInteractions';

import scaleSize from "../../../helper/scaleSize";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const dynamicStyles = getPostFooterStyles(SCREEN_WIDTH, SCREEN_HEIGHT);

const PostFooter = forwardRef(function PostFooter({
    data,
    isLightFooter = false,
    onPressCommentButton,
    onPressShareButton,
    onPressInfoPanel,
    isSomePostFocused,
    isUnfocusing,
    focusModeSV,
    interactiveUnfocusSV,
}, ref) {
    const opacityAnim = useRef(new Animated.Value(isSomePostFocused && !isUnfocusing ? 1 : 0)).current;

    const {
        isLiked,
        isSaved,
        ensureLike,
        assignButtonRef,
        handlePressLikeButton,
        handlePressSaveButton,
        pressComment,
        pressShare,
        handleTapAt,
    } = usePostFooterInteractions({
        data,
        onPressCommentButton,
        onPressShareButton,
    });

    // Animate appearance/disappearance when post is focused/unfocused.
    // Fade OUT immediately when unfocus starts (isUnfocusing=true).
    useEffect(() => {
        try { opacityAnim.stopAnimation(); } catch {}
        Animated.timing(opacityAnim, {
            toValue: (isSomePostFocused && !isUnfocusing) ? 1 : 0,
            duration: FOCUS_ANIM_MS,
            easing: FOCUS_EASING,
            useNativeDriver: true,
        }).start();
    }, [isSomePostFocused, isUnfocusing]);

    useImperativeHandle(ref, () => ({
        toggleLike: handlePressLikeButton,
        ensureLike,
        isLiked,
        pressLike: handlePressLikeButton,
        pressComment,
        pressShare,
        pressSave: handlePressSaveButton,
        handleTapAt,
    }), [ensureLike, handlePressLikeButton, handlePressSaveButton, handleTapAt, isLiked, pressComment, pressShare]);

    const commentIconColor = isLightFooter ? '#333' : '#fff';
    const commentTextStyle = [styles.commentButtonText, isLightFooter && styles.commentButtonTextDark];

    const isLivePost = Boolean(
        data?.isLive ||
        data?.liveWorkout ||
        (typeof data?.pid === 'string' && data.pid.startsWith('workout:live'))
    );
    const likeCount = Array.isArray(data?.likes)
        ? data.likes.length
        : Number(data?.likeCount) || 0;
    const captionIncludedInComments = (() => {
        if (isLivePost) return false;
        if (Array.isArray(data?.comments)) {
            return data.comments.some((entry) => entry?.isCaption);
        }
        return Boolean(data?.caption);
    })();
    const commentCount = Array.isArray(data?.comments)
        ? Math.max(0, data.comments.length - (captionIncludedInComments ? 1 : 0))
        : Math.max(0, (Number(data?.commentCount) || 0) - (captionIncludedInComments ? 1 : 0));

    return (
        <View style={styles.mainContainer} collapsable={false}>
            <View style={styles.top}>
                {/* Left portion: like, comment, share */}
                <View style={styles.left}>
                    <View ref={(node) => assignButtonRef('like', node)} collapsable={false}>
                        <RNBounceable
                            style={styles.likeButton}
                            onPress={handlePressLikeButton}
                            hitSlop={{ top: scaleSize(4), bottom: scaleSize(12), left: scaleSize(12), right: scaleSize(12) }}
                        >
                            <BlurView style={styles.likeButtonBlurView}>
                                <Heart
                                    size={dynamicStyles.iconSize}
                                    color={isLiked ? '#FE5555' : '#fff'}
                                    variant="Bold"
                                />
                                <Text style={styles.likeButtonText}>{likeCount}</Text>
                            </BlurView>
                        </RNBounceable>
                    </View>

                    <View ref={(node) => assignButtonRef('comment', node)} collapsable={false}>
                        <Pressable
                            onPress={pressComment}
                            style={styles.commentButton}
                            hitSlop={{ top: scaleSize(4), bottom: scaleSize(12), left: scaleSize(12), right: scaleSize(12) }}
                        >
                            <Messages1 size={dynamicStyles.iconSize} color={commentIconColor} variant="Bold" />
                            <Text style={commentTextStyle}>{commentCount}</Text>
                        </Pressable>
                    </View>

                </View>

                {/* Right portion: save button */}
                <View ref={(node) => assignButtonRef('save', node)} collapsable={false}>
                    <RNBounceable
                        style={styles.saveButton}
                        onPress={handlePressSaveButton}
                        hitSlop={{ top: scaleSize(4), bottom: scaleSize(12), left: scaleSize(12), right: scaleSize(12) }}
                    >
                        {isSaved ? (
                            <Svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={dynamicStyles.iconSize}
                                height={dynamicStyles.iconSize}
                                viewBox="0 0 24 24"
                                fill="#FDF764"
                                stroke="#FDF764"
                                strokeWidth={2.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </Svg>
                        ) : (
                            <Svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={dynamicStyles.iconSize}
                                height={dynamicStyles.iconSize}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#fff"
                                strokeWidth={2.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </Svg>
                        )}
                    </RNBounceable>
                </View>
            </View>
            {/* Footer with animated comment text, user handle, etc. */}
            <PostFooterInfoPanel
                opacityAnim={opacityAnim}
                data={data}
                // Drive unfocus fade-out interactively
                focusModeSV={focusModeSV}
                interactiveUnfocusSV={interactiveUnfocusSV}
                onPress={onPressInfoPanel}
            />
        </View>
    );
});

export default PostFooter;

const styles = StyleSheet.create({
    mainContainer: { position: 'relative' },
    top: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        position: 'absolute',
        bottom: scaleSize(48),
        left: scaleSize(18),
        right: scaleSize(13),
        zIndex: 5,
        elevation: 5,
    },
    left: { flexDirection: 'row' },
    likeButton: { borderRadius: scaleSize(30), overflow: 'hidden' },
    likeButtonBlurView: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: dynamicStyles.buttonPaddingHorizontal,
        paddingVertical: dynamicStyles.buttonPaddingVertical,
    },
    likeButtonText: {
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: scaleSize(dynamicStyles.fontSize),
        paddingHorizontal: scaleSize(5),
    },
    commentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: dynamicStyles.buttonPaddingHorizontal,
        paddingVertical: dynamicStyles.buttonPaddingVertical,
        marginLeft: scaleSize(6)
    },
    commentButtonText: {
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: scaleSize(dynamicStyles.fontSize),
        paddingVertical: scaleSize(1),
        paddingHorizontal: scaleSize(5),
    },
    commentButtonTextDark: {
        color: '#333',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: dynamicStyles.buttonPaddingHorizontal,
        paddingVertical: dynamicStyles.buttonPaddingVertical,
    },
});
