import React from "react";
import { StyleSheet, View, Text, FlatList, Dimensions } from "react-native";
import RNBounceable from '@freakycoder/react-native-bounceable';
import LeaderboardCard from "./LeaderboardCard";
import { getLeaderboardModalStyles } from "../../helper/getLeaderboardModalStyles";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const dynamicStyles = getLeaderboardModalStyles(SCREEN_WIDTH, SCREEN_HEIGHT);

const getBounceableStyle = (opacity = 1) => ([
    styles.button,
    styles.selectedButton,
    {
        paddingHorizontal: dynamicStyles.buttonPaddingHorizontal,
        paddingVertical: dynamicStyles.buttonPaddingVertical,
        marginHorizontal: dynamicStyles.buttonMarginHorizontal,
        opacity,
    },
]);

const getTextStyle = () => ([
    styles.buttonText,
    { fontSize: dynamicStyles.buttonTextFontSize },
]);

/**
 * Safely fetches a particular field from a user’s exercise stats.
 * @param {Object} user - The user object containing stats.
 * @param {string} category - The exercise category key.
 * @param {string} field - The field to access inside the category (e.g., "1RM", "lastFollowerRank").
 * @param {any} defaultValue - The default value if not present.
 */
const getStatField = (user, category, field, defaultValue) => {
    if (user?.statsExercises?.[category]?.[field] !== undefined) {
        return user.statsExercises[category][field];
    }
    return defaultValue;
};

const LeaderboardModal = ({
    userList,
    categoryCompared,
    showFollowers,
    toggleFollowers,
    openModal,
    openBottomSheet,
    isBottomSheetExpanded,
}) => {
    // Find the global user’s position in the leaderboard
    const userIndex = userList.findIndex(item => item.uid === global.userData.uid);
    const userRank = userIndex !== -1 ? userIndex + 1 : 1;

    return (
        <View style={styles.bottom_ctnr}>
            {/* Buttons Container */}
            <View style={styles.buttons_ctnr}>
                <View style={styles.right_buttons}>
                    <RNBounceable
                        style={getBounceableStyle()}
                        onPress={openModal}
                    >
                        <Text style={getTextStyle()}>{categoryCompared}</Text>
                    </RNBounceable>
                    <RNBounceable
                        style={getBounceableStyle(0.5)}
                        onPress={toggleFollowers}
                        disabled
                    >
                        <Text style={getTextStyle()}>{showFollowers}</Text>
                    </RNBounceable>
                </View>
            </View>

            {/* User's Own Leaderboard Card */}
            <LeaderboardCard
                pfp={global.userData.image}
                name={global.userData.name}
                handle={global.userData.handle}
                value={getStatField(global.userData, categoryCompared, '1RM', 0)}
                rank={userRank}
                lastRank={getStatField(global.userData, categoryCompared, 'lastFollowerRank', null)}
                bestSet={getStatField(global.userData, categoryCompared, 'bestSet', { weight: 0, reps: 0 })}
                userIsSelf
                handlePress={() => openBottomSheet(global.userData)}
            />

            {/* Leaderboard List */}
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
                        name={item.name}
                        value={getStatField(item, categoryCompared, '1RM', 0)}
                        rank={index + 1}
                        lastRank={getStatField(item, categoryCompared, 'lastFollowerRank', null)}
                        bestSet={getStatField(item, categoryCompared, 'bestSet', { weight: 0, reps: 0 })}
                        handlePress={() => openBottomSheet(item)}
                    />
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    bottom_ctnr: {
        flex: 1,
        paddingTop: 10,
    },
    right_buttons: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
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
        alignItems: 'center',
    },
    button: {
        borderRadius: 20,
        backgroundColor: '#BCDDFF',
        alignItems: 'center',
    },
    selectedButton: {
        backgroundColor: '#ddd',
    },
    buttonText: {
        color: '#666',
        fontFamily: 'Outfit_700Bold',
    },
});

export default LeaderboardModal;
