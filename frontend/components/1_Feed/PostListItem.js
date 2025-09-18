import React, { memo } from "react";
import { View } from "react-native";
import Reanimated from "react-native-reanimated";
import Post from "./Posts/Post";

// Renders a single feed post item, handling focused/translating overlay state.
// This keeps the Feed screen simpler by isolating conditional wrappers and props.
const PostListItem = memo(function PostListItem({
  item,
  index,
  // state/context
  isSomePostFocused,
  isScreenFocused,
  centeredIndex,
  focusedPostIndexRef,
  translatingIndexRef,
  // animated/gesture
  interPostStyle,
  unfocusGestureActive,
  isFocusSV,
  interactiveProgressSV,
  // highlights/programmatic focus
  highlightPid,
  highlightSignal,
  programFocusPid,
  programFocusSignal,
  // actions
  openCommentsModal,
  openShareModal,
  handleFocusPost,
  toViewProfilePosts,
  openViewWorkoutModal,
  // refs
  postRefs,
}) {
  const isFocusedPost = index === (focusedPostIndexRef?.current ?? -1);
  const isTranslatingPost = index === (translatingIndexRef?.current ?? -1);

  const wrapperStyle = [
    { width: "100%" },
    (isFocusedPost || isTranslatingPost) && { zIndex: 9999, elevation: 32 },
  ];

  const isFocusedProp = isSomePostFocused ? isFocusedPost : false;
  const shouldPlay = isScreenFocused && !isSomePostFocused && index === centeredIndex;

  const postProps = {
    ref: (el) => { if (postRefs) postRefs.current = { ...(postRefs.current || {}), [index]: el }; },
    data: item,
    index,
    openCommentsModal,
    openShareModal,
    handleFocusPost,
    toViewProfile: toViewProfilePosts,
    openViewWorkoutModal,
    isFocused: isFocusedProp,
    isSomePostFocused,
    focusModeSV: isFocusSV,
    interactiveUnfocusSV: interactiveProgressSV,
    interactiveActive: isFocusedProp ? unfocusGestureActive : false,
    highlightPid,
    highlightSignal,
    programFocusPid,
    programFocusSignal,
    shouldPlay,
  };

  if (isFocusedPost || isTranslatingPost) {
    return (
      <Reanimated.View style={[wrapperStyle, interPostStyle]} pointerEvents="auto">
        <Post {...postProps} />
      </Reanimated.View>
    );
  }

  return (
    <Reanimated.View style={wrapperStyle} pointerEvents={isSomePostFocused ? "none" : "auto"}>
      <Post {...postProps} />
    </Reanimated.View>
  );
});

export default PostListItem;

