import React, { useRef } from "react";
import { StyleSheet, View, Text, Image, ScrollView, Animated, TouchableWithoutFeedback } from "react-native";
import { FontAwesome } from '@expo/vector-icons';
import LeaderboardPreviewCard from "./LeaderboardPreviewCard";
 
export default function LeaderboardPreview({ userList }) {
    const bounceValue = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(bounceValue, {
            toValue: 0.95,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(bounceValue, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    const winner = userList[0]; // Assuming the first user in the list is the winner

    return (
        <Animated.View style={[styles.main_view, { transform: [{ scale: bounceValue }] }]}>
            <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
                <View style={styles.leaderboard_preview}>
                    <View style={styles.content}>
                        <View style={styles.left}>
                            <View style={styles.pfpContainer}>
                                <Image source={{ uri: winner.image }} style={styles.pfp} />
                                <FontAwesome name="trophy" size={24} color="gold" style={styles.trophyIcon} />
                            </View>
                            <Text style={styles.nameText}>{winner.handle}</Text>
                        </View>
                        <View style={styles.right}>
                            <View style={styles.statsContainer}>
                                <Text style={styles.statNumberText}>{winner.stats.exercises.benchPress}</Text>
                                <Text style={styles.statText}>Bench Press Max</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>


            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {userList.map((user, index) => (
                    <LeaderboardPreviewCard
                        key={user.uid}
                        uid={user.uid}
                        pfp={user.image}
                        handle={user.handle}
                        value={user.stats.exercises['benchPress']}
                        rank={index + 1}
                    />
                ))}
            </ScrollView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    main_view: {
        marginHorizontal: 15,
        // height: 335,
        height: 260,
        borderRadius: 25,
        shadowColor: '#666',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 15,
        backgroundColor: 'white', // Ensure background color is set
    },
    leaderboard_preview: {
        height: 93,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        backgroundColor: '#6FB8FF',
        shadowRadius: 3,
        elevation: 5,
        paddingVertical: 15,
        paddingHorizontal: 22,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        height: '100%',
    },
    pfpContainer: {
        width: 62,
        aspectRatio: 1,
        borderRadius: 40,
        marginRight: 8,
        position: 'relative',
    },
    pfp: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    trophyIcon: {
        position: 'absolute',
        bottom: -10,
        right: 16,
        zIndex: 1,
        borderRadius: 12,
        padding: 2,
    },
    left: {
        flexDirection: 'row',
        height: '100%',
        alignItems: 'center',
    },
    right: {
        flex: 1,
        alignItems: 'flex-end',
        paddingRight: 12,
    },
    statsContainer: {
        alignItems: 'center',
    },
    nameText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 22,
        fontFamily: 'Outfit_700Bold',
    },
    statNumberText: {
        fontSize: 34,
        fontFamily: 'Outfit_700Bold',
        color: '#fff',
    },
    statText: {
        fontSize: 13.5,
        fontFamily: 'Lato_700Bold',
        color: '#fff',
    },
});
