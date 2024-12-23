import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, TextInput, Platform, Image, KeyboardAvoidingView, Animated, Keyboard, Pressable, Dimensions } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from '@expo/vector-icons';
import CommentsModal from "./CommentsModal";
import incrementDocValue from "../../../../backend/helper/firebase/incrementDocValue";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import sendNotification from "../../../../backend/sendNotification";
import { getCommentsBottomSheetStyles } from "../../../helper/getCommentsBottomSheetStyles";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
const dynamicStyles = getCommentsBottomSheetStyles(SCREEN_WIDTH, SCREEN_HEIGHT);

const CommentsBottomSheet = ({ isVisible, postData, commentsBottomSheetExpandFlag, toViewProfile }) => {
    const [isInputFocused, setIsInputFocused] = useState(false);
    const bottomSheetRef = useRef(null);
    const footerTranslateY = useRef(new Animated.Value(0)).current;
    const snapPoints = useMemo(() => ["35.5%", "92%"], []);
    const [isSheetExpanded, setIsSheetExpanded] = useState(false);
    const [inputText, setInputText] = useState('');
    const [replyingToIndex, setReplyingToIndex] = useState(null);
    const textInputRef = useRef(null);

    // Handle send comment
    const handleSend = () => {
        if (!inputText) return;
        const newComment = {
            handle: global.userData.handle,
            uid: global.userData.uid,
            pfp: global.userData.image,
            content: inputText,
            timestamp: Date.now(),
            likeCount: 0,
            likedUsers: [],
            replies: [],
            isCaption: false
        };

        if (replyingToIndex == null) {
            postData.comments.push(newComment);
        } else {
            postData.comments[replyingToIndex].replies.push(newComment);

            const replyNotif = {
                uid: global.userData.uid,
                pfp: global.userData.image,
                handle: global.userData.handle,
                name: global.userData.name,
                type: 'replied-comment',
                content: inputText,
                timestamp: Date.now()
            };

            sendNotification(postData.comments[replyingToIndex].uid, replyNotif);
        }

        updateDoc('posts', postData.pid, {
            comments: postData.comments
        });
        incrementDocValue('posts', postData.pid, 'commentCount');

        const notif = {
            uid: global.userData.uid,
            pfp: global.userData.image,
            handle: global.userData.handle,
            name: global.userData.name,
            type: 'comment',
            content: inputText,
            timestamp: Date.now()
        };

        sendNotification(postData.uid, notif);

        setInputText('');
    };

    // Handle input focus
    const handleInputFocus = () => {
        setIsInputFocused(true);
        bottomSheetRef.current.expand();
        Animated.timing(footerTranslateY, {
            toValue: -315,
            duration: 225,
            useNativeDriver: true
        }).start();
    };

    // Handle input blur
    const handleInputBlur = () => {
        setIsInputFocused(false);
        setReplyingToIndex(null);
        Animated.timing(footerTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true
        }).start();
    };

    // Handle visibility of the bottom sheet
    useEffect(() => {
        if (isVisible) {
            bottomSheetRef.current.snapToIndex(0);
        } else {
            bottomSheetRef.current.close();
        }
    }, [isVisible]);

    // Expand the bottom sheet when flagged
    useEffect(() => {
        bottomSheetRef.current.expand();
    }, [commentsBottomSheetExpandFlag]);

    useEffect(() => {
        if (replyingToIndex != null) {
            textInputRef.current.focus(); // Focus the TextInput
        }
    }, [replyingToIndex]);

    // Handle header touch
    function handleTouchHeader() {
        if (isInputFocused) {
            handleInputBlur();
            Keyboard.dismiss();
        }
    }

    // Handle sheet index change
    function handleSheetIndexChange(index) {
        setIsSheetExpanded(index === 1);
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            pointerEvents='box-none'
        >
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                onChange={handleSheetIndexChange}
                handleStyle={{ display: 'none' }}
                detached
                backgroundStyle={{ backgroundColor: '#fff' }}
            >
                {postData && (
                    <CommentsModal
                        postData={postData}
                        handleTouchHeader={handleTouchHeader}
                        isSheetExpanded={isSheetExpanded}
                        setReplyingToIndex={setReplyingToIndex}
                        toViewProfile={toViewProfile}
                    />
                )}
            </BottomSheet>
            {isVisible && (
                <Animated.View style={[styles.footer, { transform: [{ translateY: footerTranslateY }] }]}>
                    <View style={styles.inputContainer}>
                        <View style={styles.image_ctnr}>
                            <Image source={{ uri: global.userData.image }} style={styles.pfp} />
                        </View>
                        <TextInput
                            ref={textInputRef}
                            placeholder={replyingToIndex == null ? "Add comment" : `Replying to ${postData.comments[replyingToIndex].handle}`}
                            style={styles.textInput}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                            value={inputText}
                            onChangeText={setInputText}
                        />
                        <Pressable style={styles.sendButton} onPress={handleSend}>
                            <Ionicons name="send" size={dynamicStyles.sendButtonSize} color="#111" />
                        </Pressable>
                    </View>
                </Animated.View>
            )}
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 85,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999
    },
    footer: {
        position: 'absolute',
        top: SCREEN_HEIGHT - 180,
        height: 95 + SCREEN_WIDTH / 2,
        paddingBottom: SCREEN_WIDTH / 2,
        backgroundColor: '#fff',
        width: '100%',
        borderRadius: 40
    },
    inputContainer: {
        flex: 1,
        marginHorizontal: 18,
        marginTop: 14,
        marginBottom: 26,
        backgroundColor: '#f3f3f3',
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: dynamicStyles.inputHeight,
    },
    image_ctnr: {
        width: dynamicStyles.pfpSize,
        aspectRatio: 1
    },
    pfp: {
        flex: 1,
        borderRadius: 100
    },
    textInput: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: dynamicStyles.inputPaddingVertical,
        color: '#000',
        fontFamily: 'Outfit_500Medium',
        fontSize: dynamicStyles.inputFontSize,
    },
    sendButton: {
        paddingHorizontal: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default CommentsBottomSheet;
