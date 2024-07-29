import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Heart, Messages1, Send2 } from 'iconsax-react-native'; // Adjust this import as needed
import { Feather, FontAwesome } from '@expo/vector-icons'
import { likePost } from '../../../backend/posts/likePost';
import { unlikePost } from '../../../backend/posts/unlikePost';
import RNBounceable from '@freakycoder/react-native-bounceable';
import CachedImage from 'expo-cached-image';

export default function PostFooter({ data, onPressCommentButton, onPressShareButton }) {
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
        <View style={styles.main_ctnr}>

            {/* <BlurView intensity={25} style={styles.main_ctnr}>
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
                    <RNBounceable onPress={onPressShareButton}>
                        <View style={styles.share_ctnr}>
                            <Send2 size={18} color="#fff" />
                            <Text style={styles.share_text}>{data.shareCount}</Text>
                        </View>
                    </RNBounceable>
                </View>
            </BlurView> */}
            <View style={styles.left}>
                <RNBounceable style={styles.like_button} onPress={handlePressLikeButton}>
                    <BlurView style={styles.like_button_blurview}>
                        <Heart size="24" color="#fff" variant='Bold' />
                        <Text style={styles.like_button_text}>7.9k</Text>
                    </BlurView>
                </RNBounceable>
                <View style={styles.comment_button}>
                    <Messages1 size={24} color="#fff" variant='Bold' />
                    <Text style={styles.comment_button_text}>249</Text>

                </View>
                <View style={styles.share_button}>
                    <Send2 size={20} color="#fff" variant='Bold' />
                    <Text style={styles.share_button_text}>187</Text>
                </View>
            </View>


            <RNBounceable style={styles.save_button}>
                <Feather name='bookmark' color={'#fff'} size={23}/>
            </RNBounceable>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        position: 'absolute',
        bottom: 42,
        left: 10,
        right: 13,
        flexDirection: 'row',
        // left: 20,
        // right: 20,
        // height: 66,
        // borderRadius: 50,
        // overflow: 'hidden',
        justifyContent: 'space-between'
    },
    left: {
        flexDirection: 'row'
    },
    like_button: {
        // backgroundColor: 'red',
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
    }
    // outer: {
    //     position: 'absolute',
    //     bottom: 30,
    //     flexDirection: 'row',
    //     left: 20,
    //     right: 20,
    //     height: 66,
    //     borderRadius: 50,
    //     overflow: 'hidden',
    // },
    // main_ctnr: {
    //     flex: 1,
    //     flexDirection: 'row',
    //     alignItems: 'center',
    // },
    // left: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     flex: 1,
    // },
    // right: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     paddingLeft: 5,
    //     paddingRight: 8,
    //     // backgroundColor: 'red',
    // },
    // pfp_ctnr: {
    //     paddingLeft: 13,
    //     paddingRight: 8,
    // },
    // pfp: {
    //     width: 37,
    //     aspectRatio: 1,
    //     borderRadius: 22,
    // },
    // caption: {
    //     flex: 1,
    // },
    // caption_text: {
    //     fontFamily: 'Mulish_400Regular',
    //     color: '#fff',
    //     fontSize: 11,
    //     flexWrap: 'wrap',
    // },
    // likes_ctnr: {
    //     padding: 8,
    //     // height: '100%',
    //     marginTop: 8,
    //     justifyContent: 'flex-end'
    // },
    // messages_ctnr: {
    //     paddingVertical: 8,
    //     paddingHorizontal: 9,
    //     // height: '100%',
    //     marginTop: 8,
    //     justifyContent: 'flex-end'
    // },
    // left_border: {
    //     position: 'absolute',
    //     borderRightColor: '#666',
    //     borderRightWidth: 0.8,
    //     top: 10,
    //     bottom: 26,
    //     opacity: 0.5
    // },
    // right_border: {
    //     position: 'absolute',
    //     borderLeftColor: '#666',
    //     borderLeftWidth: 0.6,
    //     top: 10,
    //     bottom: 26,
    //     right: 0,
    //     opacity: 0.6
    // },
    // share_ctnr: {
    //     padding: 8,
    //     // height: '100%',
    //     marginTop: 8,
    //     justifyContent: 'flex-end'
    // },
    // like_text: {
    //     color: '#fff',
    //     fontSize: 12.5,
    //     textAlign: 'center',
    //     paddingBottom: 2,
    //     paddingTop: 4,
    //     fontFamily: 'Outfit_300Light'
    // },
    // comment_text: {
    //     color: '#fff',
    //     fontSize: 12.5,
    //     textAlign: 'center',
    //     paddingBottom: 2,
    //     paddingTop: 3.5,
    //     fontFamily: 'Outfit_300Light'
    // },
    // share_text: {
    //     color: '#fff',
    //     fontSize: 12.5,
    //     textAlign: 'center',
    //     paddingBottom: 2,
    //     paddingTop: 3.5,
    //     fontFamily: 'Outfit_300Light'
    // }
});
