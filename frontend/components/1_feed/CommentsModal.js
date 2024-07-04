import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import CommentCard from './CommentCard';
import updateDoc from '../../../backend/helper/firebase/updateDoc';

export default function CommentsModal({ pid, data }) {
    function handleLikeComment(index) {
        data[index].likeCount++;
        data[index].likedUsers.push(global.userData.uid);
        updateDoc('posts', pid, {
            comments: data
        })
    }

    function handleUnlikeComment(index) {
        data[index].likeCount--;
        const i = data[index].likedUsers.indexOf(global.userData.uid);
        if (index > -1) { // only splice array when item is found
            data[index].likedUsers.splice(i, 1); // 2nd parameter means remove one item only
        }
        updateDoc('posts', pid, {
            comments: data
        })
    }

    return (
        <View style={styles.main_ctnr}>
            {/* <View style={styles.header}>
                    <Text style={styles.title}>Comments</Text>
                </View> */}
            <FlatList
                data={data}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item, index }) => (
                    <CommentCard data={item} likeComment={handleLikeComment} unlikeComment={handleUnlikeComment} index={index} key={index} />
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        paddingHorizontal: 15
    },
    // header: {
    //     flexDirection: 'row',
    //     justifyContent: 'space-between',
    //     alignItems: 'center',
    //     borderBottomWidth: 1,
    //     borderBottomColor: '#ddd',
    //     paddingBottom: 10,
    //     marginBottom: 10,
    // },
    // title: {
    //     fontSize: 16,
    //     fontFamily: 'Poppins_500Medium'
    // },
    card: {
        flexDirection: 'row',
        paddingVertical: 10,
    },
    pfp_ctnr: {
        width: 36,
        borderRadius: 20,
        aspectRatio: 1,
        backgroundColor: '#ccc',
        marginRight: 10
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