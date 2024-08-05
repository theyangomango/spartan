import React from "react";
import { StyleSheet, View, Text, ScrollView } from "react-native";
import RNBounceable from '@freakycoder/react-native-bounceable';
import CompetitionCard from "./CompetitionCard";

const LeaderboardModal = ({ userList, categoryCompared, showFollowers, toggleFollowers, openModal, openBottomSheet }) => {
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
    );
}

const styles = StyleSheet.create({
    bottom_ctnr: {
        // position: 'absolute',
        // bottom: 0,
        // left: 0,
        // right: 0,
        backgroundColor: '#fff',
        flex: 1,
    },
    right_buttons: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end'
    },
    scrollview_ctnr: {
        flex: 1,
    },
    buttons_ctnr: {
        flexDirection: 'row',
        marginBottom: 10,
        paddingTop: 10,
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
    }
});

export default LeaderboardModal;
