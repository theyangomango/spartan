import { StyleSheet, View, Text } from "react-native"
import { AntDesign, Fontisto, Ionicons } from '@expo/vector-icons';
import PostHeader from "./PostHeader";

export default function Post() {
    return (
        <View style={styles.main_ctnr}>
            <PostHeader />

            {
                // * Body
            }
            <View style={styles.body_ctnr}>
                <View style={styles.image_ctnr}>

                </View>
            </View>

            {
            // TODO "Liked by ____ and others"
            /* <View style={styles.liked_users}>
                <View></View>
                <View>
                    <Text>liked by rishyavemireddy</Text>
                </View>
            </View> */}

            {
                // * Comments
            }
            <View style={styles.comments}>
                <Text>
                    <Text style={styles.comments_handle_text}>nish.venky</Text>
                    <Text>{' '}</Text>
                    <Text style={styles.comments_content_text}>jitta you not taht guy</Text>
                </Text>

                <Text>
                    <Text style={styles.comments_handle_text}>markzucky</Text>
                    <Text>{' '}</Text>
                    <Text style={styles.comments_content_text}>type shiiii</Text>
                </Text>
            </View>
            {
                // * Footer
            }
            <View style={styles.footer}>
                <View style={styles.footer_left}>
                    <View style={styles.footer_likes_ctnr}>
                        <View style={styles.like_icon_ctnr}>
                            <AntDesign
                                name="like2"
                                size={20}
                            />
                        </View>
                        <Text style={styles.footer_count_text}>1.5K</Text>
                        <Text> </Text>
                        <Text style={styles.footer_text}>Likes</Text>
                    </View>
                    <View style={styles.footer_comments_ctnr}>
                        <View style={styles.comment_icon_ctnr}>
                            <Fontisto
                                name="comment"
                                size={17}
                            />
                        </View>
                        <Text style={styles.footer_count_text}>500</Text>
                        <Text> </Text>
                        <Text style={styles.footer_text}>Comments</Text>
                    </View>
                </View>
                <View style={styles.footer_right}>
                    <View style={styles.share_icon_ctnr}>
                        <Ionicons
                            name="share-outline"
                            size={22}
                        />
                    </View>
                    <View style={styles.bookmark_icon_ctnr}>
                        <Ionicons
                            name="bookmarks-outline"
                            size={19}
                        />
                    </View>
                </View>
            </View>
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
    },
    header: {
        paddingVertical: 5,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    header_left: {
        flexDirection: 'row',
    },
    pfp: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'red',
        marginRight: 5,
    },
    header_text_ctnr: {
        padding: 4,
    },
    handle: {
        fontWeight: '700',
        fontSize: 12.5,
        paddingBottom: 5,
    },
    date_text: {
        fontSize: 10.5,
    },
    header_right: {
        flexDirection: 'row'
    },
    follow_btn: {
        width: 80,
        height: 35,
        borderRadius: 30,
        marginHorizontal: 10,
        marginVertical: 4,
        backgroundColor: '#0699FF',
        justifyContent: 'center'
    },
    follow_text: {
        textAlign: 'center',
        color: 'white',
        fontSize: 12,
        fontWeight: '600'
    },
    options_icon_ctnr: {
        justifyContent: 'center',
        alignItems: 'center'
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
    comments_handle_text: {
        fontSize: 12.5,
        fontFamily: 'Lato_700Bold',
        color: '#959595',
    },
    comments_content_text: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular'
    },
    footer: {
        borderTopColor: '#CFCFCF',
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 10,
    },
    footer_left: {
        flexDirection: 'row'
    },
    footer_likes_ctnr: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    like_icon_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    footer_comments_ctnr: {
        paddingLeft: 15,
        flexDirection: 'row',
        alignItems: 'center'
    },
    comment_icon_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    footer_count_text: {
        fontFamily: 'Lato_700Bold',
        fontSize: 12
    },
    footer_text: {
        color: '#616977',
        fontFamily: 'Lato_400Regular',
        fontSize: 12
    },
    footer_right: {
        flexDirection: 'row'
    },
    share_icon_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookmark_icon_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 12
    }
});