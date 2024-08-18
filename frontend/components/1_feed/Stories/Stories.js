import React, { useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';
import StoryHeaderButtons from "./StoryHeaderButtons";
import Story from "./Story";
import { BlurView } from 'expo-blur';
import CreateStoryScreen from './CreateStoryScreen';
import updateDoc from '../../../../backend/helper/firebase/updateDoc';
import getFollowers from '../../../../backend/getFollowers';

function sortDataByUserList(data, userList) {
    // Create a map to store the order of each ID in the userList
    const idOrderMap = new Map();

    // Iterate through the userList to map each ID to its order
    userList.forEach((user, userIndex) => {
        user.stories.forEach((id, storyIndex) => {
            idOrderMap.set(id, userIndex * 1000 + storyIndex); // Combine userIndex and storyIndex for ordering
        });
    });

    // Sort the data array based on the orders in the idOrderMap
    data.sort((a, b) => {
        const orderA = idOrderMap.get(a);
        const orderB = idOrderMap.get(b);

        // If either ID is not found in the map, place it at the end
        if (orderA === undefined) return 1;
        if (orderB === undefined) return -1;

        return orderA - orderB;
    });

    return data;
}

function generatePrefixSumArray(userList) {
    const prefixSumArray = [];
    let currentSum = 0;

    userList.forEach((user, index) => {
        currentSum += user.stories.length;
        prefixSumArray.push(currentSum);
    });

    return prefixSumArray;
}

export default function Stories({ data, userList, initStories, navigation }) {
    const storiesData = sortDataByUserList(data, userList);
    const storiesPrefixSums = generatePrefixSumArray(userList);
    const [viewModalVisible, setViewModal] = useState(false);
    const [createModalVisible, setCreateModal] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(null);
    const viewedStories = useRef([]);

    async function postStoryToFeeds(sid) {
        const newUserList = userList;
        newUserList[0].stories.push(sid);
        updateDoc('users', global.userData.uid, {
            feedStories: userList
        }).then(() => {
            initStories();
        })

        const followers = await getFollowers(global.userData.followers);
        followers.forEach(follower => {
            const newFeedStories = [...follower.feedStories];

            // Check if the user is already in the newFeedStories
            const userIndex = newFeedStories.findIndex(story => story.uid === global.userData.uid);

            if (userIndex !== -1) {
                // If user exists, append the story id
                newFeedStories[userIndex].stories.push(sid);
            } else {
                // If user does not exist, create a new entry
                newFeedStories.push({
                    name: global.userData.name,
                    uid: global.userData.uid,
                    handle: global.userData.handle,
                    pfp: global.userData.image,
                    stories: [sid]
                });
            }

            // Update the follower's feedStories in the database
            updateDoc('users', follower.uid, {
                feedStories: newFeedStories
            });
        });
    }

    function handlePress(index) {
        // Determine the section based on the index using the prefix sum array
        let sectionIndex = storiesPrefixSums.findIndex(sum => index < sum);
        let sectionStartIndex = sectionIndex === 0 ? 0 : storiesPrefixSums[sectionIndex - 1];
        let sectionEndIndex = storiesPrefixSums[sectionIndex] - 1;

        // Check if all stories in the section have been viewed
        const allViewed = storiesData.slice(sectionStartIndex, sectionEndIndex + 1).every(story =>
            viewedStories.current.includes(story.sid)
        );

        if (allViewed) {
            // Start with the first story in the section if all are viewed
            index = sectionStartIndex;
        } else {
            // Otherwise, find the next unviewed story in the section
            while (index <= sectionEndIndex && viewedStories.current.includes(storiesData[index].sid)) {
                index++;
            }
        }

        // If an unviewed story is found, open it
        if (index <= sectionEndIndex) {
            setCurrentIndex(index);
            setViewModal(true);
            viewedStories.current = [...viewedStories.current, storiesData[index].sid];
            console.log(viewedStories.current);
        } else {
            // If no unviewed stories are found, close the modal
            setViewModal(false);
            setCurrentIndex(null);
        }
    }


    const renderItem = ({ item, index }) => (
        <Story
            data={item}
            index={index}
            isViewed={item.stories.every(sid => {
                return viewedStories.current.includes(sid);
            })}
            handlePressCreateButton={handlePressCreateButton}
            handlePress={() => handlePress(index === 0 ? index : storiesPrefixSums[index - 1])}
        />
    );

    function handlePressLeft() {
        if (currentIndex > 0) {
            let newIndex = currentIndex - 1;
            if (newIndex < 0) {
                newIndex = currentIndex - 1;
            }
            setCurrentIndex(newIndex);
            viewedStories.current = ([...viewedStories.current, storiesData[newIndex].sid]);
        } else {
            setViewModal(false);
            setCurrentIndex(null);
        }
    }


    function handlePressRight() {
        if (currentIndex < storiesData.length - 1) {
            let newIndex = currentIndex + 1;
            if (newIndex >= storiesData.length) {
                newIndex = currentIndex + 1;
            }
            setCurrentIndex(newIndex);
            viewedStories.current = ([...viewedStories.current, storiesData[newIndex].sid]);
        } else {
            setViewModal(false);
        }
    }

    function handlePressCreateButton() {
        setCreateModal(true);
    }

    return (
        <View style={styles.storiesContainer}>
            <FlatList
                data={userList}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                contentContainerStyle={styles.flatlistContent}
                style={styles.flatlist}
            />

            {(currentIndex !== null) && (
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
                        <Pressable onPress={handlePressLeft} style={styles.screenLeft} />
                        <Pressable onPress={() => setViewModal(false)} style={styles.screenCenter} />
                        <Pressable onPress={handlePressRight} style={styles.screenRight} />
                    </View>

                    <BlurView intensity={5} style={styles.blurview} />
                    <View style={styles.modalHeader}>
                        <StoryHeaderButtons stories={storiesData} index={currentIndex} toViewProfile={index => {
                            setViewModal(false);
                            const user = {
                                handle: storiesData[index].handle,
                                uid: storiesData[index].uid,
                                pfp: storiesData[index].pfp,
                                name: storiesData[index].name
                            }

                            navigation.navigate('ViewProfile', { user: user })
                        }
                        } />
                    </View>
                </Modal>
            )}

            <Modal
                animationType='slide'
                transparent={true}
                visible={createModalVisible}
            >
                <CreateStoryScreen closeModal={() => setCreateModal(false)} postStoryToFeeds={postStoryToFeeds} />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    storiesContainer: {
        backgroundColor: '#fff',
        paddingTop: 6,
        paddingBottom: 5,
    },
    flatlist: {
        paddingLeft: 15,
    },
    flatlistContent: {
        flexDirection: 'row',
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1,
    },
    blurview: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 85,
        zIndex: 1,
    },
    modalContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
    },
    screenLeft: {
        position: 'absolute',
        top: 100,
        left: 0,
        height: '100%',
        width: '25%',
    },
    screenCenter: {
        position: 'absolute',
        top: 100,
        left: '25%',
        width: '50%',
        height: '100%',
    },
    screenRight: {
        position: 'absolute',
        top: 100,
        right: 0,
        height: '100%',
        width: '25%',
    },
});
