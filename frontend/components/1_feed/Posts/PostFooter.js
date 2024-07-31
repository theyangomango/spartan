import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Heart, Messages1, Send2 } from 'iconsax-react-native'; // Adjust this import as needed
import { Feather, FontAwesome } from '@expo/vector-icons';
import { likePost } from '../../../../backend/posts/likePost';
import { unlikePost } from '../../../../backend/posts/unlikePost';
import RNBounceable from '@freakycoder/react-native-bounceable';
import Svg, { Path } from "react-native-svg";

export default function PostFooter({ data, onPressCommentButton, onPressShareButton, isPostsVisible }) {
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const opacityAnim = useRef(new Animated.Value(isPostsVisible ? 0 : 1)).current;

    useEffect(() => {
        if (global.userData) {
            setIsLiked(data.likes.includes(global.userData.uid));
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
        console.log(isLiked);
        if (!isLiked) {
            likePost(data.pid, global.userData.uid);
            data.likeCount++;
            data.likes.push(global.userData.uid);
        } else {
            unlikePost(data.pid, global.userData.uid);
            data.likeCount--;
            const i = data.likes.indexOf(global.userData.uid);
            if (i > -1) {
                data.likes.splice(i, 1);
            }
        }
        setIsLiked(!isLiked);
    }

    function handleSave() {
        setIsSaved(!isSaved);
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.top}>
                <View style={styles.left}>
                    <RNBounceable style={styles.like_button} onPress={handlePressLikeButton}>
                        <BlurView style={styles.like_button_blurview}>
                            <Heart size="24" color={isLiked ? '#FE5555' : "#fff"} variant='Bold' />
                            <Text style={styles.like_button_text}>{data.likeCount}</Text>
                        </BlurView>
                    </RNBounceable>
                    <Pressable disabled={isPostsVisible} onPress={onPressCommentButton} style={styles.comment_button}>
                        <Messages1 size={24} color="#fff" variant='Bold' />
                        <Text style={styles.comment_button_text}>{data.commentCount}</Text>
                    </Pressable>
                    <Pressable disabled={isPostsVisible} onPress={onPressShareButton} style={styles.share_button}>
                        <Send2 size={20} color="#fff" variant='Bold' />
                        <Text style={styles.share_button_text}>{data.shareCount}</Text>
                    </Pressable>
                </View>

                <RNBounceable style={styles.save_button} onPress={handleSave}>
                    {
                        isSaved ?
                            <Svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="#FDF764" stroke="#FDF764" strokeWidth={2.2} strokeLinecap='round' strokeLinejoin='round' class="feather feather-bookmark"><Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></Path></Svg>
                            :
                            <Svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap='round' strokeLinejoin='round' class="feather feather-bookmark"><Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></Path></Svg>
                    }
                </RNBounceable>
            </View>

            <Animated.View style={[styles.bottom, { opacity: opacityAnim }]}>
                <View style={styles.profilePictures}>
                    <Image source={{ uri: global.userData.image }} style={[styles.profilePicture, styles.profilePicture1]} />
                    <Image source={{ uri: global.userData.image }} style={[styles.profilePicture, styles.profilePicture2]} />
                    <Image source={{ uri: global.userData.image }} style={[styles.profilePicture, styles.profilePicture3]} />
                </View>
                <Text style={styles.likedByText}>Liked by</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
    },
    top: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        position: 'absolute',
        bottom: 48,
        left: 10,
        right: 13,
    },
    bottom: {
        position: 'absolute',
        bottom: 12,
        left: 22,
        right: 13,
        flexDirection: 'row',
        alignItems: 'center',
    },
    left: {
        flexDirection: 'row'
    },
    like_button: {
        borderRadius: 30,
        overflow: 'hidden'
    },
    like_button_blurview: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    like_button_text: {
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        paddingHorizontal: 5,
    },
    comment_button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    comment_button_text: {
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        paddingVertical: 1,
        paddingHorizontal: 5,
    },
    share_button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    share_button_text: {
        color: '#fff',
        fontFamily: 'Poppins_700Bold',
        fontSize: 12,
        paddingVertical: 1,
        paddingHorizontal: 5,
    },
    save_button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
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
    },
});
