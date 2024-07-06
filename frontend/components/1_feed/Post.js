import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Image, TextInput, TouchableOpacity, Text } from "react-native";
import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";
import getPFP from "../../../backend/storage/getPFP";
import getPostImage from "../../../backend/storage/getPostImage";

export default function Post({ data, uid, onPressCommentButton, index }) {
    const [pfp, setPFP] = useState(null);
    const [image, setImage] = useState(null);

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


            {/* <View style={styles.caption}>
                <Text style={styles.caption_text}>
                    <Text style={styles.caption_handle}>rithvikpunati</Text>
                    <Text> </Text>
                    <Text style={styles.caption_content}>
                        {data.caption}
                    </Text>
                </Text>
            </View> */}

            {/* <View style={styles.comments}>
                {data.commentCount == 1 &&
                    <PostCommentPreview handle={data.comments[0].handle} content={data.comments[0].content} />
                }
                {data.commentCount >= 2 &&
                    <>
                        <PostCommentPreview handle={data.comments[0].handle} content={data.comments[0].content} />
                        <PostCommentPreview handle={data.comments[1].handle} content={data.comments[1].content} />
                    </>
                }
            </View> */}

            <PostFooter data={data} uid={uid} onPressCommentButton={() => onPressCommentButton(index)} image={pfp} />

        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        borderColor: '#DDD',
        marginBottom: 25,
        backgroundColor: '#fff', // Added background color for better visibility
        // backgroundColor: '#FAFCFF',

        // shadowColor: '#300',
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.8,
        // shadowRadius: 2,  
        // elevation: 5,
        borderRadius: 30,
    },
    body_ctnr: {
        flex: 1,
    },
    image_ctnr: {
        aspectRatio: 0.8
    },
    image: {
        flex: 1,
        borderRadius: 40,
        // borderRadius: 15,
    },
    caption: {
        marginBottom: 7,
        paddingHorizontal: 2,
    },
    caption_text: {
        lineHeight: 20
    },
    caption_handle: {
        fontFamily: 'Lato_700Bold',
        fontSize: 12,
    },
    caption_content: {
        fontFamily: 'Lato_400Regular',
        fontSize: 11.5,
        color: '#777'
    },
    top_blurview: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: 100,
        right: 0
    }
});
