import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { StyleSheet, Platform, KeyboardAvoidingView, Keyboard, Dimensions } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import Reanimated, { useAnimatedReaction, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import theme from "../../../theme/mfpDark";
import CommentsModal from "./CommentsModal";
import incrementDocValue from "../../../../backend/helper/firebase/incrementDocValue";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import sendNotification from "../../../../backend/sendNotification";
import { getCommentsBottomSheetStyles } from "../../../helper/getCommentsBottomSheetStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import getScrollTargetPosition from "../../../helper/getScrollTargetPosition";
import scaleSize from "../../../helper/scaleSize";
import CommentsInputRow from "./CommentsInputRow";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
const dynamicStyles = getCommentsBottomSheetStyles(SCREEN_WIDTH, SCREEN_HEIGHT);
const CLOSE_COMPLETE_PROGRESS = 0.92;
const POST_ASPECT_RATIO = 0.8;
const TARGET_POSITION = getScrollTargetPosition(SCREEN_WIDTH, SCREEN_HEIGHT);

const CommentsBottomSheet = ({ isVisible, postData, commentsBottomSheetExpandFlag, toViewProfile, collapseSignal, reopenSignal, interactiveProgress, interactiveProgressSV, interactiveScale = 0.85, openPositionPx, unfocusGestureActive = false }) => {
    // Smoother sheet expansion
    const SHEET_OPEN_MS = 280;
    const commentsContainerOffset = useMemo(() => scaleSize(85), []);
    const containerHeight = useMemo(
        () => Math.max(0, SCREEN_HEIGHT - commentsContainerOffset),
        [commentsContainerOffset]
    );
    const focusedPostSnapHeight = useMemo(() => {
        const postCardHeight = SCREEN_WIDTH / POST_ASPECT_RATIO;
        const rawHeight = SCREEN_HEIGHT - (TARGET_POSITION + postCardHeight);
        return Math.max(0, Math.min(containerHeight, rawHeight));
    }, [containerHeight]);
    const firstSnapPoint = useMemo(() => {
        if (Number.isFinite(openPositionPx) && openPositionPx > 0) {
            return Math.max(0, Math.min(containerHeight, openPositionPx));
        }
        if (focusedPostSnapHeight > 0) {
            return focusedPostSnapHeight;
        }
        const fallbackRatio = 0.345; // legacy default to avoid a zero snap height
        return Math.max(0, Math.min(containerHeight, containerHeight * fallbackRatio));
    }, [containerHeight, focusedPostSnapHeight, openPositionPx]);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const bottomSheetRef = useRef(null);
    const footerTranslateY = useSharedValue(0); // moves when input focuses
    const footerIntroY = useSharedValue(10);    // small entrance slide
    const footerOpacity = useSharedValue(0);    // fade with sheet
    const sheetTranslateY = useSharedValue(0);
    const sheetOpenHeight = useSharedValue(0);
    const sheetOpenHeightRef = useRef(0);
    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: sheetTranslateY.value }],
    }));
    const footerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: footerOpacity.value,
        transform: [{ translateY: footerTranslateY.value + footerIntroY.value }],
    }));
    const pendingCloseRef = useRef(false);
    const containerHRef = useRef(containerHeight);
    const snapPoints = useMemo(() => [firstSnapPoint || 0, "92%"], [firstSnapPoint]);

    useEffect(() => {
        containerHRef.current = containerHeight;
    }, [containerHeight]);
    const [isSheetExpanded, setIsSheetExpanded] = useState(false);
    const [openSignal, setOpenSignal] = useState(0);
    const [inputText, setInputText] = useState('');
    const [replyingToIndex, setReplyingToIndex] = useState(null);
    const textInputRef = useRef(null);
    const insets = useSafeAreaInsets();
    const safeAreaBottom = Math.max(0, insets.bottom || 0);
    const footerTopPadding = scaleSize(6);
    const footerBottomPadding = safeAreaBottom - scaleSize(12);
    const footerBaseStyle = useMemo(() => ({
        paddingBottom: footerBottomPadding,
        paddingTop: footerTopPadding,
        minHeight: dynamicStyles.inputHeight + footerBottomPadding + footerTopPadding,
        borderTopLeftRadius: scaleSize(40),
        borderTopRightRadius: scaleSize(40),
    }), [dynamicStyles.inputHeight, footerBottomPadding, footerTopPadding]);

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
                    const containerH = containerHRef.current || containerHeight;
                    return Math.max(0, containerH * (ratio / 100));
                }
            }
            const numeric = parseFloat(trimmed);
            if (Number.isFinite(numeric)) {
                return Math.max(0, numeric);
            }
        }
        return 0;
    }, [containerHeight]);

    const resolveOpenHeight = useCallback(() => {
        if (sheetOpenHeight.value > 0) return sheetOpenHeight.value;
        if (sheetOpenHeightRef.current > 0) return sheetOpenHeightRef.current;
        const defaultPx = getSnapPointPx(snapPoints[0]);
        if (typeof openPositionPx === 'number') {
            const h = containerHRef.current || containerHeight;
            const desired = Math.max(0, Math.min(h, openPositionPx));
            return desired > defaultPx ? desired : defaultPx;
        }
        return defaultPx;
    }, [containerHeight, getSnapPointPx, openPositionPx, snapPoints, sheetOpenHeight]);

    // Handle send comment
    const handleSend = useCallback(() => {
        if (!inputText || !postData) return;
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
    }, [inputText, postData, replyingToIndex]);

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
        if (isVisible && hasPost) {
            pendingCloseRef.current = false;
            sheetTranslateY.value = 0;

            const containerH = containerHRef.current || containerHeight;
            const defaultPx = getSnapPointPx(snapPoints[0]);
            const desiredHeight = typeof openPositionPx === 'number'
                ? Math.max(0, Math.min(containerH, openPositionPx))
                : defaultPx;
            const targetHeight = desiredHeight > defaultPx ? desiredHeight : defaultPx;

            sheetOpenHeight.value = targetHeight;
            sheetOpenHeightRef.current = targetHeight;

            const open = () => {
                try {
                    if (
                        typeof openPositionPx === 'number' &&
                        targetHeight !== defaultPx &&
                        bottomSheetRef.current?.snapToPosition
                    ) {
                        bottomSheetRef.current.snapToPosition(targetHeight, { duration: SHEET_OPEN_MS });
                    } else {
                        bottomSheetRef.current?.snapToIndex?.(0, { duration: SHEET_OPEN_MS });
                    }
                } catch { }
            };

            try { requestAnimationFrame(open); } catch { open(); }

            footerOpacity.value = 0;
            footerIntroY.value = 10;
            footerOpacity.value = withTiming(1, { duration: 220 });
            footerIntroY.value = withTiming(0, { duration: 260 });

        } else {
            pendingCloseRef.current = false;
            if (!isVisible || !hasPost) {
                try { textInputRef.current?.blur?.(); } catch { }
            }
            const fallback = resolveOpenHeight();
            sheetOpenHeight.value = fallback;
            sheetOpenHeightRef.current = fallback;
            sheetTranslateY.value = fallback;
            try { bottomSheetRef.current?.close?.(); } catch { }
            footerOpacity.value = withTiming(0, { duration: 120 });
            footerIntroY.value = withTiming(0, { duration: 180 });
        }
    }, [
        getSnapPointPx,
        isVisible,
        openPositionPx,
        postPid,
        resolveOpenHeight,
        sheetOpenHeight,
        sheetTranslateY,
        snapPoints,
        footerIntroY,
        footerOpacity,
    ]);

    // Emit a small open signal after the sheet has animated in
    useEffect(() => {
        if (!isVisible || !postPid) return;
        const id = setTimeout(() => { try { setOpenSignal(Date.now()); } catch { } }, 90);
        return () => clearTimeout(id);
    }, [isVisible, postPid]);

    // Imperative collapse during interactive unfocus (ignore interactive updates during close)
    const isClosingRef = useRef(false);

    const closeSheet = useCallback((duration = 160) => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;
        pendingCloseRef.current = false;
        try { textInputRef.current?.blur?.(); } catch { }
        try {
            if (bottomSheetRef.current?.snapToPosition) {
                bottomSheetRef.current.snapToPosition(0, { duration });
            } else {
                bottomSheetRef.current?.close?.();
            }
        } catch { }
        sheetTranslateY.value = sheetOpenHeight.value;
        // Leave reset to callers so we don't resnap after closing
    }, [sheetOpenHeight, sheetTranslateY]);

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
        if (!isVisible || !postPid) return;
        if (!reopenSignal) return;
        if (!pendingCloseRef.current) return;
        pendingCloseRef.current = false;
        isClosingRef.current = false;
        sheetTranslateY.value = 0;
        if (sheetOpenHeight.value === 0) {
            const height = resolveOpenHeight();
            sheetOpenHeight.value = height;
            sheetOpenHeightRef.current = height;
        }
        footerOpacity.value = withTiming(1, { duration: 200 });
        try { bottomSheetRef.current?.snapToIndex?.(0); } catch { }
    }, [reopenSignal, isVisible, postPid, footerOpacity, resolveOpenHeight, sheetOpenHeight, sheetTranslateY]);

    useEffect(() => {
        if (!isVisible) {
            pendingCloseRef.current = false;
            isClosingRef.current = false;
        }
    }, [isVisible]);

    // Interactive unfocus: fade/slide the footer while we translate the sheet wrapper
    const updateFromProgress = useCallback((progress, forcedScaled) => {
        if (!isVisible || !postPid) return;
        const slow = Math.max(0, interactiveScale || 0);
        const pRaw = Math.max(0, progress || 0);
        const pSlow = typeof forcedScaled === 'number'
            ? Math.min(1, Math.max(0, forcedScaled))
            : Math.min(1, pRaw * slow);

        const clampedRaw = Math.min(1, pRaw);
        footerOpacity.value = Math.max(0, 1 - clampedRaw);

        if (pendingCloseRef.current && !unfocusGestureActive && pRaw >= CLOSE_COMPLETE_PROGRESS) {
            pendingCloseRef.current = false;
            closeSheet();
        }
    }, [isVisible, postPid, interactiveScale, closeSheet, footerOpacity, unfocusGestureActive]);

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
        if (!isVisible || !postPid) return;
        try { bottomSheetRef.current?.snapToIndex?.(0, { duration: SHEET_OPEN_MS }); } catch { try { bottomSheetRef.current?.snapToPosition?.(getSnapPointPx(snapPoints[0]), { duration: SHEET_OPEN_MS }); } catch { } }
    }, [commentsBottomSheetExpandFlag, getSnapPointPx, isVisible, postPid, snapPoints]);

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
            const h0 = getSnapPointPx(snapPoints[0]);
            sheetOpenHeight.value = h0;
            sheetOpenHeightRef.current = h0;
        } else if (index === 1) {
            const h1 = getSnapPointPx(snapPoints[1]);
            sheetOpenHeight.value = h1;
            sheetOpenHeightRef.current = h1;
        } else if (index < 0) {
            sheetOpenHeight.value = 0;
            sheetOpenHeightRef.current = 0;
        }
        try {
            // Decouple from the dispatch tick of any press/gesture by scheduling to next frame
            requestAnimationFrame(() => setIsSheetExpanded(index === 1));
        } catch {
            setIsSheetExpanded(index === 1);
        }
    }, [isVisible, postPid, enforceVisibleIndex, getSnapPointPx, sheetOpenHeight, snapPoints]);

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
                    enableContentPanningGesture={true}
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
                style={[styles.footer, footerBaseStyle, footerAnimatedStyle]}
            >
                <CommentsInputRow
                    inputRef={textInputRef}
                    value={inputText}
                    onChangeText={setInputText}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    onPressSend={handleSend}
                    editable={isVisible && !!postPid}
                    canSend={isVisible && !!postPid}
                    replyingToHandle={replyingToIndex != null ? postData?.comments?.[replyingToIndex]?.handle : null}
                    dynamicStyles={dynamicStyles}
                />
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
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        backgroundColor: theme.surface,
        width: '100%',
    },
});

export default CommentsBottomSheet;
