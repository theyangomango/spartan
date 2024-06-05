import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Pressable, Text, TouchableOpacity } from "react-native";
import { Grid2, Activity } from 'iconsax-react-native'
import Footer from "../components/Footer";
import WorkoutStats from "../components/5_profile/WorkoutStats";
import PostPreview from "../components/5_profile/PostPreview";
import readDoc from "../../backend/helper/firebase/readDoc";
import WorkoutFooter from "../components/3_workout/WorkoutFooter";
import ViewProfileInfo from "../components/viewProfile/ViewProfileInfo";
import ViewProfileHeader from "../components/viewProfile/ViewProfileHeader";

export default function ViewProfile({ navigation, route }) {
    // const { userData } = route.params; // Pass the user data of the other user through navigation params
    const userData = global.userData;

    const [posts, setPosts] = useState([]);
    const [postsSelected, setPostsSelected] = useState(true);

    useEffect(() => {
        getPosts();
    }, []);


    async function getPosts() {
        let db_posts = [];
        for (const pid of userData.posts) {
            let postData = await readDoc('posts', pid);
            db_posts.push(postData);
        }
        setPosts(db_posts);
    }

    function selectPosts() {
        setPostsSelected(true);
    }

    function selectActivity() {
        setPostsSelected(false);
    }

    function followUser() {
        console.log('Follow User');
    }

    function messageUser() {
        console.log('Message User');
    }

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.body_ctnr}>
                <ViewProfileHeader />
                <ViewProfileInfo userData={userData} />

                <WorkoutStats userData={userData} />

                <View style={styles.panel_btns}>
                    <View style={styles.posts_btn}>
                        <Pressable onPress={selectPosts}>
                            {!postsSelected && <Grid2 size="28" color="#888" />}
                            {postsSelected && <Grid2 size="28" color="#359ffc" />}
                        </Pressable>
                    </View>
                    <View style={styles.activity_btn}>
                        <Pressable onPress={selectActivity}>
                            {!postsSelected && <Activity size="28" color="#359ffc" />}
                            {postsSelected && <Activity size="28" color="#888" />}
                        </Pressable>
                    </View>
                </View>

                <View style={[styles.posts_ctnr, !postsSelected && { display: 'none' }]}>
                    {posts.map((post, index) => {
                        return <PostPreview postData={post} key={index} />
                    })}
                </View>
            </View>

            {global.workout &&
                <WorkoutFooter userData={userData} />
            }

            <Footer navigation={navigation} currentScreenName={'Explore'} />
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    body_ctnr: {
        flex: 1,
        paddingHorizontal: 16,
    },
    panel_btns: {
        flexDirection: 'row',
        borderBottomWidth: 1.5,
        paddingBottom: 5,
        borderColor: '#82bbed',
        marginHorizontal: 6,
        marginTop: 10,
    },
    posts_btn: {
        width: '50%',
        alignItems: 'center'
    },
    activity_btn: {
        width: '50%',
        alignItems: 'center'
    },
    posts_ctnr: {
        marginTop: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 4,
    },
});
