import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import CachedImage from 'expo-cached-image';
import StoryHeaderButtons from "./StoryHeaderButtons";
import Story from "./Story";
import { BlurView } from 'expo-blur';

export default function Stories({ data }) {
    console.log(data);

    const [modalVisible, setModalVisible] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(null);

    function handlePress(index) {
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
            // setSelectedStory(data[newIndex]);
            setCurrentIndex(newIndex);
        } else {
            setModalVisible(false);
            setCurrentIndex(null);
        }
    }

    function handlePressRight() {
        if (currentIndex < data.length - 1) {
            const newIndex = currentIndex + 1;
            // setSelectedStory(data[newIndex]);
            setCurrentIndex(newIndex);
        } else {
            setModalVisible(false)
        }
    }

    return (
        <View style={styles.stories_ctnr}>
            <View style={styles.border}></View>
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
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <CachedImage
                                key={data[currentIndex].sid}
                                source={{ uri: data[currentIndex].image }}
                                style={styles.fullScreenImage}
                                cacheKey={data[currentIndex].sid}
                                placeholderContent={<ActivityIndicator />}
                            />
                        </View>
                        <Pressable onPress={handlePressLeft} style={styles.screen_left} />
                        <Pressable onPress={() => setModalVisible(false)} style={styles.screen_center} />
                        <Pressable onPress={handlePressRight} style={styles.screen_right} />
                    </View>

                    <BlurView intensity={5} style={styles.blurview} />
                    <View style={styles.modalHeader}>
                        <StoryHeaderButtons stories={data} index={currentIndex}/>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    stories_ctnr: {
        backgroundColor: '#fff',
        // backgroundColor: '#2D9EFF',
        // backgroundColor: '#FAFCFF',
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
        backgroundColor: 'rgba(0,0,0,0.9)',
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
