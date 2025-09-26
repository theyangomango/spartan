import React from "react";
import { View } from "react-native";
import { useFeedFocus } from "../../screens/feed/hooks/FeedFocusContext";

// Factory that returns a CellRenderer component bound to a provided onCellLayout(index, y, h)
// This mirrors the inline CellRenderer used by FlatList, but lives in its own file for clarity.
export default function createCellRenderer(onCellLayout) {
  const CellRenderer = ({ index, style, onLayout, children, ...rest }) => {
    const { isSomePostFocused, focusedIndex, translatingIndex } = useFeedFocus();
    const isActive = !isSomePostFocused || index === focusedIndex || index === translatingIndex;

    const handleLayout = (e) => {
      try {
        const { y, height: h } = e?.nativeEvent?.layout || {};
        if (typeof index === 'number' && Number.isFinite(y) && Number.isFinite(h)) {
          onCellLayout && onCellLayout(index, y, h);
        }
      } catch {}
      onLayout && onLayout(e);
    };

    return (
      <View
        pointerEvents={isActive ? 'auto' : 'none'}
        style={style}
        onLayout={handleLayout}
        {...rest}
      >
        {children}
      </View>
    );
  };
  return CellRenderer;
}
