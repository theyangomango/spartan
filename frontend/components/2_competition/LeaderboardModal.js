import React from "react";
import { StyleSheet, View, Text, FlatList, Dimensions } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import LeaderboardCard from "./LeaderboardCard";
import { getLeaderboardModalStyles } from "../../helper/getLeaderboardModalStyles";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const dynamicStyles = getLeaderboardModalStyles(SCREEN_WIDTH, SCREEN_HEIGHT);

const getBounceableStyle = () => [
    styles.button,
    styles.selectedButton,
    {
        paddingHorizontal: dynamicStyles.buttonPaddingHorizontal,
        paddingVertical: dynamicStyles.buttonPaddingVertical,
        marginHorizontal: dynamicStyles.buttonMarginHorizontal,
    },
];

const getTextStyle = () => [
    styles.buttonText,
    { fontSize: dynamicStyles.buttonTextFontSize },
];

/**
 * Safely fetches a particular field from a user’s exercise stats.
 * @param {Object} user - The user object containing stats.
 * @param {string} category - The exercise category key.
 * @param {string} field - The field to access inside the category (e.g., "1RM", "Volume", "Reps").
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
    comparedMetric,      // <-- NEW: "1RM" | "Volume" | "Reps"
    onToggleMetric,      // <-- NEW: callback to cycle the metric
    openModal,
    openBottomSheet,
    isBottomSheetExpanded,
}) => {
    return (
        <View style={styles.bottom_ctnr}>
            {/* Buttons Container */}
            <View style={styles.buttons_ctnr}>
                <View style={styles.right_buttons}>
                    {/* Left pill: exercise picker */}
                    <RNBounceable style={getBounceableStyle()} onPress={openModal}>
                        <Text style={getTextStyle()}>{categoryCompared}</Text>
                    </RNBounceable>

                    {/* Right pill: metric toggle (replaces the old "followers/global" button) */}
                    <RNBounceable style={getBounceableStyle()} onPress={onToggleMetric}>
                        <Text style={getTextStyle()}>{comparedMetric}</Text>
                    </RNBounceable>
                </View>
            </View>

            {/* Leaderboard List (self card emphasized inline) */}
            <FlatList
                data={userList}
                keyExtractor={(item, index) => String(item?.uid ?? index)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.flatlist_ctnr}
                ListHeaderComponent={<View style={{ height: 8 }} />}
                ListFooterComponent={
                    <View style={{ height: isBottomSheetExpanded ? 100 : 400 }} />
                }
                renderItem={({ item, index }) => {
                    const isSelf = item?.uid === global?.userData?.uid;
                    // Pull the stat that matches the current metric
                    const value = getStatField(item, categoryCompared, comparedMetric, 0);

                    return (
                        <LeaderboardCard
                            pfp={item.image}
                            handle={item.handle}
                            name={item.name}
                            value={Number.isFinite(value) ? value : 0}
                            rank={index + 1}
                            lastRank={getStatField(
                                item,
                                categoryCompared,
                                "lastFollowerRank",
                                null
                            )}
                            bestSet={getStatField(item, categoryCompared, "bestSet", {
                                weight: 0,
                                reps: 0,
                            })}
                            userIsSelf={isSelf}
                            handlePress={() => openBottomSheet(item)}
                        />
                    );
                }}
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
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    flatlist_ctnr: {
        flexGrow: 1,
    },
    buttons_ctnr: {
        flexDirection: "row",
        paddingTop: 6,
        paddingRight: 15,
        paddingLeft: 32,
        alignItems: "center",
    },
    button: {
        borderRadius: 20,
        backgroundColor: "#BCDDFF",
        alignItems: "center",
    },
    selectedButton: {
        backgroundColor: "#ddd",
    },
    buttonText: {
        color: "#666",
        fontFamily: "Outfit_700Bold",
    },
});

export default LeaderboardModal;
