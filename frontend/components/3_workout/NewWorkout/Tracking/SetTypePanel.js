import React, { useEffect, useRef, memo } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from "react-native";
import RNBounceable from "@freakycoder/react-native-bounceable";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const ITEM = ({ color, letter, label, onPress }) => (
  <RNBounceable onPress={onPress} style={styles.itemRow} activeOpacity={0.7}>
    <View style={[styles.letterBadge, { backgroundColor: color }]}>
      <Text style={styles.letterText}>{letter}</Text>
    </View>
    <Text style={styles.itemLabel}>{label}</Text>
  </RNBounceable>
);

function SetTypePanel({ visible, onClose, position, current, onSelect }) {
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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

  const panelWidth = 260;
  const safeLeft = Math.min(Math.max(12, position?.left ?? 12), screenWidth - panelWidth - 12);
  const safeTop = Math.min(Math.max(120, position?.top ?? 120), screenHeight - 220);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View style={[styles.panel, { top: safeTop, left: safeLeft, width: panelWidth, transform: [{ scale }], opacity }]}>
          <View style={styles.caret} />

          <Text style={styles.header}>Set type</Text>

          <ITEM color="#FDBA74" letter="W" label="Warm up" onPress={() => { onSelect?.("warmup"); onClose?.(); }} />
          <ITEM color="#C084FC" letter="D" label="Drop set" onPress={() => { onSelect?.("dropset"); onClose?.(); }} />
          <ITEM color="#F87171" letter="F" label="Failure" onPress={() => { onSelect?.("failure"); onClose?.(); }} />
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
    (prev.position?.left || 0) === (next.position?.left || 0)
  );
};

export default memo(SetTypePanel, areEqual);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(2,6,23,0.35)" },
  panel: {
    position: "absolute",
    borderRadius: 18,
    backgroundColor: "#0F172A",
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  caret: {
    position: "absolute",
    top: -7,
    left: 18,
    width: 14,
    height: 14,
    backgroundColor: "#0F172A",
    transform: [{ rotate: "45deg" }],
  },
  header: { color: "#CBD5E1", fontFamily: "Outfit_600SemiBold", fontSize: 13, paddingHorizontal: 6, paddingBottom: 8 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  letterBadge: { width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  letterText: { color: "#0F172A", fontFamily: "Outfit_700Bold", fontSize: 12 },
  itemLabel: { color: "#F8FAFC", fontFamily: "Outfit_700Bold", fontSize: 15 },
  separator: { height: 1, backgroundColor: "rgba(203,213,225,0.18)", marginHorizontal: 8, marginVertical: 4, borderRadius: 1 },
});
