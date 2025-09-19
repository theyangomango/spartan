import React, { createContext, useContext } from 'react';

const defaultValue = {
  isSomePostFocused: false,
  focusedIndex: -1,
  translatingIndex: -1,
  focusModeSV: null,
  interactiveUnfocusSV: null,
  interPostStyle: null,
  unfocusGestureActive: false,
  handleFocusPost: () => {},
  handleUnfocus: () => {},
};

const FeedFocusContext = createContext(defaultValue);

export const FeedFocusProvider = ({ value, children }) => (
  <FeedFocusContext.Provider value={value}>{children}</FeedFocusContext.Provider>
);

export const useFeedFocus = () => {
  const ctx = useContext(FeedFocusContext);
  if (!ctx) {
    throw new Error('useFeedFocus must be used within a FeedFocusProvider');
  }
  return ctx;
};

export const usePostFocus = (index) => {
  const ctx = useFeedFocus();
  const { focusedIndex, isSomePostFocused, unfocusGestureActive } = ctx;
  const isFocused = isSomePostFocused && index === focusedIndex;

  return {
    ...ctx,
    isFocused,
    unfocusGestureActive: isFocused ? unfocusGestureActive : false,
  };
};

export default FeedFocusContext;
