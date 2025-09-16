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

import scaleSize from "../../../helper/scaleSize";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
const dynamicStyles = getCommentsBottomSheetStyles(SCREEN_WIDTH, SCREEN_HEIGHT);

const CommentsBottomSheet = ({ isVisible, postData, commentsBottomSheetExpandFlag, toViewProfile, collapseSignal, reopenSignal, interactiveProgress, interactiveScale = 0.85 }) => {
    const [isInputFocused, setIsInputFocused] = useState(false);
    const bottomSheetRef = useRef(null);
    const footerTranslateY = useRef(new Animated.Value(0)).current; // moves when input focuses
    const footerIntroY = useRef(new Animated.Value(10)).current;    // small entrance slide
    const footerDragY = useRef(new Animated.Value(0)).current;      // follows interactive unfocus to slide footer down
    const footerOpacity = useRef(new Animated.Value(0)).current;    // fade with sheet
    const snapPoints = useMemo(() => ["34.5%", "92%"], []);
    const containerHRef = useRef(SCREEN_HEIGHT - scaleSize(85));
    const [containerReady, setContainerReady] = useState(false);
    const [isSheetExpanded, setIsSheetExpanded] = useState(false);
    const [openSignal, setOpenSignal] = useState(0);
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

    // Handle visibility: open sheet from bottom + sync footer entrance
    // Depend on stable pid instead of the whole object to avoid re-running on like updates
    const postPid = postData?.pid;
    useEffect(() => {
        const hasPost = !!postPid;
        if (isVisible && hasPost && containerReady) {
            // Force baseline at 0px from bottom, then animate to exact openPx via snapToPosition.
            const h = containerHRef.current || (SCREEN_HEIGHT - scaleSize(85));
            const openPx = 0.345 * h; // matches first snap point
            try { bottomSheetRef.current?.snapToPosition?.(0, { duration: 0 }); } catch {}
            const open = () => { try { bottomSheetRef.current?.snapToPosition?.(openPx); } catch {} };
            // Small delay ensures layout is measured and the 0px baseline is honored
            const id = setTimeout(() => requestAnimationFrame(open), 30);
            // footer entrance animation
            footerOpacity.setValue(0);
            footerIntroY.setValue(10);
            Animated.parallel([
                Animated.timing(footerOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
                Animated.timing(footerIntroY, { toValue: 0, duration: 190, useNativeDriver: true }),
            ]).start();
            return () => clearTimeout(id);
        } else {
            bottomSheetRef.current?.close();
            Animated.timing(footerOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start();
        }
    }, [isVisible, postPid, containerReady]);

    // Emit a small open signal after the sheet has animated in
    useEffect(() => {
        if (!isVisible || !postPid || !containerReady) return;
        const id = setTimeout(() => { try { setOpenSignal(Date.now()); } catch {} }, 90);
        return () => clearTimeout(id);
    }, [isVisible, postPid, containerReady]);

    // Imperative collapse during interactive unfocus
    useEffect(() => {
        if (!isVisible || !postPid) return;
        if (!collapseSignal) return;
        try { bottomSheetRef.current?.close?.(); } catch { }
    }, [collapseSignal, isVisible, postPid]);

    // Imperative reopen if interactive drag cancels
    useEffect(() => {
        if (!isVisible || !postPid) return;
        if (!reopenSignal) return;
        try { bottomSheetRef.current?.snapToIndex?.(0); } catch { }
    }, [reopenSignal, isVisible, postPid]);

    // Optional interactive collapse (disabled if interactiveProgress is undefined)
    useEffect(() => {
        if (!isVisible || !postPid) return;
        if (interactiveProgress == null) return;
        const progress = Math.max(0, Math.min(1, interactiveProgress || 0));
        // Target position in px from bottom: 34.5% at rest -> 0 when fully closed
        const h = containerHRef.current || (SCREEN_HEIGHT - scaleSize(85));
        const openPx = 0.345 * h; // matches snapPoints[0]
        const slow = Math.max(0, Math.min(1, interactiveScale));
        const pSlow = Math.min(1, progress * slow); // slower than finger based on provided scale
        const pos = Math.max(0, openPx * (1 - pSlow));
        try { bottomSheetRef.current?.snapToPosition?.(pos, { duration: 0 }); } catch { }
        // Fade and slide the input footer down in sync with slowed progress
        try { footerOpacity.setValue(1 - pSlow); } catch {}
        try { footerDragY.setValue(pSlow * 120); } catch {}
    }, [interactiveProgress, isVisible, postPid, interactiveScale]);

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

    // Handle sheet index change (defensively guard against stray event objects)
    const handleSheetIndexChange = useCallback((idx) => {
        const index = typeof idx === 'number' ? idx : -1;
        setIsSheetExpanded(index === 1);
    }, []);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            pointerEvents='box-none'
            onLayout={(e) => {
                // Persist to avoid any SyntheticEvent pooling warnings and copy what we need immediately
                try { e?.persist?.(); } catch {}
                try {
                    const { height = (SCREEN_HEIGHT - scaleSize(85)) } = e?.nativeEvent?.layout || {};
                    const h = height || (SCREEN_HEIGHT - scaleSize(85));
                    if (Math.abs(h - (containerHRef.current || 0)) > 1) {
                        containerHRef.current = h;
                    }
                    setContainerReady(true);
                } catch { setContainerReady(true); }
            }}
        >
            <BottomSheet
                ref={bottomSheetRef}
                index={isVisible && !!postPid ? 0 : -1}
                snapPoints={snapPoints}
                onChange={handleSheetIndexChange}
                handleComponent={() => null}
                handleHeight={0}
                handleIndicatorStyle={{ display: 'none' }}
                contentContainerStyle={{ paddingTop: 0, marginTop: 0 }}
                detached
                // Anchor the detached sheet to the bottom of this container so it animates from bottom
                style={{ position: 'absolute', left: 0, right: 0 }}
                backgroundStyle={{ backgroundColor: theme.surface }}
                topInset={0}
                enableContentPanningGesture
                enablePanDownToClose={false}
            >
                {postData && (
                    <CommentsModal
                        postData={postData}
                        handleTouchHeader={handleTouchHeader}
                        isSheetExpanded={isSheetExpanded}
                        setReplyingToIndex={setReplyingToIndex}
                        toViewProfile={toViewProfile}
                        openSignal={openSignal}
                    />
                )}
            </BottomSheet>
            {/* Keep footer mounted to preserve TextInput state across post updates/likes */}
            <Animated.View
                pointerEvents={isVisible && !!postPid ? 'auto' : 'none'}
                style={[
                    styles.footer,
                    { opacity: footerOpacity, transform: [{ translateY: Animated.add(Animated.add(footerTranslateY, footerIntroY), footerDragY) }] }
                ]}
            >
                <View style={styles.inputContainer}>
                    <View style={styles.image_ctnr}>
                        <Image source={{ uri: global.userData.image }} style={styles.pfp} />
                    </View>
                    <TextInput
                        ref={textInputRef}
                        placeholder={
                            replyingToIndex == null
                                ? "Add comment"
                                : (postData?.comments?.[replyingToIndex]?.handle
                                    ? `Replying to ${postData.comments[replyingToIndex].handle}`
                                    : "Add comment")
                        }
                        placeholderTextColor="#C9D2E3"
                        style={styles.textInput}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        value={inputText}
                        onChangeText={setInputText}
                        editable={isVisible && !!postPid}
                    />
                    <Pressable style={styles.sendButton} onPress={handleSend} disabled={!isVisible || !postPid}>
                        <Ionicons name="send" size={dynamicStyles.sendButtonSize} color="#E5E7EB" />
                    </Pressable>
                </View>
            </Animated.View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: scaleSize(85),
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
    },
    footer: {
        position: 'absolute',
        top: scaleSize(SCREEN_HEIGHT - 180),
        height: scaleSize(95 + SCREEN_WIDTH / 2),
        paddingBottom: scaleSize(SCREEN_WIDTH / 2),
        backgroundColor: theme.surface,
        width: '100%',
        borderRadius: scaleSize(40)
    },
    inputContainer: {
        flex: 1,
        marginHorizontal: scaleSize(18),
        marginTop: scaleSize(14),
        marginBottom: scaleSize(26),
        backgroundColor: theme.field,
        borderRadius: scaleSize(30),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(12),
        height: dynamicStyles.inputHeight,
    },
    image_ctnr: {
        width: dynamicStyles.pfpSize,
        aspectRatio: 1
    },
    pfp: {
        flex: 1,
        borderRadius: scaleSize(100)
    },
    textInput: {
        flex: 1,
        borderRadius: scaleSize(20),
        paddingHorizontal: scaleSize(15),
        paddingVertical: dynamicStyles.inputPaddingVertical,
        color: '#E5E7EB',
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(dynamicStyles.inputFontSize),
    },
    sendButton: {
        paddingHorizontal: scaleSize(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default CommentsBottomSheet;
