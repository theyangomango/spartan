import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, useWindowDimensions } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";
import theme from "../../../../theme/mfpDark";
import { withStrongPress } from "../../../../utils/haptics";
import useStableSafeAreaInsets from "../../../../hooks/useStableSafeAreaInsets";

import scaleSize from "../../../../helper/scaleSize";

const PANEL_WIDTH = 260;
const EDGE_GAP = scaleSize(12);
const FALLBACK_PANEL_HEIGHT = scaleSize(286);
const ANCHOR_GAP = scaleSize(8);

const ITEM = ({ color, letter, label, onPress }) => (
  <RNBounceable onPress={withStrongPress(onPress)} style={styles.itemRow} activeOpacity={0.7}>
    <View style={[styles.letterBadge, { backgroundColor: color }]}>
      <Text style={styles.letterText}>{letter}</Text>
    </View>
    <Text style={styles.itemLabel}>{label}</Text>
  </RNBounceable>
);

function SetTypePanel({ visible, onClose, position, current, onSelect }) {
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [panelHeight, setPanelHeight] = useState(0);
  const insets = useStableSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 110, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.96);
    }
  }, [visible]);

  const onPanelLayout = useCallback((event) => {
    const nextHeight = event?.nativeEvent?.layout?.height;
    if (typeof nextHeight !== "number" || nextHeight <= 0) return;
    if (Math.abs(nextHeight - panelHeight) > 1) setPanelHeight(nextHeight);
  }, [panelHeight]);

  const safeLeft = useMemo(() => {
    const desiredLeft = typeof position?.left === "number" ? position.left : EDGE_GAP;
    const minLeft = EDGE_GAP + (insets.left || 0);
    const maxLeft = screenWidth - PANEL_WIDTH - EDGE_GAP - (insets.right || 0);
    const clampedMax = Math.max(minLeft, maxLeft);
    return Math.min(Math.max(minLeft, desiredLeft), clampedMax);
  }, [insets.left, insets.right, position?.left, screenWidth]);

  const { safeTop, openAbove } = useMemo(() => {
    const effectivePanelHeight = panelHeight > 0 ? panelHeight : FALLBACK_PANEL_HEIGHT;
    const minTop = EDGE_GAP + (insets.top || 0);
    const maxTop = screenHeight - effectivePanelHeight - EDGE_GAP - (insets.bottom || 0);
    const clampedMax = Math.max(minTop, maxTop);

    const anchorTop = typeof position?.anchorTop === "number" ? position.anchorTop : null;
    const anchorBottom = typeof position?.anchorBottom === "number" ? position.anchorBottom : null;
    const hasAnchor = anchorTop != null && anchorBottom != null;

    if (hasAnchor) {
      const belowTop = anchorBottom + ANCHOR_GAP;
      const aboveTop = anchorTop - ANCHOR_GAP - effectivePanelHeight;
      const shouldOpenAbove = belowTop > clampedMax && aboveTop >= minTop;
      const desiredTop = shouldOpenAbove ? aboveTop : belowTop;
      return {
        safeTop: Math.min(Math.max(minTop, desiredTop), clampedMax),
        openAbove: shouldOpenAbove,
      };
    }

    const desiredTop = typeof position?.top === "number" ? position.top : minTop;
    return {
      safeTop: Math.min(Math.max(minTop, desiredTop), clampedMax),
      openAbove: false,
    };
  }, [insets.bottom, insets.top, panelHeight, position?.anchorBottom, position?.anchorTop, position?.top, screenHeight]);

  const caretLeft = useMemo(() => {
    const anchorX = typeof position?.anchorX === "number" ? position.anchorX : null;
    if (anchorX == null) return scaleSize(18);

    const caretSize = scaleSize(14);
    const minCaretLeft = scaleSize(12);
    const maxCaretLeft = PANEL_WIDTH - scaleSize(24);
    const rawLeft = anchorX - safeLeft - (caretSize / 2);
    return Math.min(maxCaretLeft, Math.max(minCaretLeft, rawLeft));
  }, [position?.anchorX, safeLeft]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={withStrongPress(onClose)}>
        <Animated.View
          onLayout={onPanelLayout}
          style={[styles.panel, { top: safeTop, left: safeLeft, width: PANEL_WIDTH, transform: [{ scale }], opacity }]}
        >
          <View style={[styles.caret, openAbove ? styles.caretBottom : styles.caretTop, { left: caretLeft }]} />

          <Text style={styles.header}>Set type</Text>

          <ITEM color="#FB923C" letter="W" label="Warm up" onPress={() => { onSelect?.("warmup"); onClose?.(); }} />
          <ITEM color="#A855F7" letter="D" label="Drop set" onPress={() => { onSelect?.("dropset"); onClose?.(); }} />
          <ITEM color="#F43F5E" letter="F" label="Failure" onPress={() => { onSelect?.("failure"); onClose?.(); }} />
          <ITEM color="#0EA5E9" letter="L" label="Left" onPress={() => { onSelect?.("left"); onClose?.(); }} />
          <ITEM color="#34D399" letter="R" label="Right" onPress={() => { onSelect?.("right"); onClose?.(); }} />
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const areEqual = (prev, next) => {
  return (
    prev.visible === next.visible &&
    prev.current === next.current &&
    prev.onClose === next.onClose &&
    prev.onSelect === next.onSelect &&
    (prev.position?.top || 0) === (next.position?.top || 0) &&
    (prev.position?.left || 0) === (next.position?.left || 0) &&
    (prev.position?.anchorX || 0) === (next.position?.anchorX || 0) &&
    (prev.position?.anchorTop || 0) === (next.position?.anchorTop || 0) &&
    (prev.position?.anchorBottom || 0) === (next.position?.anchorBottom || 0)
  );
};

export default memo(SetTypePanel, areEqual);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  panel: {
    position: "absolute",
    borderRadius: scaleSize(18),
    backgroundColor: theme.surface,
    paddingVertical: scaleSize(10),
    paddingHorizontal: scaleSize(10),
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: scaleSize(18),
    shadowOffset: { width: 0, height: scaleSize(10) },
    elevation: 8,
  },
  caret: {
    position: "absolute",
    width: scaleSize(14),
    height: scaleSize(14),
    backgroundColor: theme.surface,
    transform: [{ rotate: "45deg" }],
  },
  caretTop: { top: scaleSize(-7) },
  caretBottom: { bottom: scaleSize(-7) },
  header: { color: theme.textSecondary, fontFamily: "Outfit_600SemiBold", fontSize: scaleSize(11.5), paddingHorizontal: scaleSize(6), paddingBottom: scaleSize(8) },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSize(12),
    paddingHorizontal: scaleSize(8),
    paddingVertical: scaleSize(10),
    borderRadius: scaleSize(12),
  },
  letterBadge: { width: scaleSize(24), height: scaleSize(24), borderRadius: scaleSize(6), alignItems: "center", justifyContent: "center" },
  letterText: { color: "#FFFFFF", fontFamily: "Outfit_700Bold", fontSize: scaleSize(10.5) },
  itemLabel: { color: theme.textPrimary, fontFamily: "Outfit_700Bold", fontSize: scaleSize(13) },
  separator: { height: scaleSize(1), backgroundColor: theme.hairline, marginHorizontal: scaleSize(8), marginVertical: scaleSize(4), borderRadius: scaleSize(1) },
});
