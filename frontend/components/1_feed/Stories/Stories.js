import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';
import StoryHeaderButtons from "./StoryHeaderButtons";
import Story from "./Story";
import { BlurView } from 'expo-blur';
import CreateStoryScreen from './CreateStoryScreen';
import updateDoc from '../../../../backend/helper/firebase/updateDoc';
import getFollowers from '../../../../backend/getFollowers';
import getStoriesPrefixSums from '../../../helper/getStoriesPrefixSums'
import sortStoriesDataByUserList from '../../../helper/sortStoriesDataByUserList'

const Stories = ({ data, userList, initStories, navigation }) => {
    const [viewModalVisible, setViewModal] = useState(false);
    const [createModalVisible, setCreateModal] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(null);
    const viewedStories = useRef([]);

    const storiesPrefixSums = getStoriesPrefixSums(userList);
    const storiesData = sortStoriesDataByUserList(data, userList);

    const postStoryToFeeds = async (sid) => {
        const updatedUserList = [...userList];
        updatedUserList[0].stories.push(sid);

        await updateDoc('users', global.userData.uid, { feedStories: updatedUserList });
        initStories();

        const followers = await getFollowers(global.userData.followers);
        for (const follower of followers) {
            const newFeedStories = [...follower.feedStories];
            const userIndex = newFeedStories.findIndex(story => story.uid === global.userData.uid);

            if (userIndex !== -1) {
                newFeedStories[userIndex].stories.push(sid);
            } else {
                newFeedStories.push({
                    name: global.userData.name,
                    uid: global.userData.uid,
                    handle: global.userData.handle,
                    pfp: global.userData.image,
                    stories: [sid]
                });
            }

            await updateDoc('users', follower.uid, { feedStories: newFeedStories });
        }
    };

    const handleStoryNavigation = (direction) => {
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < storiesData.length) {
            setCurrentIndex(newIndex);
            viewedStories.current = [...viewedStories.current, storiesData[newIndex].sid];
        } else {
            setViewModal(false);
            setCurrentIndex(null);
        }
    };

    const handlePress = (index) => {
        const storyIndex = index === 0 ? 0 : storiesPrefixSums[index - 1];
        const sectionIndex = storiesPrefixSums.findIndex(sum => storyIndex < sum);
        const sectionStartIndex = sectionIndex === 0 ? 0 : storiesPrefixSums[sectionIndex - 1];
        const sectionEndIndex = storiesPrefixSums[sectionIndex] - 1;

        const allViewed = storiesData.slice(sectionStartIndex, sectionEndIndex + 1).every(story =>
            viewedStories.current.includes(story.sid)
        );

        if (allViewed) {
            setCurrentIndex(sectionStartIndex);
        } else {
            let nextUnviewed = index;
            while (nextUnviewed <= sectionEndIndex && viewedStories.current.includes(storiesData[nextUnviewed].sid)) {
                nextUnviewed++;
            }
            setCurrentIndex(nextUnviewed <= sectionEndIndex ? nextUnviewed : null);
        }

        if (currentIndex !== null) setViewModal(true);
    };

    const renderItem = ({ item, index }) => (
        <Story
            data={item}
            index={index}
            isViewed={item.stories.every(sid => viewedStories.current.includes(sid))}
            handlePressCreateButton={() => setCreateModal(true)}
            handlePress={() => handlePress(index)}
        />
    );

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
                        <Pressable onPress={() => handleStoryNavigation(-1)} style={styles.screenLeft} />
                        <Pressable onPress={() => setViewModal(false)} style={styles.screenCenter} />
                        <Pressable onPress={() => handleStoryNavigation(1)} style={styles.screenRight} />
                    </View>

                    <BlurView intensity={5} style={styles.blurview} />
                    <StoryHeaderButtons
                        stories={storiesData}
                        userList={userList}
                        index={currentIndex}
                        toViewProfile={(profileIndex) => {
                            setViewModal(false);
                            navigation.navigate('ViewProfile', { user: storiesData[profileIndex] });
                        }}
                    />
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
};

export default Stories;

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
