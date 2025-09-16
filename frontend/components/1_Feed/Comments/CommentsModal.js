/**
 * Renders a list of comments and their replies for a post.
 * Allows users to like/unlike comments and navigate to user profiles.
 * * Handles backend functionality for liking/unliking comments 
 * TODO standardize component for backend functionality
 */

import React, { useRef } from "react";
import {
    View,
    FlatList,
    StyleSheet,
    Pressable,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import CommentCard from "./CommentCard";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import sendNotification from "../../../../backend/sendNotification";
import scaleSize from "../../../helper/scaleSize"; // Import the scaleSize utility

export default function CommentsModal({
    postData,
    handleTouchHeader,
    isSheetExpanded,
    setReplyingToIndex,
    toViewProfile,
    openSignal
}) {
    const comments = postData.comments;
    const flatListRef = useRef(null);

    // Ensure the list is scrolled to top whenever the sheet opens
    React.useEffect(() => {
        try { flatListRef.current?.scrollToOffset?.({ offset: 0, animated: false }); } catch {}
    }, [openSignal, postData?.pid]);

    /**
     * Handles liking a comment or reply.
     * @param {number} index - Index of the comment.
     * @param {number} replyIndex - Index of the reply (-1 if not a reply).
     */
    const handleLikeComment = (index, replyIndex) => {
        const target = replyIndex === -1 ? comments[index] : comments[index].replies[replyIndex];
        target.likeCount += 1;
        target.likedUsers.push(global.userData.uid);

        updateDoc("posts", postData.pid, { comments });

        const notif = {
            uid: global.userData.uid,
            pfp: global.userData.image,
            handle: global.userData.handle,
            name: global.userData.name,
            type: "liked-comment",
            content: target.content,
            pid: postData.pid,
            timestamp: Date.now()
        };

        sendNotification(target.uid, notif);
    };

    /**
     * Handles unliking a comment or reply.
     * @param {number} index - Index of the comment.
     * @param {number} replyIndex - Index of the reply (-1 if not a reply).
     */
    const handleUnlikeComment = (index, replyIndex) => {
        const target = replyIndex === -1 ? comments[index] : comments[index].replies[replyIndex];
        target.likeCount -= 1;
        const userIndex = target.likedUsers.indexOf(global.userData.uid);
        if (userIndex > -1) {
            target.likedUsers.splice(userIndex, 1);
        }

        updateDoc("posts", postData.pid, { comments });
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            {/* Header Pressable to handle touch events */}
            <Pressable style={styles.header} onTouchStart={handleTouchHeader} />

            {/* Use BottomSheetFlatList for proper insets/gestures inside the sheet */}
            <BottomSheetFlatList
                ref={flatListRef}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="never"
                data={comments}
                keyExtractor={(item, index) => `${item.uid}-${index}`}
                renderItem={({ item, index }) => (
                    <View>
                        {/* Main Comment */}
                        <CommentCard
                            data={item}
                            likeComment={handleLikeComment}
                            unlikeComment={handleUnlikeComment}
                            index={index}
                            setReplyingToIndex={setReplyingToIndex}
                            isReply={false}
                            replyIndex={-1}
                            toViewProfile={toViewProfile}
                            isFirst={index === 0}
                        />

                        {/* Render Replies if any */}
                        {item.replies && item.replies.map((reply, replyIndex) => (
                            <CommentCard
                                key={`${index}-${replyIndex}`}
                                data={reply}
                                likeComment={handleLikeComment}
                                unlikeComment={handleUnlikeComment}
                                index={index}
                                setReplyingToIndex={setReplyingToIndex}
                                isReply={true}
                                replyIndex={replyIndex}
                                toViewProfile={toViewProfile}
                            />
                        ))}
                    </View>
                )}
                contentContainerStyle={[
                    styles.commentsListContainer,
                    { paddingTop: 0, marginTop: 0, paddingBottom: isSheetExpanded ? scaleSize(100) : scaleSize(525) }
                ]}
                ListHeaderComponent={<View style={{ height: 0 }} />}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 20
    },
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 0,
        alignItems: "center",
        zIndex: 1
    },
    commentsListContainer: {
        paddingTop: 0,
        paddingHorizontal: scaleSize(15),
        flexGrow: 1
    }
});
