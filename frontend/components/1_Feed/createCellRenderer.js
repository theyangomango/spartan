import React, { useMemo } from "react";
import { View } from "react-native";
import { useFeedFocus } from "../../screens/feed/hooks/FeedFocusContext";

// Factory that returns a CellRenderer component bound to a provided onCellLayout(index, y, h)
// This mirrors the inline CellRenderer used by FlatList, but lives in its own file for clarity.
export default function createCellRenderer(onCellLayout) {
  const CellRenderer = ({ index, style, onLayout, children, pointerEvents, ...rest }) => {
    const { isSomePostFocused, focusedIndex, translatingIndex } = useFeedFocus();
    const resolvedPointerEvents = useMemo(() => {
      const base = pointerEvents || "auto";
      if (!isSomePostFocused) return base;
      if (typeof index !== 'number') return base;
      if (index === focusedIndex || index === translatingIndex) return base;
      return "none";
    }, [pointerEvents, isSomePostFocused, index, focusedIndex, translatingIndex]);
    const resolvedStyle = useMemo(() => {
      const baseRaw = Array.isArray(style) ? style : [style];
      const base = baseRaw.filter(Boolean);
      if (typeof index !== 'number') return base;
      if (!isSomePostFocused) return base;
      if (index === focusedIndex || index === translatingIndex) {
        return [...base, { zIndex: 1000, elevation: 32 }];
      }
      return [...base, { zIndex: -10, elevation: 0 }];
    }, [style, index, isSomePostFocused, focusedIndex, translatingIndex]);

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
        style={resolvedStyle}
        onLayout={handleLayout}
        pointerEvents={resolvedPointerEvents}
        {...rest}
      >
        {children}
      </View>
    );
  };
  return CellRenderer;
}
