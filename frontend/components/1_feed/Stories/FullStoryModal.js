import React from "react";
import {
    Modal,
    View,
    Pressable,
    ActivityIndicator,
    StyleSheet
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
    // If no current story index, do not render anything
    if (currentIndex === null) return null;

    return (
        <Modal
            animationType="fade"
            transparent={false}
            visible={isVisible}
            onRequestClose={onClose}
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
                {/* Left side - go to previous story */}
                <Pressable
                    onPress={() => handleStoryNavigation(-1)}
                    style={styles.screenLeft}
                />
                {/* Center - close the modal */}
                <Pressable onPress={onClose} style={styles.screenCenter} />
                {/* Right side - go to next story */}
                <Pressable
                    onPress={() => handleStoryNavigation(1)}
                    style={styles.screenRight}
                />
            </View>

            {/* BlurView for the top header area */}
            <BlurView intensity={5} style={styles.blurview} />

            {/* Header: pfp / handle / dash/dot indicators / like button */}
            <StoryHeaderButtons
                stories={storiesData}
                userList={userList}
                index={currentIndex}
                toViewProfile={(pi) => {
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
