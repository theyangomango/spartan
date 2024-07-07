import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Pressable, Image } from 'react-native';
import { Heart } from 'iconsax-react-native'
import getDisplayTimeDifference from '../../helper/getDisplayTimeDifference';
import getPFP from '../../../backend/storage/getPFP';

console.log(Date.now());

export default function CommentCard({ data, likeComment, unlikeComment, index }) {
    const [isLiked, setIsLiked] = useState(data.isCaption ? false : data.likedUsers.includes(global.userData.uid));
    const [pfp, setPFP] = useState(null);


    useEffect(() => {
        getPFP(data.uid)
            .then(url => {
                setPFP(url);
            });
    }, []);

    function handlePressLikeButton() {
        if (!isLiked) likeComment(index);
        else if (isLiked) unlikeComment(index);
        setIsLiked(!isLiked);
    }

    return (
        <View style={styles.card}>
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
                    <View style={styles.timestamp_ctnr}>
                        <Text style={styles.helper_text}>{getDisplayTimeDifference(Date.now(), data.timestamp)}</Text>
                    </View>
                </View>
                <View style={styles.content_text_ctnr}>
                    <Text style={styles.content_text}>{data.content}</Text>
                </View>
                <View style={styles.card_footer}>
                    {
                        !data.isCaption &&
                        <>
                            <View style={styles.likes_ctnr}>
                                <Text style={styles.helper_text}>{data.likeCount} likes</Text>
                            </View>
                            <View style={styles.reply_text_ctnr}>
                                <Text style={styles.helper_text}>Reply</Text>
                            </View>
                        </>
                    }

                </View>
            </View>
            {
                !data.isCaption &&
                <View style={styles.heart_icon_ctnr}>
                    <Pressable onPress={handlePressLikeButton}>
                        {isLiked ?
                            <Heart size={15} color="#FF8A65" variant="Bold" /> :
                            <Heart size={15} color="#FF8A65" />
                        }
                    </Pressable>
                </View>
            }

        </View>
    )
}


const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        paddingVertical: 10,
    },
    pfp_ctnr: {
        width: 36,
        aspectRatio: 1,
        marginRight: 10
    },
    pfp: {
        flex: 1,
        borderRadius: 20,
    },
    card_texts_ctnr: {
        flex: 1
    },
    card_header: {
        flexDirection: 'row'
    },
    handle_text: {
        fontSize: 12.5,
        fontFamily: 'Poppins_500Medium',
        fontWeight: 'bold',
        paddingBottom: 6
    },
    timestamp_ctnr: {
        paddingHorizontal: 5
    },
    content_text_ctnr: {
        flexDirection: 'row',
        marginBottom: 2
    },
    content_text: {
        fontFamily: 'Poppins_400Regular',
        fontSize: 11,
        flexWrap: 'wrap',
    },
    card_footer: {
        flexDirection: 'row'
    },
    helper_text: {
        fontSize: 9.5,
        fontFamily: 'Poppins_400Regular',
        color: '#888',
        paddingVertical: 3
    },
    likes_ctnr: {
        paddingRight: 15
    },
    heart_icon_ctnr: {
        paddingHorizontal: 5,
        paddingBottom: 8,
        justifyContent: 'center'
    }
});