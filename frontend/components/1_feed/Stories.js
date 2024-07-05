import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import CachedImage from 'expo-cached-image';
import StoryHeaderButtons from "./StoryHeaderButtons";
import Story from "./Story";

export default function Stories({ data }) {
    const [selectedStory, setSelectedStory] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(null);

    function handlePress(index) {
        setSelectedStory(data[index]);
        setCurrentIndex(index);
        setModalVisible(true);
    }

    const renderItem = ({ item, index }) => (
        <Pressable onPress={() => handlePress(index)}>
            <Story data={item} handlePress={handlePress} index={index} />
        </Pressable>
    );

    function handlePressLeft() {
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setSelectedStory(data[newIndex]);
            setCurrentIndex(newIndex);
        }
    }

    function handlePressRight() {
        if (currentIndex < data.length - 1) {
            const newIndex = currentIndex + 1;
            setSelectedStory(data[newIndex]);
            setCurrentIndex(newIndex);
        }
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

            {selectedStory && (
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <StoryHeaderButtons data={selectedStory} />
                        </View>
                        <View style={styles.modalContent}>
                            <CachedImage
                                key={selectedStory.sid}
                                source={{ uri: selectedStory.image }}
                                style={styles.fullScreenImage}
                                cacheKey={selectedStory.sid}
                                placeholderContent={<ActivityIndicator />}
                            />
                        </View>
                        <Pressable onPress={handlePressLeft} style={styles.screen_left} />
                        <Pressable onPress={() => setModalVisible(false)} style={styles.screen_center} />
                        <Pressable onPress={handlePressRight} style={styles.screen_right} />
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    stories_ctnr: {
        backgroundColor: '#2D9EFF',
        paddingBottom: 8,
        paddingTop: 2
    },
    flatlist: {
        paddingLeft: 15,
    },
    flatlistContent: {
        flexDirection: 'row',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    modalHeader: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
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
