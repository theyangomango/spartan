import { useEffect, useState } from "react";
import { StyleSheet, View, Image } from "react-native"
import ExplorePostHeader from "./ExplorePostHeader";
import ExplorePostFooter from "./ExplorePostFooter";
import PostCommentPreview from "../1_feed/PostCommentPreview";
import getPFP from "../../../backend/storage/getPFP";
import getPostImage from "../../../backend/storage/getPostImage";

export default function ExplorePost({ data }) {
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
            <ExplorePostHeader data={data} url={pfp} />

            <View style={styles.body_ctnr}>
                <View style={styles.image_ctnr}>
                    <Image
                        source={{ uri: image }}
                        style={styles.image}
                    />
                </View>
            </View>

            <ExplorePostFooter data={data} uid={global.userData.uid} />

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

        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        width: '100%',
        paddingTop: 12,
        // paddingBottom: 10,
        borderColor: '#CFCFCF',
        marginBottom: 16,
    },
    body_ctnr: {
        flex: 1,
        // paddingTop: 8,
        // paddingBottom: 6,
    },
    image_ctnr: {
        marginHorizontal: 3,
    },
    image: {
        width: '100%',
        aspectRatio: 1
    },
    liked_users: {
    },
    comments: {
        paddingTop: 4,
        paddingBottom: 10,
        paddingHorizontal: 12
    },
});