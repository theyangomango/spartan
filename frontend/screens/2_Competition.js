import React, { useEffect, useRef, useState } from "react";
import {
    StyleSheet,
    View,
    Modal,
    TouchableOpacity,
    Animated,
    SafeAreaView,
    Dimensions,
    Text,
} from "react-native";
import Footer from "../components/Footer";
import Podium from "../components/2_Competition/Podium";
import retrieveFollowingUsers from "../../backend/retrieveFollowingUsers";
import rankUsers from "../helper/rankUsers";
import LeaderboardBottomSheet from "../components/2_Competition/LeaderboardBottomSheet";
import UserStatsBottomSheet from "../components/2_Competition/UserStats/UserStatsBottomSheet";
import { Octicons, Ionicons } from '@expo/vector-icons';
import SelectExerciseModal from "../components/2_Competition/SelectExercise/SelectExerciseModal";
import InfoPanel from "../components/2_Competition/InfoPanel";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import RNBounceable from "@freakycoder/react-native-bounceable";
import getAllUsers from "../helper/getAllUsers";

const { width, height } = Dimensions.get('window');

// Function to determine dynamic styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) {
        return {
            headerIconSize: 26.5,
            headerPaddingHorizontal: 35,
        };
    } else if (width >= 390 && height >= 844) {
        return {
            headerIconSize: 24.5,
            headerPaddingHorizontal: 30,
            headerPaddingTop: 5,
        };
    } else if (width >= 375 && height >= 812) {
        return {
            headerIconSize: 24,
            headerPaddingHorizontal: 28,
            headerPaddingTop: 10,
        };
    } else {
        return {
            headerIconSize: 22.5,
            headerPaddingHorizontal: 25,
            headerPaddingTop: 8,
        };
    }
};

const dynamicStyles = getDynamicStyles();

export default function Competition({ navigation }) {
    const usersRef = useRef([]);
    const [userList, setUserList] = useState(null);
    const [comparedExercise, setComparedExercise] = useState('Bench Press (Barbell)');
    const [scope, setScope] = useState('Global');
    const [selectExerciseModalVisible, setSelectExerciseModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isUserStatsBottomSheetVisible, setIsUserStatsBottomSheetVisible] = useState(false);
    const [footerKey, setFooterKey] = useState(0);
    const [infoPanelVisible, setInfoPanelVisible] = useState(false);
    const infoPanelOpacity = useRef(new Animated.Value(0)).current;

    const [comparedMetric, setComparedMetric] = useState("1RM");

    useEffect(() => {
        init();
    }, []);

    useEffect(() => {
        if (scope == 'All Followers') {
            setUserList(rankUsers([global.userData, ...usersRef.current.filter(usr => {
                return global.userData.following.some(u => {
                    console.log(usr.uid === u.uid);
                    return u.uid == usr.uid;
                });
            })], comparedExercise));
        }

        else if (scope == 'Global') {
            setUserList(rankUsers(usersRef.current, comparedExercise));
        }

    }, [comparedExercise, scope]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            onSnapshot(doc(db, 'users', global.userData.uid), async (doc) => {
                global.userData = doc.data();
                init();
            });
            setFooterKey(prevKey => prevKey + 1);
        });

        return unsubscribe;
    }, [navigation]);

    async function init() {
        const allUsers = await getAllUsers();
        usersRef.current = allUsers;
        setUserList(rankUsers(usersRef.current, comparedExercise));
    }

    const toggleFollowers = () => {
        setScope(prev => prev === 'All Followers' ? 'Global' : 'All Followers');
    };

    const openModal = () => setSelectExerciseModalVisible(true);
    const closeModal = () => setSelectExerciseModalVisible(false);

    const openBottomSheet = user => {
        setSelectedUser(user);
        setIsUserStatsBottomSheetVisible(true);
    };

    const toggleInfoPanel = () => {
        if (infoPanelVisible) {
            Animated.timing(infoPanelOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setInfoPanelVisible(false));
        } else {
            setInfoPanelVisible(true);
            Animated.timing(infoPanelOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    };

    const toggleComparedMetric = () => {
        setComparedMetric(prev => {
            if (prev === "1RM") return "Volume";
            if (prev === "Volume") return "Reps";
            return "1RM";
        });
    };

    const exerciseStatKey = comparedMetric === '1RM' ? '1RM' : comparedMetric;

    return (
        <View style={styles.mainContainer}>
            <SafeAreaView>
                <View
                    style={[
                        styles.header,
                        {
                            paddingHorizontal: dynamicStyles.headerPaddingHorizontal,
                            paddingTop: dynamicStyles.headerPaddingTop,
                        },
                    ]}
                >
                    <Octicons
                        name="gear"
                        size={dynamicStyles.headerIconSize - 2}
                        color={"#eee"}
                        style={{ paddingBottom: 4, opacity: 0.5 }}
                    />
                    <View style={styles.headerRightContainer}>
                        <RNBounceable onPress={toggleComparedMetric} style={styles.toggleButton}>
                            <Text style={styles.toggleButtonText}>{comparedMetric}</Text>
                        </RNBounceable>
                        <TouchableOpacity onPress={toggleInfoPanel} style={styles.infoButton}>
                            <Ionicons
                                name="information-circle"
                                size={dynamicStyles.headerIconSize + 3}
                                color={"#fff"}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>


            <InfoPanel isVisible={infoPanelVisible} opacity={infoPanelOpacity} />


            <Podium
                data={userList && userList.length > 0 ? userList
                    .slice(0, 3)
                    .map(user => user && user.handle && user.image && global.userData.statsExercises ? {
                        handle: user.handle,
                        pfp: user.image,
                        stat: global.userData.statsExercises[comparedExercise]?.[exerciseStatKey] || 0
                    } : null)
                    .filter(Boolean)
                    : null}
            />

            <LeaderboardBottomSheet
                userList={userList}
                categoryCompared={comparedExercise}
                showFollowers={scope}
                toggleFollowers={toggleFollowers}
                openModal={openModal}
                openBottomSheet={openBottomSheet}
            />

            <UserStatsBottomSheet
                user={selectedUser}
                navigation={navigation}
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
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        flexDirection: 'row'
    },
    headerRightContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    infoButton: {
        marginLeft: 10,
    },
    toggleButton: {
        alignSelf: 'center',
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    toggleButtonText: {
        fontSize: 15,
        fontFamily: 'Outfit_600SemiBold',
        color: '#333',
    },
});
