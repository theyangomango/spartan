import React, { useEffect, useState } from "react";
import {
    Modal,
    View,
    Pressable,
    StyleSheet,
    StatusBar,
    TextInput,
    Keyboard,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { BlurView } from "expo-blur";
import FastImage from "react-native-fast-image";
import { Send2 } from 'iconsax-react-native'

import sendMessage from '../../../../backend/messages/sendMessage'
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
    const thisUser = global.userData;
    const [replyText, setReplyText] = useState("");

    // Hide/show the status bar based on modal visibility
    useEffect(() => {
        StatusBar.setHidden(isVisible, "fade");
    }, [isVisible]);

    if (currentIndex === null) return null;
    const currentStory = storiesData[currentIndex];

    // Send handler for typed replies
    const handleSendReply = () => {
        // Return early if there is no reply text
        if (!replyText.trim()) return;

        console.log("Reply sent:", replyText);
        console.log(thisUser.uid, currentStory.uid);

        // Locate the message whose otherUsers array contains exactly one ID 
        // and that ID matches currentStory.uid
        console.log(thisUser.messages[0]);
        const targetMessage = thisUser.messages.find(
            (msg) =>
                Array.isArray(msg.otherUsers) &&
                msg.otherUsers.length === 1 &&
                msg.otherUsers[0].uid === currentStory.uid
        );

        if (targetMessage) {
            const cid = targetMessage.mid;
            sendMessage(thisUser.uid, thisUser.handle, cid, 'Replied to your story: ' + replyText);
        }

        // Clear the reply text field
        setReplyText("");
    };


    return (
        <Modal
            animationType="fade"
            transparent={false}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalContainer}>
                    {/* Story Image */}
                    <View style={styles.modalContent}>
                        <FastImage
                            key={currentStory.sid}
                            source={{
                                uri: currentStory.image,
                                priority: FastImage.priority.normal,
                            }}
                            style={styles.fullScreenImage}
                            resizeMode={FastImage.resizeMode.cover}
                        />
                    </View>

                    {/* Gesture Areas for Navigation */}
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

                    {/* Blurred Header */}
                    <BlurView intensity={10} style={styles.blurview} />

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

                    {/* Reply Input + Send Icon */}
                    { storiesData[currentIndex].uid !== thisUser.uid &&
                        <KeyboardAvoidingView
                            behavior={Platform.OS === "ios" ? "padding" : "height"}
                            style={styles.replyContainer}
                        >
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.replyInput}
                                    placeholder="Send a reply..."
                                    placeholderTextColor="gray"
                                    value={replyText}
                                    onChangeText={setReplyText}
                                    returnKeyType="send"
                                    onSubmitEditing={handleSendReply}
                                />
                                <Pressable onPress={handleSendReply} style={styles.sendIcon}>
                                    <Send2
                                        size={27}
                                        // Light up (white) if there's text, else gray
                                        color={replyText.trim() ? "white" : "gray"}
                                    />
                                </Pressable>
                            </View>
                        </KeyboardAvoidingView>
                    }
                </View>
            </TouchableWithoutFeedback>
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
        backgroundColor: "rgba(0, 0, 0, 0.05)"
    },
    replyContainer: {
        position: "absolute",
        left: 10,
        right: 10,
        bottom: 40,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        borderRadius: 25,
        paddingHorizontal: 15,
        justifyContent: "center",
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center"
    },
    replyInput: {
        flex: 1,
        color: "white",
        fontFamily: "Mulish_700Bold",
        fontSize: 16,
        paddingVertical: 20,
        paddingHorizontal: 12
    },
    sendIcon: {
        paddingLeft: 10,
        paddingRight: 12,
    },
});
