import React, { memo, useCallback } from "react";
import SimpleFeedPost from "./SimpleFeedPost";

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
}) {
  const handleProfile = useCallback(() => {
    if (typeof toViewProfilePosts === "function") {
      toViewProfilePosts(index);
    }
  }, [toViewProfilePosts, index]);

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
    />
  );
});

export default PostListItem;
