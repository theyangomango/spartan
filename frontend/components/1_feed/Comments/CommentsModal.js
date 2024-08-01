import React, { useRef } from 'react';
import { View, FlatList, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import CommentCard from './CommentCard';
import updateDoc from '../../../../backend/helper/firebase/updateDoc';

export default function CommentsModal({ postData, handleTouchHeader, isSheetExpanded, setReplyingToIndex }) {
    const comments = postData.comments;
    const flatListRef = useRef(null);

    function handleLikeComment(index, replyIndex) {
        if (replyIndex === -1) {
            comments[index].likeCount++;
            comments[index].likedUsers.push(global.userData.uid);
        } else {
            comments[index].replies[replyIndex].likeCount++;
            comments[index].replies[replyIndex].likedUsers.push(global.userData.uid);
        }
        updateDoc('posts', postData.pid, { comments });
    }

    function handleUnlikeComment(index, replyIndex) {
        if (replyIndex === -1) {
            comments[index].likeCount--;
            const i = comments[index].likedUsers.indexOf(global.userData.uid);
            if (i > -1) comments[index].likedUsers.splice(i, 1);
        } else {
            comments[index].replies[replyIndex].likeCount--;
            const i = comments[index].replies[replyIndex].likedUsers.indexOf(global.userData.uid);
            if (i > -1) comments[index].replies[replyIndex].likedUsers.splice(i, 1);
        }
        updateDoc('posts', postData.pid, { comments });
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : null}
        >
            <View style={styles.mainContainer}>
                <Pressable style={styles.header} onTouchStart={handleTouchHeader}></Pressable>
                <FlatList
                    showsVerticalScrollIndicator={false}
                    ref={flatListRef}
                    data={comments}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item, index }) => (
                        <>
                            <Pressable>
                                <CommentCard
                                    data={item}
                                    likeComment={handleLikeComment}
                                    unlikeComment={handleUnlikeComment}
                                    index={index}
                                    setReplyingToIndex={setReplyingToIndex}
                                    isReply={false}
                                    replyIndex={-1}
                                />
                            </Pressable>
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
                                />
                            ))}
                        </>
                    )}
                    contentContainerStyle={[styles.commentsListContainer, { paddingBottom: isSheetExpanded ? 100 : 525 }]}
                />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 25,
        alignItems: 'center',
        zIndex: 1,
    },
    commentsListContainer: {
        paddingTop: 12,
        paddingHorizontal: 15,
        flexGrow: 1,
    },
});
