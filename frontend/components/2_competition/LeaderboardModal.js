import React from "react";
import { StyleSheet, View, Text, FlatList } from "react-native";
import RNBounceable from '@freakycoder/react-native-bounceable';
import LeaderboardCard from "./LeaderboardCard";

const LeaderboardModal = ({ userList, categoryCompared, showFollowers, toggleFollowers, openModal, openBottomSheet, isBottomSheetExpanded }) => {
    const userIndex = userList.findIndex(item => item.uid === global.userData.uid);
    const userRank = userIndex !== -1 ? userIndex + 1 : 1; // Default to 1 if not found

    return (
        <View style={[styles.bottom_ctnr]}>
            <View style={styles.buttons_ctnr}>
                <View style={styles.right_buttons}>
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
            </View>
            <LeaderboardCard
                pfp={global.userData.image}
                handle={global.userData.handle}
                value={global.userData.statsExercises[categoryCompared]['1RM']}
                rank={userRank}
                lastRank={global.userData.statsExercises[categoryCompared]['lastFollowersRank']}
                handlePress={() => openBottomSheet(global.userData)}
                userIsSelf={true}
                bestSet={global.userData.statsExercises[categoryCompared]['bestSet']}
            />
            <FlatList
                data={userList}
                keyExtractor={(item, index) => index.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.flatlist_ctnr}
                ListHeaderComponent={<View style={{ height: 8 }} />}
                ListFooterComponent={<View style={{ height: isBottomSheetExpanded ? 100 : 400 }} />}
                renderItem={({ item, index }) => (
                    <LeaderboardCard
                        pfp={item.image}
                        handle={item.handle}
                        value={item.statsExercises[categoryCompared]['1RM']}
                        rank={index + 1}
                        lastRank={item.statsExercises[categoryCompared]['lastFollowersRank']}
                        handlePress={() => openBottomSheet(item)}
                        bestSet={item.statsExercises[categoryCompared]['bestSet']}
                    />
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    bottom_ctnr: {
        flex: 1,
        paddingTop: 10,
    },
    right_buttons: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end'
    },
    flatlist_ctnr: {
        flexGrow: 1,
    },
    buttons_ctnr: {
        flexDirection: 'row',
        marginBottom: 11,
        paddingTop: 6,
        paddingRight: 15,
        paddingLeft: 32,
        alignItems: 'center'
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
        fontSize: 13,
        fontFamily: 'Outfit_700Bold',
    },
});

export default LeaderboardModal;
