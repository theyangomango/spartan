import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import Footer from "../components/Footer";
import Podium from "../components/2_competition/Podium";
import ComparingDropdown from "../components/2_competition/ComparingDropdown";
import ComparedWithDropdown from "../components/2_competition/ComparedWithDropdown";
import WorkoutFooter from "../components/3_workout/WorkoutFooter";
import CompetitionCard from "../components/2_competition/CompetitionCard";
import { useEffect, useState } from "react";
import retrieveFollowingUsers from "../../backend/retrieveFollowingUsers";
import rankUsers from "../helper/rankUsers";
import getPFPs from "../../backend/storage/getPFPs";

export default function Competition({ navigation, route }) {
    const userData = global.userData;
    const [users, setUsers] = useState(null);
    const [userList, setUserList] = useState(null);
    const [pfps, setPFPs] = useState(null);
    const [categoryCompared, setCategoryCompared] = useState('benchPress');

    useEffect(() => {
        retrieveFollowingUsers(userData.following)
            .then(data => {
                let users = [userData, ...data];
                setUsers(users);
                setUserList(rankUsers(users, categoryCompared));

                getPFPs([userData.uid, userData.following])
                    .then(data => {
                        setPFPs(data);
                    })
            })
    }, []);

    function selectCategoryCompared(category) {
        setCategoryCompared(category)
        setUserList(rankUsers(users, category));
    }


    return (
        <View style={styles.main_ctnr}>
            <View style={styles.body}>
                <View style={styles.top_ctnr}>
                    <View style={styles.header}>
                        <ComparingDropdown selectCategoryCompared={selectCategoryCompared} />
                    </View>

                    <Podium data={(userList && pfps) ? ([
                        {
                            handle: userList[0].handle,
                            pfp: pfps[0]
                        },
                        (userList.length > 1) && {
                            handle: userList[1].handle,
                            pfp: pfps[1]
                        },
                        (userList.length > 2) && {
                            handle: userList[2].handle,
                            pfp: pfps[2]
                        }
                    ]) : null} />
                </View>

                <View style={styles.bottom_ctnr}>
                    <View>
                        <ComparedWithDropdown />
                    </View>

                    <ScrollView style={styles.scrollview_ctnr}>
                        {(userList && pfps) && userList.map((user, index) => {
                            return <CompetitionCard
                                uid={user.uid}
                                pfp={pfps[index]}
                                handle={user.handle}
                                value={user.stats.exercises[categoryCompared]}
                                rank={index + 1}
                                key={index}
                            />
                        })}
                    </ScrollView>
                </View>
            </View>

            {global.workout &&
                <WorkoutFooter userData={userData} />
            }
            <Footer navigation={navigation} currentScreenName={'Competition'} />
        </View>
    )
}

const styles = StyleSheet.create({
    main_ctnr: {
        flex: 1,
        backgroundColor: '#fff'
    },
    body: {
        flex: 1
    },
    top_ctnr: {
        backgroundColor: '#2D9EFF',
        justifyContent: 'space-between',
        height: '38%'
    },
    bottom_ctnr: {
        flex: 1,
        paddingHorizontal: 15
    },
    scrollview_ctnr: {
        flex: 1,
    }
});