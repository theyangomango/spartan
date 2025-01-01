/**
 * Handles user-created stories within the feed.
 * Displays a list of stories, modals for viewing & creating, and updates Firestore.
 * Handles the logic for directing/navigating the user through stories
 * * Stories are rendered using FullStoryModal
 */

import React, { useRef, useState } from "react";
import {
    FlatList,
    Modal,
    StyleSheet,
    View
} from "react-native";

import StoryTile from "./StoryTile";
import CreateStoryScreen from "./CreateStoryScreen";
import FullStoryModal from "./FullStoryModal";

import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import getFollowers from "../../../../backend/getFollowers";
import getStoriesPrefixSums from "../../../helper/getStoriesPrefixSums";
import sortStoriesDataByUserList from "../../../helper/sortStoriesDataByUserList";

export default function Stories({ data, userList, initStories, navigation }) {
    console.log(userList);

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
        console.log("handle press", index);

        const storyIndex = index === 0 ? 0 : storiesPrefixSums[index - 1];
        const sectionIndex = storiesPrefixSums.findIndex(s => storyIndex < s);
        const sectionStart = sectionIndex === 0 ? 0 : storiesPrefixSums[sectionIndex - 1];
        const sectionEnd = storiesPrefixSums[sectionIndex] - 1;

        // Check if entire section is viewed
        const allViewed = storiesData
            .slice(sectionStart, sectionEnd + 1)
            .every(st => viewedStories.current.includes(st.sid));

        let renderedIndex;
        if (allViewed) {
            // If all viewed, start at beginning of that section
            renderedIndex = sectionStart;
        } else {
            // Otherwise, jump to the next unviewed story
            let temp = index;
            while (
                temp <= sectionEnd &&
                viewedStories.current.includes(storiesData[temp].sid)
            ) {
                temp++;
            }
            renderedIndex = temp <= sectionEnd ? temp : null;
        }

        // Only open the modal if `renderedIndex` is valid
        if (renderedIndex !== null) {
            setCurrentIndex(renderedIndex);
            setViewModal(true);
            viewedStories.current.push(storiesData[renderedIndex].sid);
        }
    }

    // Render each Story thumbnail in a horizontal list.
    function renderItem({ item, index }) {
        const isViewed = item.stories.every(sid => viewedStories.current.includes(sid));

        console.log({ item });

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

            <FullStoryModal
                isVisible={viewModalVisible}
                onClose={() => {
                    setViewModal(false);
                    setCurrentIndex(null);
                }}
                currentIndex={currentIndex}
                storiesData={storiesData}
                userList={userList}
                handleStoryNavigation={handleStoryNavigation}
                navigation={navigation}
            />

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
    flatlist: {
        paddingLeft: 15
    },
    flatlistContent: {
        flexDirection: "row"
    },
});
