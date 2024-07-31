import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Pressable, Image } from 'react-native';
import { Heart } from 'iconsax-react-native'
import getDisplayTimeDifference from '../../../helper/getDisplayTimeDifference';
import getPFP from '../../../../backend/storage/getPFP';
import Svg, { Path } from "react-native-svg";
import RNBounceable from '@freakycoder/react-native-bounceable';

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
                    {/* <View style={styles.timestamp_ctnr}>
                        <Text style={styles.helper_text}>{getDisplayTimeDifference(Date.now(), data.timestamp)}</Text>
                    </View> */}
                </View>
                <View style={styles.content_text_ctnr}>
                    <Text style={styles.content_text}>{data.content}</Text>
                </View>
                {/* <View style={styles.card_footer}>
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

                </View> */}
            </View>
            {
                !data.isCaption &&
                <View style={styles.right}>
                    <RNBounceable style={styles.reply_button}>
                        <Text style={styles.reply_text}>Reply</Text>
                    </RNBounceable>
                    <RNBounceable onPress={handlePressLikeButton} style={styles.heart_icon_ctnr}>
                        {isLiked ?
                            // <Heart size={20} color="#FF8A65" variant="Bold" /> :
                            // <Heart size={20} color="#000" />
                            <Svg xmlns="http://www.w3.org/2000/svg" width="18.5" height="18.5" viewBox="0 0 24 24" fill="#FE5555">
                                <Path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z" stroke="#FE5555" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"></Path>
                            </Svg>
                            :


                            <Svg xmlns="http://www.w3.org/2000/svg" width="18.5" height="18.5" viewBox="0 0 24 24" fill="none">
                                <Path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z" stroke="#333" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"></Path>
                            </Svg>
                        }
                    </RNBounceable>
                </View>
            }

        </View>
    )
}


const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9.5,
        paddingHorizontal: 4,
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
        // fontWeight: 'bold',
        color: '#999',
        // paddingBottom: 1.5
    },
    timestamp_ctnr: {
        paddingHorizontal: 5
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
    card_footer: {
        flexDirection: 'row'
    },
    helper_text: {
        fontSize: 9.5,
        fontFamily: 'Outfit_500Medium',
        color: '#888',
        paddingVertical: 3
    },
    likes_ctnr: {
        paddingRight: 15
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
        // width: 35,
        // paddingHorizontal: 8,
        // paddingUp: 10,
        // paddingRight: 7,
        // marginTop: 8,
        width: 34,
        aspectRatio: 1,
        marginLeft: 8,

        // alignItems: 'center',
        // justifyContent: 'center',
        borderRadius: 100,
        backgroundColor: '#e6e6e6',
        justifyContent: 'center',
        alignItems: 'center'
    }
});