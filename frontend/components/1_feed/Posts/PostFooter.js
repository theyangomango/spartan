import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Heart, Messages1, Send2 } from 'iconsax-react-native';
import RNBounceable from '@freakycoder/react-native-bounceable';
import Svg, { Path } from "react-native-svg";
import FooterBottom from './FooterBottom';
import updateDoc from '../../../../backend/helper/firebase/updateDoc';
import arrayAppend from '../../../../backend/helper/firebase/arrayAppend';
import arrayErase from '../../../../backend/helper/firebase/arrayErase';
import sendNotification from '../../../../backend/sendNotification';

export default function PostFooter({ data, onPressCommentButton, onPressShareButton, isPostsVisible }) {
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const opacityAnim = useRef(new Animated.Value(isPostsVisible ? 0 : 1)).current;

    useEffect(() => {
        if (global.userData) {
            data.likes.forEach(item => {
                if (item.uid == global.userData.uid) {
                    setIsLiked(true);
                    return;
                }
            });
        }
    }, [global.userData]);

    useEffect(() => {
        Animated.timing(opacityAnim, {
            toValue: isPostsVisible ? 0 : 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isPostsVisible]);

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
            }

            sendNotification(data.uid, notif);
        } else {
            data.likeCount--;
            data.likes = data.likes.filter(item => item.uid !== global.userData.uid);
            updateDoc('posts', data.pid, data);
        }
        setIsLiked(!isLiked);
    }

    function handlePressSaveButton() {
        if (!isSaved) {
            arrayAppend('users', global.userData.uid, 'savedPosts', data.pid);
        } else {
            arrayErase('users', global.userData.uid, 'savedPosts', data.pid);
        }

        setIsSaved(!isSaved);
    }

    return (
        <View style={styles.mainContainer}>
            <View style={styles.top}>
                <View style={styles.left}>
                    <RNBounceable style={styles.likeButton} onPress={handlePressLikeButton}>
                        <BlurView style={styles.likeButtonBlurView}>
                            <Heart size="24" color={isLiked ? '#FE5555' : "#fff"} variant='Bold' />
                            <Text style={styles.likeButtonText}>{data.likeCount}</Text>
                        </BlurView>
                    </RNBounceable>
                    <Pressable disabled={isPostsVisible} onPress={onPressCommentButton} style={styles.commentButton}>
                        <Messages1 size={24} color="#fff" variant='Bold' />
                        <Text style={styles.commentButtonText}>{data.commentCount}</Text>
                    </Pressable>
                    <Pressable disabled={isPostsVisible} onPress={onPressShareButton} style={styles.shareButton}>
                        <Send2 size={20} color="#fff" variant='Bold' />
                        <Text style={styles.shareButtonText}>{data.shareCount}</Text>
                    </Pressable>
                </View>

                <RNBounceable style={styles.saveButton} onPress={handlePressSaveButton}>
                    {
                        isSaved ?
                            <Svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="#FDF764" stroke="#FDF764" strokeWidth={2.2} strokeLinecap='round' strokeLinejoin='round'>
                                <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></Path>
                            </Svg>
                            :
                            <Svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap='round' strokeLinejoin='round'>
                                <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></Path>
                            </Svg>
                    }
                </RNBounceable>
            </View>

            <FooterBottom opacityAnim={opacityAnim} data={data} />
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        position: 'relative',
    },
    top: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        position: 'absolute',
        bottom: 48,
        left: 10,
        right: 13,
    },
    left: {
        flexDirection: 'row'
    },
    likeButton: {
        borderRadius: 30,
        overflow: 'hidden'
    },
    likeButtonBlurView: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    likeButtonText: {
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        paddingHorizontal: 5,
    },
    commentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    commentButtonText: {
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        paddingVertical: 1,
        paddingHorizontal: 5,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    shareButtonText: {
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        paddingVertical: 1,
        paddingHorizontal: 5,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
});