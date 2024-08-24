import React from "react";
import { StyleSheet, View, Text, FlatList, Dimensions } from "react-native";
import RNBounceable from '@freakycoder/react-native-bounceable';
import LeaderboardCard from "./LeaderboardCard";

const { width, height } = Dimensions.get("window");

// Function to determine dynamic styles based on screen size
const getDynamicStyles = () => {
    if (width >= 430 && height >= 932) { // iPhone 14 Pro Max and similar
        return {
            buttonTextFontSize: 15,
            buttonPaddingHorizontal: 15,
            buttonPaddingVertical: 11,
            buttonMarginHorizontal: 4.5,
        };
    } else if (width >= 390 && height >= 844) { // iPhone 13/14 and similar
        return {
            buttonTextFontSize: 13,
            buttonPaddingHorizontal: 12.5,
            buttonPaddingVertical: 9.5,
            buttonMarginHorizontal: 3.5,
        };
    } else if (width >= 375 && height >= 812) { // iPhone X/XS/11 Pro and similar
        return {
            buttonTextFontSize: 13.5,
            buttonPaddingHorizontal: 12,
            buttonPaddingVertical: 9.5,
            buttonMarginHorizontal: 3.5,
        };
    } else { // Smaller iPhone models (like iPhone SE)
        return {
            buttonTextFontSize: 12,
            buttonPaddingHorizontal: 11,
            buttonPaddingVertical: 8.5,
            buttonMarginHorizontal: 3,
        };
    }
};

const dynamicStyles = getDynamicStyles();

const LeaderboardModal = ({ userList, categoryCompared, showFollowers, toggleFollowers, openModal, openBottomSheet, isBottomSheetExpanded }) => {
    const userIndex = userList.findIndex(item => item.uid === global.userData.uid);
    const userRank = userIndex !== -1 ? userIndex + 1 : 1; // Default to 1 if not found

    return (
        <View style={[styles.bottom_ctnr]}>
            <View style={styles.buttons_ctnr}>
                <View style={styles.right_buttons}>
                    <RNBounceable
                        style={[styles.button, styles.selectedButton, { paddingHorizontal: dynamicStyles.buttonPaddingHorizontal, paddingVertical: dynamicStyles.buttonPaddingVertical, marginHorizontal: dynamicStyles.buttonMarginHorizontal }]}
                        onPress={openModal}
                    >
                        <Text style={[styles.buttonText, { fontSize: dynamicStyles.buttonTextFontSize }]}>{categoryCompared}</Text>
                    </RNBounceable>
                    <RNBounceable
                        disabled // Disabled for Beta
                        style={[styles.button, styles.selectedButton, { paddingHorizontal: dynamicStyles.buttonPaddingHorizontal, paddingVertical: dynamicStyles.buttonPaddingVertical, marginHorizontal: dynamicStyles.buttonMarginHorizontal }]}
                        onPress={toggleFollowers}
                    >
                        <Text style={[styles.buttonText, { fontSize: dynamicStyles.buttonTextFontSize }]}>{showFollowers}</Text>
                    </RNBounceable>
                </View>
            </View>
            <LeaderboardCard
                pfp={global.userData.image}
                name={global.userData.name}
                handle={global.userData.handle}
                value={(categoryCompared in global.userData.statsExercises && '1RM' in global.userData.statsExercises[categoryCompared]) ? global.userData.statsExercises[categoryCompared]['1RM'] : 0}
                rank={userRank}
                lastRank={(categoryCompared in global.userData.statsExercises && 'lastFollowersRank' in global.userData.statsExercises[categoryCompared]) ? global.userData.statsExercises[categoryCompared]['lastFollowersRank'] : null}
                handlePress={() => openBottomSheet(global.userData)}
                userIsSelf={true}
                bestSet={(categoryCompared in global.userData.statsExercises && 'bestSet' in global.userData.statsExercises[categoryCompared]) ? global.userData.statsExercises[categoryCompared]['bestSet'] : { weight: 0, reps: 0 }}
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
                        name={item.name}
                        value={(categoryCompared in item.statsExercises && '1RM' in item.statsExercises[categoryCompared]) ? item.statsExercises[categoryCompared]['1RM'] : 0}
                        rank={index + 1}
                        lastRank={(categoryCompared in item.statsExercises && 'lastFollowersRank' in item.statsExercises[categoryCompared]) ? item.statsExercises[categoryCompared]['lastFollowersRank'] : null}
                        handlePress={() => openBottomSheet(item)}
                        bestSet={(categoryCompared in item.statsExercises && 'bestSet' in item.statsExercises[categoryCompared]) ? item.statsExercises[categoryCompared]['bestSet'] : { weight: 0, reps: 0 }}
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
        backgroundColor: '#BCDDFF',
        alignItems: 'center',
    },
    selectedButton: {
        backgroundColor: '#ddd'
    },
    buttonText: {
        color: '#666',
        fontFamily: 'Outfit_700Bold',
    },
});

export default LeaderboardModal;
