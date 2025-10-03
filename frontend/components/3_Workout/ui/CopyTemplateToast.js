import React from "react";
import { Animated, View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ss } from "../sections/workoutTheme";

import scaleSize from "../../../helper/scaleSize";

export default function CopyTemplateToast({ anim, text = "Template added" }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      <View style={styles.toastInner}>
        <MaterialCommunityIcons name="check-circle" size={ss(16)} color="#fff" style={{ marginRight: ss(8) }} />
        <Animated.Text style={styles.toastText}>{text}</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastInner: {
    paddingHorizontal: ss(14),
    paddingVertical: ss(10),
    borderRadius: ss(999),
    backgroundColor: "rgba(15,23,42,0.92)",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: scaleSize(12),
    shadowOffset: { width: 0, height: scaleSize(6) },
    elevation: 6,
  },
  toastText: { color: "#fff", fontFamily: "Outfit_700Bold", fontSize: ss(12.5) },
});

