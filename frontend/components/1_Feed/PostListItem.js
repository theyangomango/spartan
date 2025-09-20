import React, { memo, useCallback } from "react";
import Reanimated from "react-native-reanimated";
import Post from "./Posts/Post";
import { usePostFocus } from "../../screens/feed/hooks/FeedFocusContext";

// Renders a single feed post item, handling focused/translating overlay state.
// This keeps the Feed screen simpler by isolating conditional wrappers and props.
const PostListItem = memo(function PostListItem({
  item,
  index,
  isScreenFocused,
  centeredIndex,
  // highlights/programmatic focus
  highlightPid,
  highlightSignal,
  programFocusPid,
  programFocusSignal,
  // actions
  openCommentsModal,
  openShareModal,
  toViewProfilePosts,
  openViewWorkoutModal,
  // refs
  postRefs,
}) {
  const {
    isSomePostFocused,
    isFocused,
    translatingIndex,
    interPostStyle,
  } = usePostFocus(index);

  const isFocusedPost = !!isFocused;
  const isTranslatingPost = index === translatingIndex;

  const wrapperStyle = [
    { width: "100%" },
    (isFocusedPost || isTranslatingPost) && { zIndex: 9999, elevation: 32 },
  ];

  const shouldPlay = isScreenFocused && !isSomePostFocused && index === centeredIndex;

  const registerRef = useCallback((el) => {
    if (!postRefs) return;
    const map = postRefs.current || {};
    if (el) {
      map[index] = el;
    } else if (map[index]) {
      delete map[index];
    }
    postRefs.current = map;
  }, [postRefs, index]);

  const postProps = {
    ref: registerRef,
    data: item,
    index,
    openCommentsModal,
    openShareModal,
    toViewProfile: toViewProfilePosts,
    openViewWorkoutModal,
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
