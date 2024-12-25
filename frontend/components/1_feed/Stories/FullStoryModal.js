/**
 * Full Story Modal Component
 * 
 * - Displays a full-screen story image in a modal.
 * - Allows navigation between stories (previous/next).
 * - Shows a loading indicator while the image is loading.
 * - Includes a blurred header with story-related buttons.
 * 
 * Props:
 * - isVisible (boolean): Controls modal visibility.
 * - onClose (function): Callback to close the modal.
 * - currentIndex (number): Index of the currently displayed story.
 * - storiesData (array): Array of story objects.
 * - userList (array): List of users associated with the stories.
 * - handleStoryNavigation (function): Function to navigate between stories.
 * - navigation (object): React Navigation object for navigating to other screens.
 */

import React, { useEffect, useState } from "react";
import {
    Modal,
    View,
    Pressable,
    StyleSheet,
    StatusBar
} from "react-native";
import { BlurView } from "expo-blur";
import FastImage from "react-native-fast-image";

import StoryHeaderButtons from "./StoryHeaderButtons"; // Adjust path as needed

export default function FullStoryModal({
    isVisible,
    onClose,
    currentIndex,
    storiesData,
    userList,
    handleStoryNavigation,
    navigation
}) {
    // State to manage loading indicator visibility
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Toggle the visibility of the status bar based on modal visibility.
     */
    useEffect(() => {
        StatusBar.setHidden(isVisible, "fade");
    }, [isVisible]);

    // Do not render the modal if there is no current story index
    if (currentIndex === null) return null;

    // Current story data
    const currentStory = storiesData[currentIndex];

    return (
        <Modal
            animationType="fade"
            transparent={false}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                {/* Story Image with Loading Indicator */}
                <View style={styles.modalContent}>
                    <FastImage
                        key={currentStory.sid}
                        source={{
                            uri: currentStory.image,
                            priority: FastImage.priority.normal,
                            // Optional: Add cache control if needed
                            // cache: FastImage.cacheControl.immutable,
                        }}
                        style={styles.fullScreenImage}
                        resizeMode={FastImage.resizeMode.cover}
                        onLoadStart={() => setIsLoading(true)}
                        onLoad={() => setIsLoading(false)}
                    />
                </View>

                {/* Gesture Areas for Story Navigation */}
                <Pressable
                    onPress={() => handleStoryNavigation(-1)}
                    style={styles.screenLeft}
                />
                <Pressable
                    onPress={onClose}
                    style={styles.screenCenter}
                />
                <Pressable
                    onPress={() => handleStoryNavigation(1)}
                    style={styles.screenRight}
                />
            </View>

            {/* Blurred Header Area */}
            <BlurView intensity={5} style={styles.blurview} />

            {/* Story Header Buttons */}
            <StoryHeaderButtons
                stories={storiesData}
                userList={userList}
                index={currentIndex}
                toViewProfile={pi => {
                    onClose();
                    navigation.navigate("ViewProfile", { user: storiesData[pi] });
                }}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1
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
    blurview: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: 85,
        zIndex: 1,
    },
});
