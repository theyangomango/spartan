import { StyleSheet, View, Text } from "react-native"
import PostHeader from "./PostHeader";
import PostFooter from "./PostFooter";
import PostCommentPreview from "./PostCommentPreview";

export default function Post({ data }) {

    return (
        <View style={styles.main_ctnr}>
            <PostHeader data={data} />

            <View style={styles.body_ctnr}>
                <View style={styles.image_ctnr}>

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

            <PostFooter data={data} />
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
        paddingTop: 6,
        paddingBottom: 5,
        // paddingHorizontal: 5,
    },
    image_ctnr: {
        width: '100%',
        height: 150,
        backgroundColor: 'red',
        borderRadius: 15,
    },
    liked_users: {
    },
    comments: {
        paddingBottom: 10,
        paddingHorizontal: 5
    },
});