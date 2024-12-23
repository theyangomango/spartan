/**
 * Handles user-created stories within the feed.
 * Displays a list of stories, modals for viewing & creating, and updates Firestore.
 * * Handles all the viewing stories logic
 * Todo - story images loading, take down stories after 24 hrs
 */

import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    View
} from "react-native";
import FastImage from "react-native-fast-image";
import { BlurView } from "expo-blur";

import StoryHeaderButtons from "./StoryHeaderButtons";
import StoryTile from "./StoryTile";
import CreateStoryScreen from "./CreateStoryScreen";

import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import getFollowers from "../../../../backend/getFollowers";
import getStoriesPrefixSums from "../../../helper/getStoriesPrefixSums";
import sortStoriesDataByUserList from "../../../helper/sortStoriesDataByUserList";

export default function Stories({ data, userList, initStories, navigation }) {
    // Manage modals & current story index
    const [viewModalVisible, setViewModal] = useState(false);
    const [createModalVisible, setCreateModal] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(null);

    // Keep track of viewed stories
    const viewedStories = useRef([]);

    // Precompute sums & sorted data for story sections
    const storiesPrefixSums = getStoriesPrefixSums(userList);
    const storiesData = sortStoriesDataByUserList(data, userList);

    // Add a new story (sid) to the user's feed and propagate to followers.
    async function postStoryToFeeds(sid) {
        // Update current user's feed
        const updatedUserList = [...userList];
        updatedUserList[0].stories.push(sid);
        await updateDoc("users", global.userData.uid, { feedStories: updatedUserList });
        initStories(); // Refresh user’s feed

        // Update followers' feeds
        const followers = await getFollowers(global.userData.followers);
        for (const f of followers) {
            const newFeed = [...f.feedStories];
            const idx = newFeed.findIndex(st => st.uid === global.userData.uid);

            if (idx !== -1) {
                newFeed[idx].stories.push(sid);
            } else {
                newFeed.push({
                    name: global.userData.name,
                    uid: global.userData.uid,
                    handle: global.userData.handle,
                    pfp: global.userData.image,
                    stories: [sid]
                });
            }
            await updateDoc("users", f.uid, { feedStories: newFeed });
        }
    }

    // Navigate to next/previous story; close if out of range.
    function handleStoryNavigation(direction) {
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < storiesData.length) {
            setCurrentIndex(newIndex);
            viewedStories.current.push(storiesData[newIndex].sid);
        } else {
            setViewModal(false);
            setCurrentIndex(null);
        }
    }

    // Open the story at index; skip already viewed sections.
    function handlePress(index) {
        const storyIndex = index === 0 ? 0 : storiesPrefixSums[index - 1];
        const sectionIndex = storiesPrefixSums.findIndex(s => storyIndex < s);
        const sectionStart = sectionIndex === 0 ? 0 : storiesPrefixSums[sectionIndex - 1];
        const sectionEnd = storiesPrefixSums[sectionIndex] - 1;

        // Check if entire section is viewed
        const allViewed = storiesData
            .slice(sectionStart, sectionEnd + 1)
            .every(st => viewedStories.current.includes(st.sid));

        if (allViewed) {
            setCurrentIndex(sectionStart); // If all viewed, start at beginning
        } else {
            let nextUnviewed = index;
            while (
                nextUnviewed <= sectionEnd &&
                viewedStories.current.includes(storiesData[nextUnviewed].sid)
            ) {
                nextUnviewed++;
            }
            setCurrentIndex(nextUnviewed <= sectionEnd ? nextUnviewed : null);
        }
        if (currentIndex !== null) setViewModal(true);
    }

    // Render each Story thumbnail in a horizontal list.
    function renderItem({ item, index }) {
        const isViewed = item.stories.every(sid => viewedStories.current.includes(sid));
        return (
            <StoryTile
                data={item}
                index={index}
                isViewed={isViewed}
                handlePressCreateButton={() => setCreateModal(true)}
                handlePress={() => handlePress(index)}
            />
        );
    }

    return (
        <View style={styles.storiesContainer}>
            {/* Horizontal list of user stories */}
            <FlatList
                data={userList}
                renderItem={renderItem}
                keyExtractor={(_, idx) => idx.toString()}
                horizontal
                contentContainerStyle={styles.flatlistContent}
                style={styles.flatlist}
            />

            {/* Fullscreen Story Modal */}
            {currentIndex !== null && (
                <Modal
                    animationType="fade"
                    transparent={false}
                    visible={viewModalVisible}
                    onRequestClose={() => setViewModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <FastImage
                                key={storiesData[currentIndex].sid}
                                source={{ uri: storiesData[currentIndex].image }}
                                style={styles.fullScreenImage}
                                resizeMode={FastImage.resizeMode.cover}
                                placeholder={<ActivityIndicator />}
                            />
                        </View>
                        <Pressable onPress={() => handleStoryNavigation(-1)} style={styles.screenLeft} />
                        <Pressable onPress={() => setViewModal(false)} style={styles.screenCenter} />
                        <Pressable onPress={() => handleStoryNavigation(1)} style={styles.screenRight} />
                    </View>

                    <BlurView intensity={5} style={styles.blurview} />
                    <StoryHeaderButtons
                        stories={storiesData}
                        userList={userList}
                        index={currentIndex}
                        toViewProfile={pi => {
                            setViewModal(false);
                            navigation.navigate("ViewProfile", { user: storiesData[pi] });
                        }}
                    />
                </Modal>
            )}

            {/* Create Story Modal */}
            <Modal
                animationType="slide"
                transparent
                visible={createModalVisible}
            >
                <CreateStoryScreen
                    closeModal={() => setCreateModal(false)}
                    postStoryToFeeds={postStoryToFeeds}
                />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    storiesContainer: {
        backgroundColor: "#fff",
        paddingTop: 6,
        paddingBottom: 5,
    },
    flatlist: { paddingLeft: 15 },
    flatlistContent: { flexDirection: "row" },
    modalContainer: { flex: 1 },
    blurview: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: 85,
        zIndex: 1,
    },
    modalContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    fullScreenImage: {
        width: "100%",
        height: "100%",
    },
    screenLeft: {
        position: "absolute",
        top: 100,
        left: 0,
        height: "100%",
        width: "25%",
    },
    screenCenter: {
        position: "absolute",
        top: 100,
        left: "25%",
        width: "50%",
        height: "100%",
    },
    screenRight: {
        position: "absolute",
        top: 100,
        right: 0,
        height: "100%",
        width: "25%",
    },
});
