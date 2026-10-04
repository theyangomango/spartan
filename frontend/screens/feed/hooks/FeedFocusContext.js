import { createContext } from 'react';

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

export default FeedFocusContext;
