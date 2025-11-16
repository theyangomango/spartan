import React, { memo, useCallback } from "react";
import SimpleFeedPost from "./SimpleFeedPost";
import { logFeedSignal } from "../../helper/feedSignals";

const PostListItem = memo(function PostListItem({
  item,
  index,
  highlightPid,
  highlightSignal,
  openCommentsModal,
  openShareModal,
  openLikesSheet,
  toViewProfilePosts,
  openViewWorkoutModal,
  onDeletePost,
  onEditPost,
  onEditWorkout,
}) {
  const handleProfile = useCallback(() => {
    if (item?.pid) {
      logFeedSignal("profile_tap", { pid: item.pid, uid: item?.uid || item?.creatorUid });
    }
    if (typeof toViewProfilePosts === "function") {
      toViewProfilePosts(index);
    }
  }, [item?.pid, item?.uid, item?.creatorUid, toViewProfilePosts, index]);

  const handleWorkout = useCallback(() => {
    if (typeof openViewWorkoutModal === "function") {
      openViewWorkoutModal(index);
    }
  }, [openViewWorkoutModal, index]);

  const handleComments = useCallback(() => {
    if (typeof openCommentsModal === "function") {
      openCommentsModal(index);
    }
  }, [openCommentsModal, index]);

  const handleShare = useCallback(() => {
    if (typeof openShareModal === "function") {
      openShareModal(index);
    }
  }, [openShareModal, index]);

  const handleLikes = useCallback(() => {
    if (typeof openLikesSheet === "function") {
      openLikesSheet(index);
    }
  }, [openLikesSheet, index]);

  const handleDeletePost = useCallback(() => {
    if (typeof onDeletePost === "function") {
      onDeletePost(index);
    }
  }, [onDeletePost, index]);

  const handleEditPost = useCallback(() => {
    if (typeof onEditPost === "function") {
      onEditPost(index);
    }
  }, [onEditPost, index]);

  const handleEditWorkout = useCallback(() => {
    if (typeof onEditWorkout === "function") {
      onEditWorkout(index);
    }
  }, [onEditWorkout, index]);

  return (
    <SimpleFeedPost
      data={item}
      index={index}
      highlightPid={highlightPid}
      highlightSignal={highlightSignal}
      onPressProfile={handleProfile}
      onPressWorkout={handleWorkout}
      onPressComments={handleComments}
      onPressShare={handleShare}
      onPressLikes={handleLikes}
      onPressDeletePost={handleDeletePost}
      onPressEditPost={typeof onEditPost === "function" ? handleEditPost : undefined}
      onPressEditWorkout={typeof onEditWorkout === "function" ? handleEditWorkout : undefined}
    />
  );
});

export default PostListItem;
