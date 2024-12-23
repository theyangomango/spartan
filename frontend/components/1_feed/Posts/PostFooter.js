/**
 * Contains Like, Comment and Share/Bookmark Buttons
 * * Handles backend calls from user interactions
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Heart, Messages1, Send2 } from 'iconsax-react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';
import Svg, { Path } from "react-native-svg";

import PostFooterInfoPanel from './PostFooterInfoPanel';
import updateDoc from '../../../../backend/helper/firebase/updateDoc';
import arrayAppend from '../../../../backend/helper/firebase/arrayAppend';
import arrayErase from '../../../../backend/helper/firebase/arrayErase';
import sendNotification from '../../../../backend/sendNotification';
import { getPostFooterStyles } from '../../../helper/getPostFooterStyles';
import isThisUser from '../../../helper/isThisUser'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const dynamicStyles = getPostFooterStyles(SCREEN_WIDTH, SCREEN_HEIGHT);

export default function PostFooter({ data, onPressCommentButton, onPressShareButton, isSomePostFocused }) {
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const opacityAnim = useRef(new Animated.Value(isSomePostFocused ? 1 : 0)).current;

    // Determine if post is already liked by current user
    useEffect(() => {
        if (global.userData) {
            data.likes.forEach(item => {
                if (isThisUser(item.uid)) setIsLiked(true);
            });
            global.userData.savedPosts.forEach(pid => {
                if (pid === data.pid) setIsSaved(true); // TODO standardize backend storage for saved posts
            });
        }
    }, [global.userData]);

    // Animate appearance/disappearance when post is focused/unfocused
    useEffect(() => {
        Animated.timing(opacityAnim, {
            toValue: isSomePostFocused ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isSomePostFocused]);

    // Toggle "like" status & update Firestore
    function handlePressLikeButton() {
        if (!isLiked) {
            data.likeCount++;
            data.likes.push({
                uid: global.userData.uid,
                pfp: global.userData.image,
                handle: global.userData.handle,
                name: global.userData.name
            });
            updateDoc('posts', data.pid, data);

            const notif = {
                uid: global.userData.uid,
                pfp: global.userData.image,
                handle: global.userData.handle,
                name: global.userData.name,
                type: 'liked-post',
                timestamp: Date.now()
            };
            sendNotification(data.uid, notif);
        } else {
            data.likeCount--;
            data.likes = data.likes.filter(item => item.uid !== global.userData.uid);
            updateDoc('posts', data.pid, data);
        }
        setIsLiked(!isLiked);
    }

    // Toggle "save" status & update user doc
    function handlePressSaveButton() {
        if (!isSaved) arrayAppend('users', global.userData.uid, 'savedPosts', data.pid);
        else arrayErase('users', global.userData.uid, 'savedPosts', data.pid);
        setIsSaved(!isSaved);
    }

    return (
        <View style={styles.mainContainer}>
            <View style={styles.top}>
                {/* Left portion: like, comment, share */}
                <View style={styles.left}>
                    <RNBounceable style={styles.likeButton} onPress={handlePressLikeButton}>
                        <BlurView style={styles.likeButtonBlurView}>
                            <Heart
                                size={dynamicStyles.iconSize}
                                color={isLiked ? '#FE5555' : '#fff'}
                                variant="Bold"
                            />
                            <Text style={styles.likeButtonText}>{data.likeCount}</Text>
                        </BlurView>
                    </RNBounceable>

                    <Pressable
                        disabled={!isSomePostFocused}
                        onPress={onPressCommentButton}
                        style={styles.commentButton}
                    >
                        <Messages1 size={dynamicStyles.iconSize} color="#fff" variant="Bold" />
                        <Text style={styles.commentButtonText}>{data.commentCount}</Text>
                    </Pressable>

                    <Pressable
                        disabled={!isSomePostFocused}
                        onPress={onPressShareButton}
                        style={styles.shareButton}
                    >
                        <Send2 size={dynamicStyles.iconSize - 4} color="#fff" variant="Bold" />
                        <Text style={styles.shareButtonText}>{data.shareCount}</Text>
                    </Pressable>
                </View>

                {/* Right portion: save button */}
                <RNBounceable style={styles.saveButton} onPress={handlePressSaveButton}>
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

            {/* Footer with animated comment text, user handle, etc. */}
            <PostFooterInfoPanel opacityAnim={opacityAnim} data={data} />
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { position: 'relative' },
    top: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        position: 'absolute',
        bottom: 48,
        left: 10,
        right: 13,
    },
    left: { flexDirection: 'row' },
    likeButton: { borderRadius: 30, overflow: 'hidden' },
    likeButtonBlurView: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: dynamicStyles.buttonPaddingHorizontal,
        paddingVertical: dynamicStyles.buttonPaddingVertical,
    },
    likeButtonText: {
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: dynamicStyles.fontSize,
        paddingHorizontal: 5,
    },
    commentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: dynamicStyles.buttonPaddingHorizontal,
        paddingVertical: dynamicStyles.buttonPaddingVertical,
    },
    commentButtonText: {
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: dynamicStyles.fontSize,
        paddingVertical: 1,
        paddingHorizontal: 5,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: dynamicStyles.buttonPaddingHorizontal - 4,
        paddingVertical: dynamicStyles.buttonPaddingVertical,
    },
    shareButtonText: {
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: dynamicStyles.fontSize,
        paddingVertical: 1,
        paddingHorizontal: 5,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: dynamicStyles.buttonPaddingHorizontal,
        paddingVertical: dynamicStyles.buttonPaddingVertical,
    },
});
