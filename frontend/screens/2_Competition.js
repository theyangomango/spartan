import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, Dimensions, Animated } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import Footer from "../components/Footer";
import Podium from "../components/2_Competition/Podium";
import StatsRow from "../components/2_Competition/StatsRow";
import WorkoutFooter from "../components/3_Workout/WorkoutFooter";
import retrieveFollowingUsers from "../../backend/retrieveFollowingUsers";
import rankUsers from "../helper/rankUsers";
import LeaderboardBottomSheet from "../components/2_Competition/LeaderboardBottomSheet";
import UserStatsBottomSheet from "../components/2_Competition/UserStatsBottomSheet";

const { height } = Dimensions.get('window');

export default function Competition({ navigation, route }) {
    const userData = global.userData;
    const [users, setUsers] = useState(null);
    const [userList, setUserList] = useState(null);
    const [categoryCompared, setCategoryCompared] = useState('benchPress');
    const [showFollowers, setShowFollowers] = useState('All Followers');
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isUserStatsBottomSheetVisible, setIsUserStatsBottomSheetVisible] = useState(false);

    useEffect(() => {
        retrieveFollowingUsers(userData.following)
            .then(data => {
                let users = [userData, ...data];
                setUsers(users);
                setUserList(rankUsers(users, categoryCompared));
            });
    }, []);

    function selectCategoryCompared(category) {
        setCategoryCompared(category);
        setUserList(rankUsers(users, category));
    }

    function toggleFollowers() {
        setShowFollowers(prev => prev === 'All Followers' ? 'Close Friends' : 'All Followers');
    }

    function openModal() {
        setSelectExerciseModalVisible(true);
    }

    function closeModal() {
        setSelectExerciseModalVisible(false);
    }

    function openBottomSheet(user) {
        setSelectedUser(user);
        setIsUserStatsBottomSheetVisible(true);
    }


    return (
        <View style={styles.main_ctnr}>
            <View style={[styles.body]}>
                <View style={styles.top_ctnr}>
                    {/* <View style={styles.stats_rows_ctnr}>
                        <StatsRow />
                    </View> */}
                    <Podium data={userList ? ([
                        {
                            handle: userList[0].handle,
                            pfp: userList[0].image
                        },
                        userList.length > 1 && {
                            handle: userList[1].handle,
                            pfp: userList[1].image
                        },
                        userList.length > 2 && {
                            handle: userList[2].handle,
                            pfp: userList[2].image
                        }
                    ]) : null} />
                </View>
            </View>


            <LeaderboardBottomSheet
                userList={userList}
                categoryCompared={categoryCompared}
                showFollowers={showFollowers}
                toggleFollowers={toggleFollowers}
                openModal={openModal}
                openBottomSheet={openBottomSheet}
            />

            <UserStatsBottomSheet user={selectedUser} isVisible={isUserStatsBottomSheetVisible} setIsVisible={setIsUserStatsBottomSheetVisible} />


            {global.workout && <WorkoutFooter userData={userData} />}
            <Footer navigation={navigation} currentScreenName={'Competition'} />
            <Modal
                animationType="slide"
                transparent={true}
                visible={selectExerciseModalVisible}
                onRequestClose={closeModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalText}>Modal Content</Text>
                        <TouchableOpacity onPress={closeModal}>
                            <Text style={styles.closeModalText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#59AAEE'
    },
    stats_rows_ctnr: {
        marginTop: 45
    },
    body: {
        flex: 1
    },
    top_ctnr: {
        justifyContent: 'space-between',
        height: 395
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalContent: {
        width: 300,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        alignItems: 'center'
    },
    modalText: {
        fontSize: 18,
        marginBottom: 10
    },
    closeModalText: {
        color: 'blue',
        marginTop: 10
    }
});
