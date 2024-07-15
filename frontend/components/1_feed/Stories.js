import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image'; // Import FastImage
import StoryHeaderButtons from "./StoryHeaderButtons";
import Story from "./Story";
import { BlurView } from 'expo-blur'; // Make sure BlurView is imported correctly
import CreateStoryScreen from './CreateStoryScreen';

export default function Stories({ data }) {
    const [viewModalVisible, setViewModal] = useState(false);
    const [createModalVisible, setCreateModal] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(null);
    const [viewedStories, setViewedStories] = useState({});

    function handlePress(index) {
        setCurrentIndex(index);
        setViewModal(true);
        setViewedStories((prev) => ({ ...prev, [data[index].sid]: true }));
    }

    const renderItem = ({ item, index }) => (
        <Pressable onPress={() => handlePress(index)}>
            <Story data={item} index={index} handlePress={handlePress} isViewed={!!viewedStories[item.sid]} handlePressCreateButton={handlePressCreateButton} />
        </Pressable>
    );

    function handlePressLeft() {
        if (currentIndex > 0) {
            let newIndex = currentIndex - 1;
            while (newIndex >= 0 && viewedStories[data[newIndex].sid]) {
                newIndex -= 1;
            }
            if (newIndex < 0) {
                newIndex = currentIndex - 1;
            }
            setCurrentIndex(newIndex);
            setViewedStories((prev) => ({ ...prev, [data[newIndex].sid]: true }));
        } else {
            setViewModal(false);
            setCurrentIndex(null);
        }
    }

    function handlePressRight() {
        if (currentIndex < data.length - 1) {
            let newIndex = currentIndex + 1;
            while (newIndex < data.length && viewedStories[data[newIndex].sid]) {
                newIndex += 1;
            }
            if (newIndex >= data.length) {
                newIndex = currentIndex + 1;
            }
            setCurrentIndex(newIndex);
            setViewedStories((prev) => ({ ...prev, [data[newIndex].sid]: true }));
        } else {
            setViewModal(false);
        }
    }

    function handlePressCreateButton() {
        console.log('create');
        setCreateModal(true);
    }

    return (
        <View style={styles.stories_ctnr}>
            <FlatList
                data={data}
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
                            <FastImage // Replace CachedImage with FastImage
                                key={data[currentIndex].sid}
                                source={{ uri: data[currentIndex].image }}
                                style={styles.fullScreenImage}
                                resizeMode={FastImage.resizeMode.cover}
                                placeholder={<ActivityIndicator />}
                            />
                        </View>
                        <Pressable onPress={handlePressLeft} style={styles.screen_left} />
                        <Pressable onPress={() => setViewModal(false)} style={styles.screen_center} />
                        <Pressable onPress={handlePressRight} style={styles.screen_right} />
                    </View>

                    <BlurView intensity={5} style={styles.blurview} />
                    <View style={styles.modalHeader}>
                        <StoryHeaderButtons stories={data} index={currentIndex} />
                    </View>
                </Modal>
            )}

            <Modal
                animationType='slide'
                transparent={true}
                visible={createModalVisible}
            >
                <CreateStoryScreen closeModal={() => setCreateModal(false)}/>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    stories_ctnr: {
        backgroundColor: '#fff',
        paddingBottom: 11,
        paddingTop: 2,
    },
    flatlist: {
        paddingLeft: 15,
    },
    flatlistContent: {
        flexDirection: 'row',
    },
    modalContainer: {
        flex: 1,
        // backgroundColor: 'rgba(0,0,0,0.9)',
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
        height: '100%'
    },
    screen_left: {
        position: 'absolute',
        top: 100,
        left: 0,
        height: '100%',
        width: '25%',
    },
    screen_center: {
        position: 'absolute',
        top: 100,
        left: '25%',
        width: '50%',
        height: '100%',
    },
    screen_right: {
        position: 'absolute',
        top: 100,
        right: 0,
        height: '100%',
        width: '25%',
    },
});
