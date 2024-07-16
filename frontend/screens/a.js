import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import Footer from "../components/Footer";
import retrieveFollowingUsers from "../../backend/retrieveFollowingUsers";
import rankUsers from "../helper/rankUsers";
import LeaderboardPreviewCard from '../components/2_competition/LeaderboardPreviewCard';
import RNBounceable from '@freakycoder/react-native-bounceable';
import { BlurView } from 'expo-blur';
import Streaks from '../components/2_competition/Streaks';
import StatsRow from '../components/2_competition/StatsRow';
import FeedHeader from '../components/1_feed/FeedHeader';
import CompetitionHeader from '../components/2_competition/CompetitionHeader';
import LeaderboardPreview from '../components/2_competition/LeaderboardPreview';
import ExerciseGraph from '../components/2_competition/ExerciseGraph';
import GoalsBanner from '../components/2_competition/AlbumBanner';
import AlbumBanner from '../components/2_competition/AlbumBanner';
import HexagonalStats from '../components/2_competition/HexagonalStats';

export default function Competition({ navigation, route }) {
    const userData = global.userData;
    const [users, setUsers] = useState([]);
    const [userList, setUserList] = useState([]);
    const [categoryCompared, setCategoryCompared] = useState('benchPress');

    useEffect(() => {
        retrieveFollowingUsers(userData.following)
            .then(data => {
                console.log(data);

                let db_users = [userData, ...data]; // get data points
                setUsers(db_users);

                setUserList(rankUsers(db_users, categoryCompared));
            });
    }, []);

    function selectCategoryCompared(category) {
        setCategoryCompared(category);
        setUserList(rankUsers(users, category));
    }

    // useEffect(() => {
    //     console.log(userList);
    // }, [userList]);

    const renderLeaderboard = (title, date) => (
        <RNBounceable style={styles.leaderboard_preview}>
            <View style={styles.leaderboard_preview_header}>
                <Text style={styles.title_text}>{title}</Text>
                {date && <Text style={styles.subtitle_text}>{date}</Text>}
            </View>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {userList.map((user, index) => (
                    <LeaderboardPreviewCard
                        key={user.uid}
                        uid={user.uid}
                        pfp={user.image}
                        handle={user.handle}
                        value={user.stats.exercises[categoryCompared]}
                        rank={index + 1}
                    />
                ))}
            </ScrollView>
        </RNBounceable>
    );

    return (
        // <LinearGradient
        //     colors={['#CCEBFA', '#D7EDFF']}
        //     start={{ x: Math.random(), y: Math.random() }}
        //     end={{ x: Math.random(), y: Math.random() }}
        //     style={styles.gradient}
        // >
        <View style={styles.main_ctnr}>


            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ height: 50 }} />
                {/* <Streaks /> */}
                <StatsRow />



                {/* <ScrollView contentContainerStyle={styles.scrollViewContent} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <View style={styles.header}></View>



                <View style={styles.leaderboard_previews_ctnr}>
                    {renderLeaderboard("Friends Leaderboard")}
                    {renderLeaderboard("Global Leaderboard", "July 8th, 2024")}
                </View>
            </ScrollView>
            // <Footer navigation={navigation} currentScreenName={'Competition'} /> */}



                {
                    userList.length > 0 && <LeaderboardPreview userList={userList} />
                }

                <ExerciseGraph />


                {/* <ExerciseGraph /> */}
                {/* <GoalsBanner /> */}
                {/* <AlbumBanner /> */}

                {/* <HexagonalStats /> */}


                <View style={{ height: 110 }} />
            </ScrollView>
            <Footer navigation={navigation} currentScreenName={'Competition'} />

            {/* <BlurView intensity={10} style={styles.blurview} /> */}
            {/* <CompetitionHeader /> */}
        </View>
        // </LinearGradient>
    );
}

const styles = StyleSheet.create({
    blurview: {
        position: 'absolute',
        height: 1,
        left: 0,
        right: 0,
        top: 100,
        // backgroundColor: 'red',
        zIndex: 1
    },
    gradient: {
        flex: 1
    },
    header: {
        height: 150
    },
    main_ctnr: {
        flex: 1,
        // backgroundColor: '#E9F1FB'
        backgroundColor: "#fff"
    },
    leaderboard_previews_ctnr: {
        flex: 1,
        paddingHorizontal: 20,
    },
    leaderboard_preview: {
        width: '100%',
        // backgroundColor: 'rgba(240, 240, 240, 0.7)',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingTop: 15,
        marginBottom: 20,

        shadowColor: '#ddd',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 5
    },
    leaderboard_preview_header: {
        paddingBottom: 12,
    },
    title_text: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        fontSize: 15.5,
        fontFamily: 'Mulish_600SemiBold'
    },
    subtitle_text: {
        paddingHorizontal: 20,
        fontSize: 13,
        fontFamily: 'Mulish_400Regular'
    },
    scrollViewContent: {
        paddingBottom: 20,
    },
});
