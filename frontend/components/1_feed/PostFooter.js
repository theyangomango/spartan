import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Heart, Message, Send2 } from 'iconsax-react-native'; // Adjust this import as needed
import { likePost } from '../../../backend/posts/likePost';
import { unlikePost } from '../../../backend/posts/unlikePost';
import RNBounceable from '@freakycoder/react-native-bounceable';

export default function PostFooter({ data, onPressCommentButton, image }) {
    const [isLiked, setIsLiked] = useState(false);

    useState(() => {
        if (global.userData) {
            setIsLiked(data.likes.includes(global.userData.uid));
        }
    }, [global.userData]);

    function handlePressLikeButton() {
        if (!isLiked) {
            likePost(data.pid, global.userData.uid);
            data.likeCount ++;
            data.likes.push(global.userData.uid);
        } else {
            unlikePost(data.pid, global.userData.uid);
            data.likeCount --;
            const i = data.likes.indexOf(global.userData.uid);
            if (i > -1) {
                data.likes.splice(i, 1);
            }
        }
        setIsLiked(!isLiked);
    }

    return (
        <RNBounceable onPress={onPressCommentButton} style={styles.outer}>
            <BlurView intensity={25} style={styles.main_ctnr}>
                <View style={styles.left}>
                    <View style={styles.pfp_ctnr}>
                        <Image source={{ uri: image }} style={styles.pfp} />
                    </View>
                    <View style={styles.caption}>
                        <Text numberOfLines={2} style={styles.caption_text}>{data.caption}</Text>
                    </View>
                </View>
                <View style={styles.right}>
                    <Pressable onPress={handlePressLikeButton}>
                        <View style={styles.likes_ctnr}>
                            {isLiked ?
                                <Heart size={20} color="#FF8A65" variant="Bold" /> :
                                <Heart size={20} color="#FF8A65" />
                            }
                            <Text style={styles.like_text}>{data.likeCount}</Text>
                        </View>
                    </Pressable>
                    <RNBounceable onPress={onPressCommentButton}>
                        <View style={styles.messages_ctnr}>
                            <Message size={20} color="#fff" />
                            <Text style={styles.comment_text}>{data.commentCount}</Text>
                            <View style={styles.left_border}></View>
                            <View style={styles.right_border}></View>
                        </View>
                    </RNBounceable>
                    <RNBounceable>
                        <View style={styles.share_ctnr}>
                            <Send2 size={20} color="#fff" />
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
        flex: 1, // Ensure the left section takes up available space
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 5,
        paddingRight: 8
        // marginLeft: 'auto', // Push icons to the right
    },
    pfp_ctnr: {
        paddingLeft: 12,
        paddingRight: 10
        // paddingHorizontal: 12
    },
    pfp: {
        width: 38,
        aspectRatio: 1,
        borderRadius: 22,
    },
    caption: {
        flex: 1,
        // marginLeft: 12, // Adjust spacing between profile picture and caption
    },
    caption_text: {
        fontFamily: 'Lato_400Regular',
        color: '#fff',
        fontSize: 11.5,
        flexWrap: 'wrap',
    },
    likes_ctnr: {
        padding: 8,
        height: '100%',
        justifyContent: 'flex-end'
    },
    messages_ctnr: {
        padding: 8,
        height: '100%',
        justifyContent: 'flex-end'
    },
    left_border: {
        position: 'absolute',
        borderRightColor: '#666',
        borderRightWidth: .5,
        top: 11,
        bottom: 11,
    },
    right_border: {
        position: 'absolute',
        borderLeftColor: '#666',
        borderLeftWidth: 0.6,
        top: 11,
        bottom: 11,
        right: 0
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
        paddingTop: 3
    },
    comment_text: {
        color: '#fff',
        fontSize: 11,
        textAlign: 'center',
        paddingBottom: 2,
        paddingTop: 2.5
    },
    share_text: {
        color: '#fff',
        fontSize: 11,
        textAlign: 'center',
        paddingBottom: 2,
        paddingTop: 2.5
    }
});
