import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, Dimensions } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import Footer from "../components/Footer";
import Podium from "../components/2_competition/Podium";
import ComparingDropdown from "../components/2_competition/ComparingDropdown";
import ComparedWithDropdown from "../components/2_competition/ComparedWithDropdown";
import WorkoutFooter from "../components/3_workout/WorkoutFooter";
import CompetitionCard from "../components/2_competition/CompetitionCard";
import retrieveFollowingUsers from "../../backend/retrieveFollowingUsers";
import rankUsers from "../helper/rankUsers";
import StatsRow from "../components/2_competition/StatsRow";
import RNBounceable from '@freakycoder/react-native-bounceable';
import UserStats from "../components/2_competition/UserStats";
import BottomSheet from "react-native-gesture-bottom-sheet";

const { height } = Dimensions.get('window');

export default function Competition({ navigation, route }) {
    const userData = global.userData;
    const [users, setUsers] = useState(null);
    const [userList, setUserList] = useState(null);
    const [categoryCompared, setCategoryCompared] = useState('benchPress');
    const [showFollowers, setShowFollowers] = useState('All Followers');
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const bottomSheet = useRef();
    const [selectedUser, setSelectedUser] = useState(null);
    const [bottomSheetBkgColor, setBottomSheetBkgColor] = useState('#000');

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
        bottomSheet.current.show();
    }

    useFocusEffect(
        React.useCallback(() => {
            const interval = setInterval(() => {
                if (bottomSheet.current) {
                    let panY = parseInt(JSON.stringify(bottomSheet.current.state.pan.y));
                    let animatedHeight = parseInt(JSON.stringify(bottomSheet.current.state.animatedHeight));
                    let realHeight = Math.max(panY, 1100 - animatedHeight);
                    setBottomSheetBkgColor(`rgba(0, 0, 0, ${0.7 - 0.75 * (realHeight / 800)})`);
                }
            }, 10);

            return () => {
                clearInterval(interval);
            };
        }, [])
    );

    return (
        <View style={styles.main_ctnr}>
            <View style={styles.body}>
                <View style={styles.top_ctnr}>
                    <View style={styles.stats_rows_ctnr}>
                        <StatsRow />
                    </View>

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

                <View style={styles.bottom_ctnr}>
                    <View style={styles.buttonContainer}>
                        <RNBounceable
                            style={[styles.button, styles.selectedButton]}
                            onPress={openModal}
                        >
                            <Text style={styles.buttonText}>Bench Press</Text>
                        </RNBounceable>
                        <RNBounceable
                            style={[styles.button, styles.selectedButton]}
                            onPress={toggleFollowers}
                        >
                            <Text style={styles.buttonText}>{showFollowers}</Text>
                        </RNBounceable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollview_ctnr}>
                        <View style={{ height: 2 }} />
                        {userList && userList.map((user, index) => (
                            <CompetitionCard
                                uid={user.uid}
                                pfp={user.image}
                                handle={user.handle}
                                value={user.stats.exercises[categoryCompared]}
                                rank={index + 1}
                                key={index}
                                handlePress={() => openBottomSheet(user)}
                            />
                        ))}
                        <View style={{ height: 100 }} />
                    </ScrollView>
                </View>
            </View>

            {global.workout &&
                <WorkoutFooter userData={userData} />
            }
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

            <BottomSheet
                hasDraggableIcon
                ref={bottomSheet}
                height={height - 60}
                sheetBackgroundColor={'#fff'}
                backgroundColor={bottomSheetBkgColor}
            >
                {selectedUser && <UserStats user={selectedUser} />}
            </BottomSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
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
    bottom_ctnr: {
        flex: 1,
    },
    scrollview_ctnr: {
        flex: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
        paddingTop: 10,
        paddingHorizontal: 15
    },
    button: {
        borderRadius: 20,
        paddingHorizontal: 12.5,
        paddingVertical: 9.5,
        backgroundColor: '#BCDDFF',
        marginHorizontal: 3.5,
        alignItems: 'center',
    },
    selectedButton: {
        backgroundColor: '#ddd'
    },
    buttonText: {
        color: '#666',
        fontSize: 14.5,
        fontFamily: 'Outfit_700Bold',
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
