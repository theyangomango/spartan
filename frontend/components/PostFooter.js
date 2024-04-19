import { StyleSheet, View, Text } from "react-native"
import { AntDesign, Fontisto, Ionicons } from '@expo/vector-icons';

export default function PostFooter({ data }) {
    return (
        <View style={styles.main_ctnr}>
            <View style={styles.left}>
                <View style={styles.likes_ctnr}>
                    <View style={styles.like_icon_ctnr}>
                        <AntDesign
                            name="like2"
                            size={20}
                        />
                    </View>
                    <Text style={styles.count_text}>
                        {data.likeCount}
                    </Text>
                    <Text> </Text>
                    <Text style={styles.text}>Likes</Text>
                </View>
                <View style={styles.comments_ctnr}>
                    <View style={styles.comment_icon_ctnr}>
                        <Fontisto
                            name="comment"
                            size={17}
                        />
                    </View>
                    <Text style={styles.count_text}>
                        {data.commentCount}
                    </Text>
                    <Text> </Text>
                    <Text style={styles.text}>Comments</Text>
                </View>
            </View>
            <View style={styles.right}>
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
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        borderTopColor: '#CFCFCF',
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 10,
    },
    left: {
        flexDirection: 'row'
    },
    likes_ctnr: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    like_icon_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    comments_ctnr: {
        paddingLeft: 15,
        flexDirection: 'row',
        alignItems: 'center'
    },
    comment_icon_ctnr: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    count_text: {
        fontFamily: 'Lato_700Bold',
        fontSize: 12
    },
    text: {
        color: '#616977',
        fontFamily: 'Lato_400Regular',
        fontSize: 12
    },
    right: {
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