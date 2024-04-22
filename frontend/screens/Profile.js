import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Pressable } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { Grid2, Activity } from 'iconsax-react-native'
import BottomSheet from "react-native-gesture-bottom-sheet";
import Footer from "../components/Footer";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileInfo from "../components/profile/ProfileInfo";
import EditProfileButton from "../components/profile/EditProfileButton";
import WorkoutStats from "../components/profile/WorkoutStats";
import PostPreview from "../components/profile/PostPreview";
import { readDoc } from "../../backend/helper/firebase/readDoc";
import CreateModal from "../components/profile/CreateModal";

export default function Profile({ navigation, route }) {
    const userData = route.params.userData;
    const [posts, setPosts] = useState([]);
    const [postsSelected, setPostsSelected] = useState(true);

    // const [createModalShown, setCreateModalShown] = useState(false);
    const [bkgColor, setBkgColor] = useState('#000');
    const bottomSheet = useRef();

    useFocusEffect(
        React.useCallback(() => {
            // Do something when the screen is focused
            const interval = setInterval(() => {
                let panY = parseInt(JSON.stringify(bottomSheet.current.state.pan.y));
                let animatedHeight = parseInt(JSON.stringify(bottomSheet.current.state.animatedHeight));
                let realHeight = Math.max(panY, 200 - animatedHeight);
                console.log(realHeight);
                setBkgColor(`rgba(0, 0, 0, ${0.6 - 0.75 * (realHeight / 200)})`)
            }, 50);

            return () => {
                // Do something when the screen is unfocused
                // Useful for cleanup functions
                clearInterval(interval);
            };
        }, [])
    );


    useEffect(() => {
        getPosts();
    }, []);

    async function getPosts() {
        // * Posts
        let db_posts = [];
        for (pid of userData.posts) {
            let postData = await readDoc('posts', pid);
            db_posts.push(postData);
        }
        setPosts(db_posts);
    }

    function upload() {
        bottomSheet.current.show();
    }

    function selectPosts() {
        setPostsSelected(true);
    }

    function selectActivity() {
        setPostsSelected(false);
    }

    return (
        <View style={styles.main_ctnr}>
            <BottomSheet
                hasDraggableIcon
                ref={bottomSheet}
                height={200}
                sheetBackgroundColor={'#fff'}
                backgroundColor={bkgColor}
            >
                <CreateModal />
            </BottomSheet>

            <View style={styles.body_ctnr}>
                <ProfileHeader onPressCreateBtn={upload} />
                <ProfileInfo userData={userData} />
                <EditProfileButton />
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

            <Footer navigation={navigation} currentScreenName={'Profile'} userData={userData} />
        </View>

    )
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
    }
});