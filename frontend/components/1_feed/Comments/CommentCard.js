import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import Svg, { Path } from "react-native-svg";
import RNBounceable from '@freakycoder/react-native-bounceable';
import getPFP from '../../../../backend/storage/getPFP';

export default function CommentCard({ data, likeComment, unlikeComment, index, setReplyingToIndex, isReply, replyIndex, toViewProfile }) {
    const [isLiked, setIsLiked] = useState(data.isCaption ? false : data.likedUsers.includes(global.userData.uid));
    const [pfp, setPFP] = useState(null);

    useEffect(() => {
        getPFP(data.uid)
            .then(url => {
                setPFP(url);
            });
    }, []);

    function handlePressLikeButton() {
        if (!isLiked) {
            console.log(index, replyIndex);
            likeComment(index, replyIndex);
        }
        else {
            unlikeComment(index, replyIndex);
        }
        setIsLiked(!isLiked);
    }

    return (
        <Pressable onPress={() => toViewProfile(data)} style={[styles.card, isReply && styles.replyCard]}>
            <View style={styles.pfp_ctnr}>
                <Image
                    source={{ uri: pfp }}
                    style={styles.pfp}
                />
            </View>
            <View style={styles.card_texts_ctnr}>
                <View style={styles.card_header}>
                    <View>
                        <Text style={styles.handle_text}>{data.handle}</Text>
                    </View>
                </View>
                <View style={styles.content_text_ctnr}>
                    <Text style={styles.content_text}>{data.content}</Text>
                </View>
            </View>
            {!data.isCaption && (
                <View style={styles.right}>
                    {
                        !isReply &&
                        <RNBounceable style={styles.reply_button} onPress={() => setReplyingToIndex(index)}>
                            <Text style={styles.reply_text}>Reply</Text>
                        </RNBounceable>
                    }
                    <RNBounceable onPress={handlePressLikeButton} style={styles.heart_icon_ctnr}>
                        {isLiked ? (
                            <Svg xmlns="http://www.w3.org/2000/svg" width="18.5" height="18.5" viewBox="0 0 24 24" fill="#FE5555">
                                <Path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z" stroke="#FE5555" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"></Path>
                            </Svg>
                        ) : (
                            <Svg xmlns="http://www.w3.org/2000/svg" width="18.5" height="18.5" viewBox="0 0 24 24" fill="none">
                                <Path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z" stroke="#333" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"></Path>
                            </Svg>
                        )}
                        <Text style={styles.likeCount}>{data.likeCount}</Text>
                    </RNBounceable>
                </View>
            )}
        </Pressable>
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
        width: 38,
        aspectRatio: 1,
        marginRight: 10
    },
    pfp: {
        flex: 1,
        borderRadius: 100,
    },
    card_texts_ctnr: {
        flex: 1
    },
    card_header: {
        flexDirection: 'row'
    },
    handle_text: {
        fontSize: 14,
        fontFamily: 'Outfit_500Medium',
        color: '#999',
    },
    content_text_ctnr: {
        flexDirection: 'row',
        marginBottom: 2
    },
    content_text: {
        fontFamily: 'Outfit_500Medium',
        fontSize: 14,
        flexWrap: 'wrap',
        color: '#111'
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 7
    },
    reply_button: {
        height: 34,
        width: 75,
        backgroundColor: '#e6e6e6',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 30,
    },
    reply_text: {
        fontSize: 12
    },
    heart_icon_ctnr: {
        width: 34,
        aspectRatio: 1,
        marginLeft: 8,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
    },
    likeCount: {
        position: 'absolute',
        bottom: -7,
        // backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 4,
        fontSize: 10,
        color: '#333',
        fontFamily: 'Outfit_600SemiBold',
    },
});
