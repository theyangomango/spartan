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
import CommentCard from "./CommentCard";
import updateDoc from "../../../../backend/helper/firebase/updateDoc";
import sendNotification from "../../../../backend/sendNotification";
import scaleSize from "../../../helper/scaleSize"; // Import the scaleSize utility

export default function CommentsModal({
    postData,
    handleTouchHeader,
    isSheetExpanded,
    setReplyingToIndex,
    toViewProfile
}) {
    const comments = postData.comments;
    const flatListRef = useRef(null);

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

            {/* FlatList to render comments and their replies */}
            <FlatList
                ref={flatListRef}
                showsVerticalScrollIndicator={false}
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
                    { paddingBottom: isSheetExpanded ? scaleSize(100) : scaleSize(525) }
                ]}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: scaleSize(25),
        alignItems: "center",
        zIndex: 1
    },
    commentsListContainer: {
        paddingTop: scaleSize(10),
        paddingHorizontal: scaleSize(15),
        flexGrow: 1
    }
});
