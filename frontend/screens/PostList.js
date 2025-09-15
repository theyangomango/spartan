import React, { useEffect, useState } from "react";
import { StyleSheet, View, FlatList, Text, Image, TouchableOpacity, Pressable } from "react-native";
import scaleSize, { ts } from '../helper/scaleSize';
import { ArrowLeft2 } from 'iconsax-react-native';
import retrievePosts from "../../backend/posts/retrievePosts";
import ExplorePost from "../components/explore_posts_list/ExplorePost";

const postIDs = ['b3a27dbf-209e-4f50-962b-2634bf4ce50e'];


const PostList = ({ navigation, route, onPostPress }) => {
    const [posts, setPosts] = useState(null);

    useEffect(() => {
        init();
    }, []);

    async function init() {
        let db_posts = await retrievePosts(postIDs);
        // console.log(db_posts);
        setPosts(db_posts);
    }

    function goBack() {
        navigation.navigate('Explore');
    }

    // Render each post item
    const renderPostItem = ({ item }) => (
        <ExplorePost data={item}/>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={goBack}>
                    <ArrowLeft2 size="24" color="#fff" style={styles.backIcon} />
                </Pressable>
            </View>
            {posts && <FlatList
                data={posts}
                renderItem={renderPostItem}
                keyExtractor={(item) => item.pid}
                style={styles.postList}
            />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        height: scaleSize(90),
        backgroundColor: '#2D9EFF',
        justifyContent: "flex-end", // Positions content along the main axis at the bottom
        alignItems: "flex-start", // Positions content along the cross axis at the start (left)
        paddingLeft: scaleSize(15), // Padding on the left to ensure the icon is not on the edge
    },
    backIcon: {
        marginBottom: scaleSize(10), // Extra margin at the bottom for better visual spacing
    },
    postList: {
        flex: 1,
    },
    postContainer: {
        marginBottom: scaleSize(20),
        backgroundColor: "#fff",
        borderRadius: scaleSize(10),
        overflow: "hidden",
    },
    userHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scaleSize(15),
        paddingTop: scaleSize(10),
    },
    profileImage: {
        width: scaleSize(30),
        height: scaleSize(30),
        borderRadius: scaleSize(15),
        marginRight: scaleSize(10),
    },
    username: {
        fontWeight: "bold",
        fontSize: scaleSize(14),
        color: "#333",
    },
    postImage: {
        width: "100%",
        aspectRatio: 1.5, // Aspect ratio for a more modern look
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: scaleSize(10),
        paddingHorizontal: scaleSize(15),
        backgroundColor: "#f5f5f5",
    },
    commentsLikesText: {
        fontSize: scaleSize(12),
        color: "#777",
    },
});

export default PostList;
