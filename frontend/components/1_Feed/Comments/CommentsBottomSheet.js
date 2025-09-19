import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, StyleSheet, TextInput, Platform, Image, KeyboardAvoidingView, Keyboard, Pressable, Dimensions } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import Reanimated, { useAnimatedReaction, runOnJS, useAnimatedStyle, useSharedValue, withTiming, cancelAnimation } from 'react-native-reanimated';
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
const CLOSE_COMPLETE_PROGRESS = 0.92;

const CommentsBottomSheet = ({ isVisible, postData, commentsBottomSheetExpandFlag, toViewProfile, collapseSignal, reopenSignal, interactiveProgress, interactiveProgressSV, interactiveScale = 0.85, openPositionPx, unfocusGestureActive = false }) => {
    // Smoother sheet expansion
    const SHEET_OPEN_MS = 280;
    const [isInputFocused, setIsInputFocused] = useState(false);
    const bottomSheetRef = useRef(null);
    const footerTranslateY = useSharedValue(0); // moves when input focuses
    const footerIntroY = useSharedValue(10);    // small entrance slide
    const footerDragY = useSharedValue(0);      // follows interactive unfocus to slide footer down
    const footerOpacity = useSharedValue(0);    // fade with sheet
    const sheetTranslateY = useSharedValue(0);
    const sheetOpenHeight = useSharedValue(0);
    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: sheetTranslateY.value }],
    }));
    const footerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: footerOpacity.value,
        transform: [{ translateY: footerTranslateY.value + footerIntroY.value + footerDragY.value }],
    }));
    const pendingCloseRef = useRef(false);
    const snapPoints = useMemo(() => ["34.5%", "92%"], []);
    const containerHRef = useRef(SCREEN_HEIGHT - scaleSize(85));
    const [containerReady, setContainerReady] = useState(false);
    const [isSheetExpanded, setIsSheetExpanded] = useState(false);
    const [openSignal, setOpenSignal] = useState(0);
    const [inputText, setInputText] = useState('');
    const [replyingToIndex, setReplyingToIndex] = useState(null);
    const textInputRef = useRef(null);

    const getSnapPointPx = useCallback((point) => {
        if (point == null) return 0;
        if (typeof point === 'number' && Number.isFinite(point)) {
            return Math.max(0, point);
        }
        if (typeof point === 'string') {
            const trimmed = point.trim();
            if (trimmed.endsWith('%')) {
                const ratio = parseFloat(trimmed.slice(0, -1));
                if (Number.isFinite(ratio)) {
                    const containerH = containerHRef.current || (SCREEN_HEIGHT - scaleSize(85));
                    return Math.max(0, containerH * (ratio / 100));
                }
            }
            const numeric = parseFloat(trimmed);
            if (Number.isFinite(numeric)) {
                return Math.max(0, numeric);
            }
        }
        return 0;
    }, []);

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
        try { bottomSheetRef.current?.snapToIndex?.(1, { duration: SHEET_OPEN_MS }); } catch { try { bottomSheetRef.current?.expand?.(); } catch { } }
        footerTranslateY.value = withTiming(-315, { duration: 225 });
    };

    // Handle input blur
    const handleInputBlur = () => {
        setIsInputFocused(false);
        setReplyingToIndex(null);
        footerTranslateY.value = withTiming(0, { duration: 200 });
    };

    // Handle visibility: open sheet from bottom + sync footer entrance
    // Depend on stable pid instead of the whole object to avoid re-running on like updates
    const postPid = postData?.pid;
    useEffect(() => {
        const hasPost = !!postPid;
        if (isVisible && hasPost && containerReady) {
            pendingCloseRef.current = false;
            sheetTranslateY.value = 0;
            const open = () => {
                try {
                    if (typeof openPositionPx === 'number') {
                        const h = containerHRef.current || (SCREEN_HEIGHT - scaleSize(85));
                        const desired = Math.max(0, Math.min(h, openPositionPx));
                        sheetOpenHeight.value = desired;
                        bottomSheetRef.current?.snapToPosition?.(desired, { duration: SHEET_OPEN_MS });
                    } else {
                        const defaultPx = getSnapPointPx(snapPoints[0]);
                        sheetOpenHeight.value = defaultPx;
                        bottomSheetRef.current?.snapToIndex?.(0, { duration: SHEET_OPEN_MS });
                    }
                } catch { }
            };
            requestAnimationFrame(open);
            // footer entrance animation
            footerOpacity.value = 0;
            footerIntroY.value = 10;
            footerOpacity.value = withTiming(1, { duration: 220 });
            footerIntroY.value = withTiming(0, { duration: 260 });
        } else {
            pendingCloseRef.current = false;
            const fallback = (() => {
                if (sheetOpenHeight.value > 0) return sheetOpenHeight.value;
                if (typeof openPositionPx === 'number') {
                    const h = containerHRef.current || (SCREEN_HEIGHT - scaleSize(85));
                    return Math.max(0, Math.min(h, openPositionPx));
                }
                return getSnapPointPx(snapPoints[0]);
            })();
            sheetOpenHeight.value = fallback;
            sheetTranslateY.value = fallback;
            bottomSheetRef.current?.close();
            footerOpacity.value = withTiming(0, { duration: 120 });
        }
    }, [isVisible, postPid, containerReady, openPositionPx, getSnapPointPx, sheetOpenHeight, sheetTranslateY, snapPoints]);

    // Emit a small open signal after the sheet has animated in
    useEffect(() => {
        if (!isVisible || !postPid || !containerReady) return;
        const id = setTimeout(() => { try { setOpenSignal(Date.now()); } catch { } }, 90);
        return () => clearTimeout(id);
    }, [isVisible, postPid, containerReady]);

    useEffect(() => () => {
        // no-op cleanup placeholder: timers handled by callers
    }, []);

    // Imperative collapse during interactive unfocus (ignore interactive updates during close)
    const isClosingRef = useRef(false);

    const closeSheet = useCallback((duration = 160) => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;
        pendingCloseRef.current = false;
        try {
            if (bottomSheetRef.current?.snapToPosition) {
                bottomSheetRef.current.snapToPosition(0, { duration });
            } else {
                bottomSheetRef.current?.close?.();
            }
        } catch { }
        // cancelAnimation(footerOpacity);
        // footerOpacity.value = withTiming(0.5, { duration: Math.min(duration, 160) });
        sheetTranslateY.value = sheetOpenHeight.value;
        // Leave reset to callers so we don't resnap after closing
    }, [footerOpacity, sheetOpenHeight, sheetTranslateY]);

    useEffect(() => {
        if (!isVisible || !postPid) return;
        if (!collapseSignal) return;
        if (isClosingRef.current || pendingCloseRef.current) return;
        if (unfocusGestureActive) {
            pendingCloseRef.current = true;
            return;
        }
        const timeoutId = setTimeout(() => {
            if (unfocusGestureActive) {
                pendingCloseRef.current = true;
            } else {
                closeSheet();
            }
        }, 0);
        return () => clearTimeout(timeoutId);
    }, [collapseSignal, isVisible, postPid, unfocusGestureActive, closeSheet]);

    // Imperative reopen if interactive drag cancels
    useEffect(() => {
        console.log('reopen');
        if (!isVisible || !postPid) return;
        if (!reopenSignal) return;
        if (!pendingCloseRef.current) return;
        pendingCloseRef.current = false;
        isClosingRef.current = false;
        sheetTranslateY.value = 0;
        if (sheetOpenHeight.value === 0) {
            if (typeof openPositionPx === 'number') {
                const h = containerHRef.current || (SCREEN_HEIGHT - scaleSize(85));
                sheetOpenHeight.value = Math.max(0, Math.min(h, openPositionPx));
            } else {
                sheetOpenHeight.value = getSnapPointPx(snapPoints[0]);
            }
        }
        footerOpacity.value = withTiming(1, { duration: 200 });
        try { bottomSheetRef.current?.snapToIndex?.(0); } catch { }
    }, [reopenSignal, isVisible, postPid, footerOpacity, openPositionPx, getSnapPointPx, sheetOpenHeight, sheetTranslateY, snapPoints]);

    useEffect(() => {
        if (!isVisible) {
            pendingCloseRef.current = false;
            isClosingRef.current = false;
        }
    }, [isVisible]);

    // Interactive unfocus: fade/slide the footer while we translate the sheet wrapper
    const updateFromProgress = useCallback((progress, forcedScaled) => {
        if (!isVisible || !postPid ) return;
        const slow = Math.max(0, interactiveScale || 0);
        const pRaw = Math.max(0, (progress || 0));
        const pSlow = typeof forcedScaled === 'number'
            ? Math.min(1, Math.max(0, forcedScaled))
            : Math.min(1, pRaw * slow);
        
        if (progress == 0) return;
        footerOpacity.value = 1 - progress;
        console.log(footerOpacity.value);
        footerDragY.value = progress * 120;
        if (pendingCloseRef.current && pRaw >= CLOSE_COMPLETE_PROGRESS) {
            pendingCloseRef.current = false;
            closeSheet();
        }
    }, [isVisible, postPid, interactiveScale, closeSheet, footerDragY, footerOpacity]);

    // Worklet-driven updates via SharedValue (preferred)
    useAnimatedReaction(
        () => {
            if (!interactiveProgressSV || !isVisible || !postPid) return -1;
            return interactiveProgressSV.value;
        },
        (progress) => {
            if (progress == null || progress < 0) return;
            const slow = Math.max(0, interactiveScale || 0);
            const p = Math.max(0, progress);
            const pSlow = Math.min(1, p * slow);
            sheetTranslateY.value = sheetOpenHeight.value * pSlow;
            runOnJS(updateFromProgress)(progress, pSlow);
        }
    );

    // Fallback numeric prop path
    useEffect(() => {
        if (!isVisible || !postPid) return;
        if (interactiveProgressSV) return; // SV path handles updates
        if (interactiveProgress == null) return;
        const slow = Math.max(0, interactiveScale || 0);
        const p = Math.max(0, interactiveProgress || 0);
        const pSlow = Math.min(1, p * slow);
        sheetTranslateY.value = sheetOpenHeight.value * pSlow;
        updateFromProgress(interactiveProgress, pSlow);
    }, [interactiveProgress, isVisible, postPid, interactiveProgressSV, updateFromProgress, interactiveScale, sheetOpenHeight, sheetTranslateY]);

    // Expand the bottom sheet when flagged
    useEffect(() => {
        try { bottomSheetRef.current?.snapToIndex?.(1, { duration: SHEET_OPEN_MS }); } catch { try { bottomSheetRef.current?.expand?.(); } catch { } }
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
            try { bottomSheetRef.current?.snapToIndex?.(0); } catch { }
        });
    }, []);

    // Handle sheet index change (defensively guard against stray event objects)
    const handleSheetIndexChange = useCallback((idx) => {
        const index = typeof idx === 'number' ? idx : -1;
        if (isVisible && postPid && !isClosingRef.current && index < 0) {
            enforceVisibleIndex();
            return;
        }
        if (index === 0) {
            sheetOpenHeight.value = getSnapPointPx(snapPoints[0]);
        } else if (index === 1) {
            sheetOpenHeight.value = getSnapPointPx(snapPoints[1]);
        } else if (index < 0) {
            sheetOpenHeight.value = 0;
        }
        try {
            // Decouple from the dispatch tick of any press/gesture by scheduling to next frame
            requestAnimationFrame(() => setIsSheetExpanded(index === 1));
        } catch {
            setIsSheetExpanded(index === 1);
        }
    }, [isVisible, postPid, enforceVisibleIndex, getSnapPointPx, sheetOpenHeight, snapPoints]);

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
            <Reanimated.View pointerEvents="box-none" style={[styles.sheetWrapper, sheetStyle]}>
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
            </Reanimated.View>
            {/* Keep footer mounted to preserve TextInput state across post updates/likes */}
            <Reanimated.View
                pointerEvents={isVisible && !!postPid ? 'box-none' : 'none'}
                style={[styles.footer, footerAnimatedStyle]}
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
            </Reanimated.View>
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
    sheetWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'box-none',
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
