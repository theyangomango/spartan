/**
 * Displays header (pfp, handle) for a story, with a "like" button and progress dash indicators.
 * Pressing on the pfp/handle redirects to the creator's Profile
 */

import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { Heart } from 'iconsax-react-native';
import { useEffect, useState } from "react";
import FastImage from 'react-native-fast-image';
import getStoriesPrefixSums from '../../../helper/getStoriesPrefixSums';
import { likeStory } from './../../../../backend/stories/likeStory';
import { unlikeStory } from './../../../../backend/stories/unlikeStory';
import scaleSize from "../../../helper/scaleSize";

export default function StoryHeaderButtons({ stories, userList, index, toViewProfile }) {
    // Track whether the user has liked the current story
    const [isLiked, setIsLiked] = useState(
        stories[index].likedUsers.includes(global.userData.uid)
    );

    const prefixSum = getStoriesPrefixSums(userList);

    // Find the user index for this story within userList
    function getUserIndexForStory(storyIndex) {
        for (let i = 0; i < prefixSum.length; i++) {
            if (storyIndex < prefixSum[i]) return i;
        }
        return -1;
    }

    const userIndex = getUserIndexForStory(index);
    const numOfStories = userList[userIndex].stories.length;
    const storyStartIndex = prefixSum[userIndex] - numOfStories;
    const relativeStoryIndex = index - storyStartIndex;

    // Update the local `isLiked` state whenever the story index changes
    useEffect(() => {
        setIsLiked(stories[index].likedUsers.includes(global.userData.uid));
    }, [index]);

    // Toggle like status in local state + call appropriate backend functions
    function handlePressLikeButton() {
        if (!isLiked) {
            likeStory(stories[index].sid, global.userData.uid);
            stories[index].likedUsers.push(global.userData.uid);
        } else {
            unlikeStory(stories[index].sid, global.userData.uid);
            const i = stories[index].likedUsers.indexOf(global.userData.uid);
            if (i > -1) stories[index].likedUsers.splice(i, 1);
        }
        setIsLiked(!isLiked);
    }

    // Determine dash size based on the number of stories
    const dashWidth = numOfStories > 4 ? scaleSize(30) : scaleSize(42);
    const dashMargin = numOfStories > 4 ? scaleSize(1.5) : scaleSize(2.5);

    return (
        <View style={styles.mainContainer}>

            {/* Left side: pfp + handle */}
            <Pressable onPress={() => toViewProfile(index)} style={styles.left}>
                <FastImage
                    key={stories[index].sid}
                    source={{ uri: stories[index].pfp }}
                    style={styles.pfp}
                    resizeMode={FastImage.resizeMode.cover}
                />
                <Text style={styles.handleText}>{stories[index].handle}</Text>
            </Pressable>

            {/* Right side: dash indicators + like button */}
            <View style={styles.right}>
                <View style={styles.dashContainer}>
                    {Array(numOfStories).fill(null).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dash,
                                { width: dashWidth, marginHorizontal: dashMargin },
                                i === relativeStoryIndex ? styles.activeDash : styles.inactiveDash
                            ]}
                        />
                    ))}
                </View>

                <Pressable onPress={handlePressLikeButton}>
                    {isLiked ? (
                        <Heart size={scaleSize(23)} color="#FF8A65" variant="Bold" />
                    ) : (
                        <Heart size={scaleSize(23)} color="#FF8A65" />
                    )}
                </Pressable>
            </View>
        </View>
    );
}

// Styles
const styles = StyleSheet.create({
    mainContainer: {
        flexDirection: "row",
        width: "100%",
        justifyContent: "space-between",
        paddingHorizontal: scaleSize(20),
        paddingTop: scaleSize(37),
        position: "absolute",
        zIndex: 999
    },
    left: {
        flexDirection: "row",
        alignItems: "center"
    },
    pfp: {
        width: scaleSize(32),
        aspectRatio: 1,
        borderRadius: scaleSize(22)
    },
    handleText: {
        color: "#fff",
        padding: scaleSize(8),
        fontSize: scaleSize(16),
        fontFamily: "SourceSansPro_600SemiBold"
    },
    right: {
        flexDirection: "row",
        alignItems: "center"
    },
    dashContainer: {
        flexDirection: "row",
        marginRight: scaleSize(10)
    },
    dash: {
        height: scaleSize(4),
        borderRadius: scaleSize(90),
    },
    activeDash: {
        backgroundColor: "#fff"
    },
    inactiveDash: {
        backgroundColor: "#bbb"
    }
});
