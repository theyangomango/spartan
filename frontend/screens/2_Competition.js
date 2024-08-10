import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Modal, TouchableOpacity } from "react-native";
import Footer from "../components/Footer";
import Podium from "../components/2_Competition/Podium";
import WorkoutFooter from "../components/3_Workout/WorkoutFooter";
import retrieveFollowingUsers from "../../backend/retrieveFollowingUsers";
import rankUsers from "../helper/rankUsers";
import LeaderboardBottomSheet from "../components/2_Competition/LeaderboardBottomSheet";
import UserStatsBottomSheet from "../components/2_Competition/UserStats/UserStatsBottomSheet";
import { Octicons, Ionicons } from '@expo/vector-icons'

export default function Competition({ navigation }) {
    const userData = global.userData;
    const [userList, setUserList] = useState(null);
    const [categoryCompared, setCategoryCompared] = useState('benchPress');
    const [showFollowers, setShowFollowers] = useState('All Followers');
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isUserStatsBottomSheetVisible, setIsUserStatsBottomSheetVisible] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const data = await retrieveFollowingUsers(userData.following);
            const users = [userData, ...data];
            // setUsers(users);
            setUserList(rankUsers(users, categoryCompared));
        };
        fetchData();
    }, [userData, categoryCompared]);

    const toggleFollowers = () => {
        setShowFollowers(prev => prev === 'All Followers' ? 'Close Friends' : 'All Followers');
    };

    const openModal = () => {
        setSelectExerciseModalVisible(true);
    };

    const closeModal = () => {
        setSelectExerciseModalVisible(false);
    };

    const openBottomSheet = user => {
        setSelectedUser(user);
        setIsUserStatsBottomSheetVisible(true);
    };

    return (
        <View style={styles.mainContainer}>
            <View style={styles.header}>
                <Octicons name="gear" size={22.5} color={'#ddd'} style={{paddingBottom: 4}}/>
                <Ionicons name="information-circle" size={26.5} color={'#dcdcdc'}/>
            </View>

            <Podium data={userList && userList.length > 0 ? [
                { handle: userList[0]?.handle, pfp: userList[0]?.image },
                userList[1] && { handle: userList[1]?.handle, pfp: userList[1]?.image },
                userList[2] && { handle: userList[2]?.handle, pfp: userList[2]?.image }
            ] : null} />

            <LeaderboardBottomSheet
                userList={userList}
                categoryCompared={categoryCompared}
                showFollowers={showFollowers}
                toggleFollowers={toggleFollowers}
                openModal={openModal}
                openBottomSheet={openBottomSheet}
            />

            <UserStatsBottomSheet
                user={selectedUser}
                isVisible={isUserStatsBottomSheetVisible}
                setIsVisible={setIsUserStatsBottomSheetVisible}
            />

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
    mainContainer: {
        flex: 1,
        backgroundColor: '#59AAEE',
    },
    header: {
        position: 'absolute',
        // backgroundColor: 'red',
        top: 0,
        height: 79,
        left: 0,
        right: 0,
        alignItems: 'flex-end',
        justifyContent: 'space-between', 
        paddingHorizontal: 30,
        flexDirection: 'row'
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: 300,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalText: {
        fontSize: 18,
        marginBottom: 10,
    },
    closeModalText: {
        color: 'blue',
        marginTop: 10,
    },
});
