import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Text, Modal, TouchableOpacity } from "react-native";
import Footer from "../components/Footer";
import Podium from "../components/2_Competition/Podium";
import retrieveFollowingUsers from "../../backend/retrieveFollowingUsers";
import rankUsers from "../helper/rankUsers";
import LeaderboardBottomSheet from "../components/2_Competition/LeaderboardBottomSheet";
import UserStatsBottomSheet from "../components/2_Competition/UserStats/UserStatsBottomSheet";
import { Octicons, Ionicons } from '@expo/vector-icons'
import SelectExerciseModal from "../components/2_Competition/SelectExercise/SelectExerciseModal";

export default function Competition({ navigation }) {
    const usersRef = useRef([]);
    const [userList, setUserList] = useState(null);
    const [comparedExercise, setComparedExercise] = useState('Bench Press (Barbell)');
    const [showFollowers, setShowFollowers] = useState('All Followers');
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isUserStatsBottomSheetVisible, setIsUserStatsBottomSheetVisible] = useState(false);
    const [footerKey, setFooterKey] = useState(0); // State to force footer re-render

    useEffect(() => {
        init();
    }, []);

    useEffect(() => {
        setUserList(rankUsers(usersRef.current, comparedExercise));
    }, [comparedExercise]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            // Trigger a state change to force the Footer to re-render
            setFooterKey(prevKey => prevKey + 1);
        });

        // Return the function to unsubscribe from the event so it gets removed on unmount
        return unsubscribe;
    }, [navigation]);

    async function init() {
        const data = await retrieveFollowingUsers(global.userData.following);
        usersRef.current = [global.userData, ...data];
        setUserList(rankUsers(usersRef.current, comparedExercise));
    }

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
                <Octicons name="gear" size={22.5} color={'#ddd'} style={{ paddingBottom: 4 }} />
                <Ionicons name="information-circle" size={26.5} color={'#dcdcdc'} />
            </View>

            <Podium
                data={userList && userList.length > 0 ? userList
                    .slice(0, 3) // Limit to the first three users
                    .map(user => user && user.handle && user.image && user.statsExercises ? {
                        handle: user.handle,
                        pfp: user.image,
                        stat: user.statsExercises[comparedExercise]?.['1RM'] || 0
                    } : null)
                    .filter(Boolean) // Filter out any null values
                    : null}
            />





            <LeaderboardBottomSheet
                userList={userList}
                categoryCompared={comparedExercise}
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

            <Footer key={footerKey} navigation={navigation} currentScreenName={'Competition'} />

            <Modal
                animationType="fade"
                transparent={true}
                visible={selectExerciseModalVisible}
                onRequestClose={closeModal}
            >
                <SelectExerciseModal closeModal={closeModal} setComparedExercise={setComparedExercise} />
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
