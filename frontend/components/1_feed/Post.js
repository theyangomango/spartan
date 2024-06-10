import React, { useEffect, useState } from "react";
import { StyleSheet, View, Image, TextInput, TouchableOpacity, Text } from "react-native";
import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";
import PostCommentPreview from "./PostCommentPreview";
import getPFP from "../../../backend/storage/getPFP";
import getPostImage from "../../../backend/storage/getPostImage";
import { Ionicons } from '@expo/vector-icons';

export default function Post({ data, uid }) {
    const [pfp, setPFP] = useState(null);
    const [image, setImage] = useState(null);
    const [isCommenting, setIsCommenting] = useState(false);
    const [commentText, setCommentText] = useState('');

    useEffect(() => {
        getPFP(data.uid)
            .then(url => {
                setPFP(url);
            });
        getPostImage(data.images[0])
            .then(url => {
                setImage(url);
            });
    }, []);

    function initComment() {
        // setIsCommenting(true);
    }

    function handleEndEditing() {
        if (commentText == '') setIsCommenting(false);
    }

    function handleCommentSubmit() {
        console.log(commentText);
        setIsCommenting(false);
        setCommentText('');
    }

    return (
        <View style={styles.main_ctnr}>
            <PostHeader data={data} url={pfp} />

            <View style={styles.body_ctnr}>
                <View style={styles.image_ctnr}>
                    <Image
                        source={{ uri: image }}
                        style={styles.image}
                    />
                </View>
            </View>

            <View style={styles.comments}>
                {data.commentCount == 1 &&
                    <PostCommentPreview handle={data.comments[0].handle} content={data.comments[0].content} />
                }
                {data.commentCount >= 2 &&
                    <>
                        <PostCommentPreview handle={data.comments[0].handle} content={data.comments[0].content} />
                        <PostCommentPreview handle={data.comments[1].handle} content={data.comments[1].content} />
                    </>
                }
            </View>

            <View style={styles.comment_input_ctnr}>
                <TextInput
                    style={isCommenting ? styles.comment_input_commenting : styles.comment_input}
                    value={commentText}
                    onChangeText={setCommentText}
                    onFocus={setIsCommenting}
                    onEndEditing={handleEndEditing}
                    placeholder="Comment"
                    placeholderTextColor="#bcbcbc"
                    multiline={true}
                />
                {isCommenting &&
                    <TouchableOpacity onPress={handleCommentSubmit}>
                        {/* <Text style={styles.submit_button_text}>Submit</Text> */}
                        <Ionicons name="send" size={16} color="#0499fe" />
                    </TouchableOpacity>
                }
            </View>

            <PostFooter data={data} uid={uid} handleCommentBtnPress={initComment} />
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 10,
        borderRadius: 15,
        borderColor: '#CFCFCF',
        borderWidth: 1.2,
        marginBottom: 16,
        backgroundColor: '#fff', // Added background color for better visibility
    },
    body_ctnr: {
        flex: 1,
        paddingTop: 8,
        paddingBottom: 6,
    },
    image_ctnr: {
        width: '100%',
        height: 200
    },
    image: {
        flex: 1,
        borderRadius: 10,
    },
    liked_users: {},
    comments: {
        // paddingBottom: 10,
        paddingHorizontal: 5
    },
    comment_input_ctnr: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 5,
        // paddingBottom: 10,
    },
    comment_input: {
        flex: 1,
        marginRight: 10,
        color: '#888', // Darker text color for better readability
        paddingBottom: 5,
        fontSize: 11.5,
        fontWeight: '700'
    },
    comment_input_commenting: {
        flex: 1,
        marginRight: 10,
        color: '#888', // Darker text color for better readability
        paddingBottom: 5,
        fontSize: 11.5,
        fontWeight: '700'

    },
});
