import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, StyleSheet, TextInput, Platform, Image, KeyboardAvoidingView, Animated, Keyboard, Pressable, Dimensions } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import theme from "../../../theme/mfpDark";
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
    const footerTranslateY = useRef(new Animated.Value(0)).current; // moves when input focuses
    const footerIntroY = useRef(new Animated.Value(10)).current;    // small entrance slide
    const footerOpacity = useRef(new Animated.Value(0)).current;    // fade with sheet
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
                pid: postData.pid,
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
            pid: postData.pid,
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

    // Handle visibility: open sheet + sync footer entrance
    useEffect(() => {
        const hasPost = !!postData;
        if (isVisible && hasPost) {
            const tryOpen = () => bottomSheetRef.current?.snapToIndex(0);
            requestAnimationFrame(() => { tryOpen(); });
            // footer entrance animation
            footerOpacity.setValue(0);
            footerIntroY.setValue(10);
            Animated.parallel([
                Animated.timing(footerOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
                Animated.timing(footerIntroY, { toValue: 0, duration: 190, useNativeDriver: true }),
            ]).start();
        } else {
            bottomSheetRef.current?.close();
            Animated.timing(footerOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start();
        }
    }, [isVisible, postData]);

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
                index={isVisible && postData ? 0 : -1}
                snapPoints={snapPoints}
                onChange={handleSheetIndexChange}
                handleStyle={{ display: 'none' }}
                detached
                backgroundStyle={{ backgroundColor: theme.surface }}
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
            {isVisible && postData && (
                <Animated.View style={[
                    styles.footer,
                    { opacity: footerOpacity, transform: [{ translateY: Animated.add(footerTranslateY, footerIntroY) }] }
                ]}>
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
                            <Ionicons name="send" size={dynamicStyles.sendButtonSize} color="#E5E7EB" />
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
        backgroundColor: theme.surface,
        width: '100%',
        borderRadius: 40
    },
    inputContainer: {
        flex: 1,
        marginHorizontal: 18,
        marginTop: 14,
        marginBottom: 26,
        backgroundColor: theme.field,
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
        color: '#E5E7EB',
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
