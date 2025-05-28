import React, { useEffect, useRef, useState } from "react";
import {
    Modal,
    View,
    Pressable,
    StyleSheet,
    StatusBar,
    TextInput,
    Keyboard,
    Platform,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
} from "react-native";
import { BlurView } from "expo-blur";
import FastImage from "react-native-fast-image";
import { Send2 } from "iconsax-react-native";

import sendMessage from "../../../../backend/messages/sendMessage";
import StoryHeaderButtons from "./StoryHeaderButtons";
import Svg, { Path } from "react-native-svg";

export default function FullStoryModal({
    isVisible,
    onClose,
    currentIndex,
    storiesData,
    userList,
    handleStoryNavigation,   // <- comes from Stories.jsx
    navigation,
}) {
    const thisUser = global.userData;
    const [replyText, setReplyText] = useState("");

    /** image‑loading state */
    const [isReady, setIsReady] = useState(false);
    const pendingDirection = useRef(null); // -1 or +1 while waiting

    /** hide / show status‑bar */
    useEffect(() => {
        StatusBar.setHidden(isVisible, "fade");
    }, [isVisible]);

    /** reset loading flag every time index changes */
    useEffect(() => {
        if (isVisible) setIsReady(false);
    }, [currentIndex, isVisible]);

    /** pre‑load neighbours once the current image is ready */
    useEffect(() => {
        if (!isReady) return;

        const toPreload = [];
        const prev = storiesData[currentIndex - 1];
        const next = storiesData[currentIndex + 1];

        if (prev) toPreload.push({ uri: prev.image });
        if (next) toPreload.push({ uri: next.image });

        if (toPreload.length) FastImage.preload(toPreload);
    }, [isReady, currentIndex, storiesData]);

    /** guard */
    if (currentIndex === null) return null;
    const currentStory = storiesData[currentIndex];

    /* ------------ reply handler ------------ */
    const handleSendReply = () => {
        const trimmed = replyText.trim();
        if (!trimmed) return;

        const target = thisUser.messages.find(
            (m) =>
                Array.isArray(m.otherUsers) &&
                m.otherUsers.length === 1 &&
                m.otherUsers[0].uid === currentStory.uid
        );
        if (target) {
            sendMessage(
                thisUser.uid,
                thisUser.handle,
                target.mid,
                `Replied to your story: ${trimmed}`
            );
        }

        setReplyText("");
        Keyboard.dismiss();
    };

    /* ------------ navigation with waiting logic ------------ */
    const tryNavigate = (direction) => {
        console.log('asefaesf');
        if (isReady) {
            handleStoryNavigation(direction);
        } else {
            pendingDirection.current = direction;  // remember the request
        }
    };

    /** when current image finishes loading */
    const handleImageLoaded = () => {
        setIsReady(true);

        // if user already tapped, execute queued navigation now
        if (pendingDirection.current !== null) {
            const dir = pendingDirection.current;
            pendingDirection.current = null;
            // allow React state to settle, then navigate
            requestAnimationFrame(() => handleStoryNavigation(dir));
        }
    };

    /* ======================= render ======================= */
    return (
        <Modal
            animationType="fade"
            transparent={false}
            visible={isVisible}
            onRequestClose={onClose}
        >

            {/* story image */}
            <View style={styles.imageWrapper}>
                <FastImage
                    key={currentStory.sid}           // force remount on story change
                    source={{ uri: currentStory.image, priority: FastImage.priority.high }}
                    style={styles.fullScreenImage}
                    resizeMode={FastImage.resizeMode.cover}
                    onLoadEnd={handleImageLoaded}   // ← sets isReady = true
                />

                {!isReady && (
                    <ActivityIndicator
                        size="large"
                        color="#fff"
                        style={StyleSheet.absoluteFill}
                    />
                )}
            </View>

            {/* navigation zones (disabled while loading) */}
            <Pressable
                onPress={() => tryNavigate(-1)}
                style={styles.screenLeft}
                disabled={!isReady}
            />
            <Pressable
                onPress={onClose}
                style={styles.screenCenter}
                disabled={!isReady}
            />
            <Pressable
                onPress={() => tryNavigate(1)}
                style={styles.screenRight}
                disabled={!isReady}
            />

            {/* blurred header */}
            <BlurView intensity={10} style={styles.blurview} pointerEvents="box-none" />

            {/* header buttons */}
            <StoryHeaderButtons
                stories={storiesData}
                userList={userList}
                index={currentIndex}
                toViewProfile={(pi) => {
                    onClose();
                    navigation.navigate("ViewProfile", { user: storiesData[pi] });
                }}
            />

            {/* reply bar */}
            {storiesData[currentIndex].uid !== thisUser.uid && (
                <>
                    <KeyboardAvoidingView
                        style={styles.fullScreenContainer}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        pointerEvents="box-none">
                        <View style={styles.replyContainer}>
                            <TextInput
                                style={styles.replyInput}
                                placeholder="Send a reply..."
                                placeholderTextColor="#999"
                                value={replyText}
                                onChangeText={setReplyText}
                                returnKeyType="send"
                                onSubmitEditing={handleSendReply}
                            />
                            <Pressable onPress={handleSendReply} style={styles.sendIcon}>
                                {/* <Send2 size={27} color={replyText.trim() ? "white" : "gray"} /> */}
                                <Svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 24 24" fill="none">
                                    <Path d="m7.4 6.32 8.49-2.83c3.81-1.27 5.88.81 4.62 4.62l-2.83 8.49c-1.9 5.71-5.02 5.71-6.92 0l-.84-2.52-2.52-.84c-5.71-1.9-5.71-5.01 0-6.92ZM10.11 13.65l3.58-3.59" stroke={replyText.trim() ? "white" : "gray"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"></Path>
                                </Svg>
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                    <View style={styles.bottomBuffer}></View>
                </>
            )}
        </Modal>
    );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
    modalContainer: { flex: 1 },

    // modalContent: { flex: 1, justifyContent: "center", alignItems: "center" },
    fullScreenImage: { width: "100%", height: "100%" },

    screenLeft: { position: "absolute", top: 100, left: 0, width: "25%", height: "100%", zIndex: 1 },
    screenCenter: { position: "absolute", top: 100, left: "25%", width: "50%", height: "100%", zIndex: 1 },
    screenRight: { position: "absolute", top: 100, right: 0, width: "25%", height: "100%", zIndex: 1 },

    imageWrapper: StyleSheet.absoluteFillObject,   // full-screen, no layout impact
    fullScreenImage: { width: "100%", height: "100%" },

    container: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },

    blurview: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: 107,
        zIndex: 1,
        backgroundColor: "rgba(0,0,0,0.11)",
    },

    fullScreenContainer: {
        flex: 1,
        zIndex: 2,
        justifyContent: 'flex-end'
    },

    replyContainer: {
        flexDirection: "row",
        justifyContent: 'space-between',
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.45)",
        borderRadius: 25,
        paddingLeft: 15,
        paddingRight: 21,
        marginBottom: 8,
        marginHorizontal: 12,   // was left/right: 15 when absolute
    },

    replyInput: {
        flex: 1,
        color: "#eee",
        fontFamily: "Mulish_700Bold",
        fontSize: 16,
        paddingVertical: 18,
        paddingHorizontal: 12,
    },

    bottomBuffer: {
        height: 32,
    },

    sendIcon: { paddingLeft: 10, paddingVertical: 10 },
});
