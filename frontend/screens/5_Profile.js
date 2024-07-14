import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { Grid2, Activity, Clock } from 'iconsax-react-native';
import BottomSheet from "react-native-gesture-bottom-sheet";
import MasonryList from '@react-native-seoul/masonry-list';
import Footer from "../components/Footer";
import ProfileHeader from "../components/5_profile/ProfileHeader";
import ProfileInfo from "../components/5_profile/ProfileInfo";
import EditProfileButton from "../components/5_profile/EditProfileButton";
import WorkoutStats from "../components/5_profile/WorkoutStats";
import PostPreview from "../components/5_profile/PostPreview";
import readDoc from "../../backend/helper/firebase/readDoc";
import CreateModal from "../components/5_profile/CreateModal";
import WorkoutFooter from "../components/3_workout/WorkoutFooter";
import ExerciseGraph from "../components/5_profile/ExerciseGraph";
import HexagonalStats from "../components/5_profile/HexagonalStats";
import { ScrollView } from "react-native-gesture-handler";
import PastWorkoutCard from "../components/5_profile/PastWorkoutCard";

const lastUsedDate = "July 6th";
const exercises = [
    { name: "3 x Incline Bench (Barbell)", muscle: "Chest" },
    { name: "3 x Decline Bench (Barbell)", muscle: "Chest" },
    { name: "3 x Chest Flys", muscle: "Chest" },
    { name: "5 x Pull Ups", muscle: "Back" },
    { name: "3 x Bicep Curls (Dumbell)", muscle: "Biceps" },
    { name: "3 x Lateral Raises", muscle: "Shoulders" },
    { name: "3 x Shoulder Press (Dumbell)", muscle: "Shoulders" },
    { name: "5 x Reverse Curls (Barbell)", muscle: "Biceps" }
];


export default function Profile({ navigation }) {
    const userData = global.userData;
    const [posts, setPosts] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState('posts');
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
        let db_posts = [];
        for (const pid of userData.posts) {
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

    function selectPanel(panel) {
        setSelectedPanel(panel);
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

            </View>

            <View style={styles.panel_btns}>
                <View style={styles.panel_btn}>
                    <Pressable onPress={() => selectPanel('posts')}>
                        <Grid2 size="28" color={selectedPanel === 'posts' ? "#359ffc" : "#888"} />
                    </Pressable>
                </View>
                <View style={styles.panel_btn}>
                    <Pressable onPress={() => selectPanel('history')}>
                        <Clock size="28" color={selectedPanel === 'history' ? "#359ffc" : "#888"} />
                    </Pressable>
                </View>
                <View style={styles.panel_btn}>
                    <Pressable onPress={() => selectPanel('activity')}>
                        <Activity size="28" color={selectedPanel === 'activity' ? "#359ffc" : "#888"} />
                    </Pressable>
                </View>
            </View>
            <View style={styles.panel_border}></View>


            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.scrollable_ctnr, selectedPanel !== 'posts' && { display: 'none' }]}>
                    <MasonryList
                        data={posts}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => <PostPreview postData={item} />}
                        numColumns={3}
                        contentContainerStyle={{ paddingHorizontal: 4 }}
                    />
                </View>

                <View style={[styles.scrollable_ctnr, selectedPanel !== 'history' && { display: 'none' }]}>
                    <PastWorkoutCard lastUsedDate={lastUsedDate} exercises={exercises} name={'Chest & Back'} />
                    <PastWorkoutCard lastUsedDate={lastUsedDate} exercises={exercises} name={'Full Upper Body'} />
                    <PastWorkoutCard lastUsedDate={lastUsedDate} exercises={exercises} name={'Leg Day!!!'} />
                    <PastWorkoutCard lastUsedDate={lastUsedDate} exercises={exercises} name={'Full Body'} />
                    <PastWorkoutCard lastUsedDate={lastUsedDate} exercises={exercises} name={'Cardio'} />
                    <PastWorkoutCard lastUsedDate={lastUsedDate} exercises={exercises} name={'Full Upper Body'} />
                </View>


                <View style={[styles.scrollable_ctnr, selectedPanel !== 'activity' && { display: 'none' }]}>
                    {/* <HexagonalStats /> */}
                    <ExerciseGraph />
                    <ExerciseGraph />
                    <ExerciseGraph />
                </View>






                <View style={{ height: 120 }} />
            </ScrollView>

            <Footer navigation={navigation} currentScreenName={'Profile'} />
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    body_ctnr: {
        paddingHorizontal: 16,
    },
    panel_border: {
        borderColor: '#82bbed',
        borderBottomWidth: 1.5,
        paddingTop: 8,
        marginHorizontal: 16
    },
    panel_btns: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 10,
        justifyContent: 'space-between',
        // paddingHorizontal: 20, // Add horizontal padding to space out the buttons
    },
    panel_btn: {
        flex: 1,
        alignItems: 'center',
    },
    scrollable_ctnr: {
        marginTop: 5,
        flex: 1,
    }
});
