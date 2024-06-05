import { useEffect, useState } from "react";
import { StyleSheet, View, Image } from "react-native"
import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";
import PostCommentPreview from "./PostCommentPreview";
import getPFP from "../../../backend/storage/getPFP";
import getPostImage from "../../../backend/storage/getPostImage";

export default function Post({ data, uid }) {
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

            <PostFooter data={data} uid={uid} />
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 10,
        borderRadius: 15,
        borderColor: '#CFCFCF',
        borderWidth: 1,
        marginBottom: 16,
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
    liked_users: {
    },
    comments: {
        paddingBottom: 10,
        paddingHorizontal: 5
    },
});