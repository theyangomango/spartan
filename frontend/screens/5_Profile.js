import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { Grid2, Activity } from 'iconsax-react-native'
import BottomSheet from "react-native-gesture-bottom-sheet";
import Footer from "../components/Footer";
import ProfileHeader from "../components/5_profile/ProfileHeader";
import ProfileInfo from "../components/5_profile/ProfileInfo";
import EditProfileButton from "../components/5_profile/EditProfileButton";
import WorkoutStats from "../components/5_profile/WorkoutStats";
import PostPreview from "../components/5_profile/PostPreview";
import readDoc from "../../backend/helper/firebase/readDoc";
import CreateModal from "../components/5_profile/CreateModal";
import WorkoutFooter from "../components/3_workout/WorkoutFooter";

export default function Profile({ navigation }) {
    const userData = global.userData;
    const [posts, setPosts] = useState([]);
    const [postsSelected, setPostsSelected] = useState(true);
    const [bkgColor, setBkgColor] = useState('#000');
    const bottomSheet = useRef();

    useEffect(() => {
        getPosts();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            const interval = setInterval(() => {
                let panY = parseInt(JSON.stringify(bottomSheet.current.state.pan.y));
                let animatedHeight = parseInt(JSON.stringify(bottomSheet.current.state.animatedHeight));
                let realHeight = Math.max(panY, 200 - animatedHeight);
                setBkgColor(`rgba(0, 0, 0, ${0.6 - 0.75 * (realHeight / 200)})`)
            }, 50);

            return () => {
                clearInterval(interval);
            };
        }, [])
    );

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

    function closeNewPostModal() {
        navigation.goBack();
    }

    function uploadPost() {
        console.log('Upload Post');
        bottomSheet.current.close()
        navigation.navigate('SelectPhotos', {
            userData: userData
        })
    }

    function selectPosts() {
        setPostsSelected(true);
    }

    function selectActivity() {
        setPostsSelected(false);
    }

    function toOptionsScreen() {
        console.log('Options');
        navigation.navigate('PostOptions', {
            userData: userData
        });
    }

    return (

        <View style={styles.main_ctnr}>
            <View style={styles.body_ctnr}>
                <BottomSheet
                    hasDraggableIcon
                    ref={bottomSheet}
                    height={200}
                    sheetBackgroundColor={'#fff'}
                    backgroundColor={bkgColor}
                >
                    <CreateModal createPost={uploadPost} />
                </BottomSheet>

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

            {global.workout &&
                <WorkoutFooter userData={userData} />
            }

            <Footer navigation={navigation} currentScreenName={'Profile'} />
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