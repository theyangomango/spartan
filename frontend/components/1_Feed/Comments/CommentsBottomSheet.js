import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View, Keyboard, Dimensions } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CommentsModal from "./CommentsModal";
import CommentsInputRow from "./CommentsInputRow";
import incrementDocValue from "../../../../backend/helper/firebase/incrementDocValue";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import sendNotification from "../../../../backend/sendNotification";
import { getCommentsBottomSheetStyles } from "../../../helper/getCommentsBottomSheetStyles";
import scaleSize from "../../../helper/scaleSize";
import theme from "../../../theme/mfpDark";
import { buildLivePostMetadata } from "../../../utils/livePostMeta";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("screen");
const dynamicStylesDefault = getCommentsBottomSheetStyles(SCREEN_WIDTH, SCREEN_HEIGHT);
export const COMMENTS_BOTTOM_SHEET_TOP_OFFSET = scaleSize(85);
const INPUT_MIN_HEIGHT = scaleSize(76);

const CommentsBottomSheet = ({
    isVisible,
    postData,
    commentsBottomSheetExpandFlag,
    toViewProfile,
    onShowLikesSheet,
    onDismiss,
}) => {
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ["100%"], []);
    const [inputText, setInputText] = useState("");
    const [replyingToIndex, setReplyingToIndex] = useState(null);
    const [openSignal, setOpenSignal] = useState(0);
    const textInputRef = useRef(null);
    const insets = useSafeAreaInsets();
    const postPid = postData?.pid ?? null;

    const dynamicStyles = useMemo(() => dynamicStylesDefault, []);

    const renderBackdrop = useCallback((props) => (
        <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
        />
    ), []);

    const resetState = useCallback(() => {
        setInputText("");
        setReplyingToIndex(null);
    }, []);

    const closeSheet = useCallback(() => {
        resetState();
        onDismiss?.();
    }, [onDismiss, resetState]);

    useEffect(() => {
        if (isVisible && postData) {
            bottomSheetRef.current?.expand();
            setOpenSignal(Date.now());
        } else {
            bottomSheetRef.current?.close();
        }
    }, [isVisible, postData]);

    useEffect(() => {
        if (!isVisible || !postData) return;
        bottomSheetRef.current?.expand();
        setOpenSignal(Date.now());
    }, [commentsBottomSheetExpandFlag, isVisible, postData]);

    const handleSheetChange = useCallback((index) => {
        if (index < 0) {
            closeSheet();
        }
    }, [closeSheet]);

    const handleTouchHeader = useCallback(() => {
        Keyboard.dismiss();
        textInputRef.current?.blur?.();
    }, []);

    const handleSend = useCallback(() => {
        const message = inputText.trim();
        if (!message || !postPid || !postData) return;

        const currentUser = global?.userData || {};
        const newComment = {
            handle: currentUser.handle,
            uid: currentUser.uid,
            pfp: currentUser.image,
            content: message,
            timestamp: Date.now(),
            likeCount: 0,
            likedUsers: [],
            replies: [],
            isCaption: false,
        };

        const comments = Array.isArray(postData.comments) ? postData.comments : (postData.comments = []);

        if (replyingToIndex == null) {
            comments.push(newComment);
        } else if (comments[replyingToIndex]) {
            const target = comments[replyingToIndex];
            if (!Array.isArray(target.replies)) target.replies = [];
            target.replies.push(newComment);

            const replyNotif = {
                uid: currentUser.uid,
                pfp: currentUser.image,
                handle: currentUser.handle,
                name: currentUser.name,
                type: "replied-comment",
                content: message,
                pid: postPid,
                timestamp: Date.now(),
            };
            sendNotification(target.uid, replyNotif);
        }

        const liveMeta = buildLivePostMetadata(postData, currentUser) || {};
        const updatePayload = Object.keys(liveMeta).length ? { ...liveMeta, comments } : { comments };
        updateDoc("posts", postPid, updatePayload);
        incrementDocValue("posts", postPid, "commentCount");

        const postOwnerUid = String(postData.uid || "");
        const actorUid = String(currentUser.uid || "");
        if (postOwnerUid && actorUid && postOwnerUid !== actorUid) {
            const notif = {
                uid: actorUid,
                pfp: currentUser.image,
                handle: currentUser.handle,
                name: currentUser.name,
                type: "comment",
                content: message,
                pid: postPid,
                timestamp: Date.now(),
            };
            sendNotification(postOwnerUid, notif);
        }

        setInputText("");
        setReplyingToIndex(null);
        Keyboard.dismiss();
    }, [inputText, postPid, postData, replyingToIndex]);

    useEffect(() => {
        if (!isVisible) {
            resetState();
        }
    }, [isVisible, resetState]);

    useEffect(() => {
        resetState();
    }, [postPid, resetState]);

    const replyingHandle = useMemo(() => (
        replyingToIndex != null && postData?.comments?.[replyingToIndex]
            ? postData.comments[replyingToIndex].handle
            : null
    ), [replyingToIndex, postData?.comments]);

    const inputSafeMargin = Math.max(scaleSize(12), insets.bottom);
    const commentsListBottomPadding = dynamicStyles.inputHeight + scaleSize(36) + inputSafeMargin;

    return (
        <View
            style={styles.wrapper}
            pointerEvents={isVisible ? "auto" : "none"}
        >
            <BottomSheet
                ref={bottomSheetRef}
                index={isVisible ? 0 : -1}
                snapPoints={snapPoints}
                enablePanDownToClose
                onChange={handleSheetChange}
                backgroundStyle={styles.sheetBackground}
                handleIndicatorStyle={styles.handleIndicator}
                onClose={closeSheet}
                backdropComponent={renderBackdrop}
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
                android_keyboardInputMode="adjustResize"
                topInset={COMMENTS_BOTTOM_SHEET_TOP_OFFSET}
            >
                {postData ? (
                    <View style={styles.sheetContent}>
                        <View style={styles.modalContainer}>
                            <CommentsModal
                                postData={postData}
                                handleTouchHeader={handleTouchHeader}
                                setReplyingToIndex={setReplyingToIndex}
                                toViewProfile={toViewProfile}
                                openSignal={openSignal}
                                onShowLikesSheet={onShowLikesSheet}
                                bottomPadding={commentsListBottomPadding}
                            />
                        </View>
                        <View style={[styles.inputContainer, { marginBottom: inputSafeMargin }]}>
                            <CommentsInputRow
                                inputRef={textInputRef}
                                value={inputText}
                                onChangeText={setInputText}
                                onFocus={() => { }}
                                onBlur={() => { }}
                                onPressSend={handleSend}
                                editable={!!postPid}
                                canSend={!!inputText.trim()}
                                replyingToHandle={replyingHandle}
                                dynamicStyles={dynamicStyles}
                            />
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyState} />
                )}
            </BottomSheet>
        </View>
    );
};


const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
    },
    sheetBackground: {
        backgroundColor: theme.surface,
    },
    handleIndicator: {
        backgroundColor: "rgba(255,255,255,0.25)",
    },
    sheetContent: {
        flex: 1,
        backgroundColor: theme.surface,
        justifyContent: "space-between",
    },
    modalContainer: {
        flex: 1,
    },
    inputContainer: {
        paddingHorizontal: scaleSize(16),
        paddingTop: scaleSize(8),
        paddingBottom: scaleSize(12),
        backgroundColor: theme.surface,
        minHeight: INPUT_MIN_HEIGHT,
        borderTopLeftRadius: scaleSize(18),
        borderTopRightRadius: scaleSize(18),
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: scaleSize(8),
        shadowOffset: { width: 0, height: -scaleSize(2) },
        zIndex: 1,
    },
    emptyState: {
        height: 1,
    },
});

export default CommentsBottomSheet;
