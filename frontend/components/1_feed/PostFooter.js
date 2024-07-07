import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Heart, Message, Send2 } from 'iconsax-react-native'; // Adjust this import as needed
import { likePost } from '../../../backend/posts/likePost';
import { unlikePost } from '../../../backend/posts/unlikePost';
import RNBounceable from '@freakycoder/react-native-bounceable';
import CachedImage from 'expo-cached-image';

export default function PostFooter({ data, onPressCommentButton }) {
    const [isLiked, setIsLiked] = useState(false);
    const [currentCommentIndex, setCurrentCommentIndex] = useState(0);

    useEffect(() => {
        if (global.userData) {
            setIsLiked(data.likes.includes(global.userData.uid));
        }
    }, [global.userData]);

    function handlePressLikeButton() {
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

    function handlePressFooter() {
        setCurrentCommentIndex((prevIndex) => (prevIndex + 1) % data.comments.length);
    }

    const currentComment = data.comments[currentCommentIndex];

    return (
        <RNBounceable onPress={handlePressFooter} style={styles.outer}>
            <BlurView intensity={25} style={styles.main_ctnr}>
                <View style={styles.left}>
                    <View style={styles.pfp_ctnr}>
                        <CachedImage
                            key={`${currentCommentIndex}-${currentComment.pfp}`}
                            source={{ uri: currentComment.pfp }}
                            style={styles.pfp}
                            cacheKey={`${currentComment.uid}-${currentCommentIndex}`}
                        />
                    </View>
                    <View style={styles.caption}>
                        <Text numberOfLines={2} style={styles.caption_text}>{currentComment.content}</Text>
                    </View>
                </View>
                <View style={styles.right}>
                    <Pressable onPress={handlePressLikeButton}>
                        <View style={styles.likes_ctnr}>
                            {isLiked ?
                                <Heart size={18} color="#FF8A65" variant="Bold" /> :
                                <Heart size={18} color="#FF8A65" />
                            }
                            <Text style={styles.like_text}>{data.likeCount}</Text>
                        </View>
                    </Pressable>
                    <RNBounceable onPress={onPressCommentButton}>
                        <View style={styles.messages_ctnr}>
                            <Message size={18} color="#fff" />
                            <Text style={styles.comment_text}>{data.commentCount}</Text>
                            <View style={styles.left_border}></View>
                            <View style={styles.right_border}></View>
                        </View>
                    </RNBounceable>
                    <RNBounceable>
                        <View style={styles.share_ctnr}>
                            <Send2 size={18} color="#fff" />
                            <Text style={styles.share_text}>{data.shareCount}</Text>
                        </View>
                    </RNBounceable>
                </View>
            </BlurView>
        </RNBounceable>
    );
}

const styles = StyleSheet.create({
    outer: {
        position: 'absolute',
        bottom: 30,
        flexDirection: 'row',
        left: 20,
        right: 20,
        height: 60,
        borderRadius: 50,
        overflow: 'hidden',
    },
    main_ctnr: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 5,
        paddingRight: 8,
    },
    pfp_ctnr: {
        paddingLeft: 12,
        paddingRight: 8,
    },
    pfp: {
        width: 35,
        aspectRatio: 1,
        borderRadius: 22,
    },
    caption: {
        flex: 1,
    },
    caption_text: {
        fontFamily: 'Mulish_400Regular',
        color: '#fff',
        fontSize: 11,
        flexWrap: 'wrap',
    },
    likes_ctnr: {
        padding: 8,
        height: '100%',
        justifyContent: 'flex-end'
    },
    messages_ctnr: {
        paddingVertical: 8,
        paddingHorizontal: 9,
        height: '100%',
        justifyContent: 'flex-end'
    },
    left_border: {
        position: 'absolute',
        borderRightColor: '#666',
        borderRightWidth: .5,
        top: 26,
        bottom: 18,
        opacity: 0.5
    },
    right_border: {
        position: 'absolute',
        borderLeftColor: '#666',
        borderLeftWidth: 0.6,
        top: 26,
        bottom: 18,
        right: 0,
        opacity: 0.5
    },
    share_ctnr: {
        padding: 8,
        height: '100%',
        justifyContent: 'flex-end'
    },
    like_text: {
        color: '#fff',
        fontSize: 11,
        textAlign: 'center',
        paddingBottom: 2,
        paddingTop: 4,
        fontFamily: 'Outfit_300Light'
    },
    comment_text: {
        color: '#fff',
        fontSize: 11,
        textAlign: 'center',
        paddingBottom: 2,
        paddingTop: 3.5,
        fontFamily: 'Outfit_300Light'
    },
    share_text: {
        color: '#fff',
        fontSize: 11,
        textAlign: 'center',
        paddingBottom: 2,
        paddingTop: 3.5,
        fontFamily: 'Outfit_300Light'
    }
});
