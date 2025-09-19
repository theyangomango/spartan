import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, StyleSheet, TextInput, Platform, Image, KeyboardAvoidingView, Animated, Keyboard, Pressable, Dimensions } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
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

const CommentsBottomSheet = ({ isVisible, postData, commentsBottomSheetExpandFlag, toViewProfile, collapseSignal, reopenSignal, interactiveProgress, interactiveProgressSV, interactiveScale = 0.85, openPositionPx }) => {
    // Smoother sheet expansion
    const SHEET_OPEN_MS = 280;
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
        try { bottomSheetRef.current?.snapToIndex?.(1, { duration: SHEET_OPEN_MS }); } catch { try { bottomSheetRef.current?.expand?.(); } catch {} }
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
            // Open via index when no explicit pixel position is provided (reduces jitter)
            const open = () => {
                try {
                    if (typeof openPositionPx === 'number') {
                        const h = containerHRef.current || (SCREEN_HEIGHT - scaleSize(85));
                        const desired = Math.max(0, Math.min(h, openPositionPx));
                        bottomSheetRef.current?.snapToPosition?.(desired, { duration: SHEET_OPEN_MS });
                    } else {
                        bottomSheetRef.current?.snapToIndex?.(0, { duration: SHEET_OPEN_MS });
                    }
                } catch { }
            };
            requestAnimationFrame(open);
            // footer entrance animation
            footerOpacity.setValue(0);
            footerIntroY.setValue(10);
            Animated.parallel([
                Animated.timing(footerOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.timing(footerIntroY, { toValue: 0, duration: 260, useNativeDriver: true }),
            ]).start();
        } else {
            bottomSheetRef.current?.close();
            Animated.timing(footerOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start();
        }
    }, [isVisible, postPid, containerReady, openPositionPx]);

    // Emit a small open signal after the sheet has animated in
    useEffect(() => {
        if (!isVisible || !postPid || !containerReady) return;
        const id = setTimeout(() => { try { setOpenSignal(Date.now()); } catch {} }, 90);
        return () => clearTimeout(id);
    }, [isVisible, postPid, containerReady]);

    // Imperative collapse during interactive unfocus (ignore interactive updates during close)
    const isClosingRef = useRef(false);
    useEffect(() => {
        if (!isVisible || !postPid) return;
        if (!collapseSignal) return;
        isClosingRef.current = true;
        try {
            // Fast, smooth slide-down
            if (bottomSheetRef.current?.snapToPosition) {
                bottomSheetRef.current.snapToPosition(0, { duration: 120 });
            } else {
                bottomSheetRef.current?.close?.();
            }
        } catch { }
        try { footerOpacity.stopAnimation && footerOpacity.stopAnimation(); } catch {}
        Animated.timing(footerOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start();
    }, [collapseSignal, isVisible, postPid]);

    // Imperative reopen if interactive drag cancels
    useEffect(() => {
        if (!isVisible || !postPid) return;
        if (!reopenSignal) return;
        try { bottomSheetRef.current?.snapToIndex?.(0); } catch { }
        isClosingRef.current = false;
    }, [reopenSignal, isVisible, postPid]);

    useEffect(() => {
        if (!isVisible) {
            isClosingRef.current = false;
        }
    }, [isVisible]);

    // Interactive unfocus: only fade/slide the footer; avoid snapping the sheet each frame (prevents jitter)
    const updateFromProgress = useCallback((progress) => {
        if (!isVisible || !postPid || isClosingRef.current) return;
        const slow = Math.max(0, interactiveScale || 0);
        const p = Math.max(0, (progress || 0));
        const pSlow = Math.min(1, p * slow);
        try { footerOpacity.setValue(1 - pSlow); } catch {}
        try { footerDragY.setValue(pSlow * 120); } catch {}
    }, [isVisible, postPid, interactiveScale]);

    // Worklet-driven updates via SharedValue (preferred)
    useAnimatedReaction(
        () => {
            if (!interactiveProgressSV || !isVisible || !postPid) return -1;
            return interactiveProgressSV.value;
        },
        (progress) => {
            if (progress == null || progress < 0) return;
            runOnJS(updateFromProgress)(progress);
        }
    );

    // Fallback numeric prop path
    useEffect(() => {
        if (!isVisible || !postPid) return;
        if (interactiveProgressSV) return; // SV path handles updates
        if (interactiveProgress == null) return;
        updateFromProgress(interactiveProgress);
    }, [interactiveProgress, isVisible, postPid, interactiveProgressSV, updateFromProgress]);

    // Expand the bottom sheet when flagged
    useEffect(() => {
        try { bottomSheetRef.current?.snapToIndex?.(1, { duration: SHEET_OPEN_MS }); } catch { try { bottomSheetRef.current?.expand?.(); } catch {} }
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

    const enforceVisibleIndex = useCallback(() => {
        requestAnimationFrame(() => {
            try { bottomSheetRef.current?.snapToIndex?.(0); } catch {}
        });
    }, []);

    // Handle sheet index change (defensively guard against stray event objects)
    const handleSheetIndexChange = useCallback((idx) => {
        const index = typeof idx === 'number' ? idx : -1;
        if (isVisible && postPid && !isClosingRef.current && index < 0) {
            enforceVisibleIndex();
            return;
        }
        try {
            // Decouple from the dispatch tick of any press/gesture by scheduling to next frame
            requestAnimationFrame(() => setIsSheetExpanded(index === 1));
        } catch {
            setIsSheetExpanded(index === 1);
        }
    }, [isVisible, postPid, enforceVisibleIndex]);

    // Assume baseline container height and mark ready on mount to avoid relying on layout events
    useEffect(() => {
        try { requestAnimationFrame(() => setContainerReady(true)); } catch { setContainerReady(true); }
    }, []);

    // Disable content panning while user is performing the unfocus gesture to avoid gesture competition
    const [contentPanEnabled, setContentPanEnabled] = useState(true);
    const panEnabledRef = useRef(true);
    useAnimatedReaction(
        () => {
            if (!interactiveProgressSV || !isVisible || !postPid) return 0;
            return interactiveProgressSV.value;
        },
        (p) => {
            if (p == null) return;
            const interacting = p > 0.02 && p < 1;
            if (interacting !== panEnabledRef.current) {
                panEnabledRef.current = interacting;
                runOnJS(setContentPanEnabled)(!interacting);
            }
        }
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            pointerEvents='box-none'
        >
            <BottomSheet
                ref={bottomSheetRef}
                // Keep index controlled imperatively to avoid snaps fighting rendering
                index={-1}
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
                enableContentPanningGesture={contentPanEnabled}
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
                pointerEvents={isVisible && !!postPid ? 'box-none' : 'none'}
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
