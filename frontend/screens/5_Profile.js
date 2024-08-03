import React, { useEffect, useState, useCallback, memo } from "react";
import { StyleSheet, View, Pressable, FlatList } from "react-native";
import { Grid2, Activity, Clock } from 'iconsax-react-native';
import MasonryList from '@react-native-seoul/masonry-list';
import Footer from "../components/Footer";
import ProfileHeader from "../components/5_profile/ProfileHeader";
import ProfileInfo from "../components/5_profile/ProfileInfo";
import ProfileRowButtons from "../components/5_profile/ProfileRowButtons";
import WorkoutStats from "../components/5_profile/WorkoutStats";
import PostPreview from "../components/5_profile/PostPreview";
import readDoc from "../../backend/helper/firebase/readDoc";
import ExerciseGraph from "../components/5_profile/ExerciseGraph";
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

const Profile = ({ navigation }) => {
    const userData = global.userData;
    const [posts, setPosts] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState('posts');

    useEffect(() => {
        getPosts();
    }, []);

    const getPosts = async () => {
        let db_posts = [];
        for (const pid of userData.posts) {
            let postData = await readDoc('posts', pid);
            db_posts.push(postData);
        }
        setPosts(db_posts);
    }

    const uploadPost = useCallback(() => {
        navigation.navigate('SelectPhotos', { userData });
    }, [navigation, userData]);

    const selectPanel = useCallback((panel) => {
        setSelectedPanel(panel);
    }, []);

    const renderPost = useCallback(({ item }) => (
        <PostPreview postData={item} />
    ), []);

    const renderWorkout = useCallback(({ item }) => (
        <PastWorkoutCard lastUsedDate={item.lastUsedDate} exercises={item.exercises} name={item.name} />
    ), []);

    const renderExerciseGraph = useCallback(() => (
        <ExerciseGraph />
    ), []);

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.body_ctnr}>
                <ProfileHeader onPressCreateBtn={uploadPost} />
                <ProfileInfo userData={userData} />
                <ProfileRowButtons />
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

            <View style={styles.scrollable_ctnr}>
                {selectedPanel === 'posts' && (
                    <PostsPanel posts={posts} renderPost={renderPost} />
                )}
                {selectedPanel === 'history' && (
                    <HistoryPanel renderWorkout={renderWorkout} />
                )}
                {selectedPanel === 'activity' && (
                    <ActivityPanel renderExerciseGraph={renderExerciseGraph} />
                )}
            </View>

            <Footer navigation={navigation} currentScreenName={'Profile'} />
        </View>
    );
}

const PostsPanel = memo(({ posts, renderPost }) => (
    <MasonryList
        data={posts}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderPost}
        numColumns={3}
        contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 120 }}
    />
));

const HistoryPanel = memo(({ renderWorkout }) => (
    <FlatList
        data={[
            { lastUsedDate, exercises, name: 'Chest & Back' },
            { lastUsedDate, exercises, name: 'Full Upper Body' },
            { lastUsedDate, exercises, name: 'Leg Day!!!' },
            { lastUsedDate, exercises, name: 'Full Body' },
            { lastUsedDate, exercises, name: 'Cardio' },
            { lastUsedDate, exercises, name: 'Full Upper Body' }
        ]}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderWorkout}
        ListFooterComponent={<View style={{ height: 120 }} />}
        contentContainerStyle={{ paddingBottom: 500 }}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
    />
));

const ActivityPanel = memo(({ renderExerciseGraph }) => (
    <FlatList
        data={[{}, {}, {}]}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderExerciseGraph}
        ListFooterComponent={<View style={{ height: 120 }} />}
        contentContainerStyle={{ paddingBottom: 400 }}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
    />
));

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    body_ctnr: {
        paddingHorizontal: 10,
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
        marginTop: 8,
        justifyContent: 'space-between',
    },
    panel_btn: {
        flex: 1,
        alignItems: 'center',
    },
    scrollable_ctnr: {
        marginTop: 5,
        flexGrow: 1,
    }
});

export default Profile;
