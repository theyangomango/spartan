import React, { useEffect, useRef } from "react";
import { Modal, View, Pressable, Animated, StyleSheet, Dimensions } from "react-native";
import FastImage from "react-native-fast-image";
import Video from "react-native-video";

const { width: SW, height: SH } = Dimensions.get("window");

export default function MediaViewerModal({ visible, payload, onClose }) {
  const { uri, type = "image", anchor } = payload || {};
  const anim = useRef(new Animated.Value(0)).current; // 0..1

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    }
  }, [visible]);

  if (!visible) return null;

  // Interpolate from anchor rect to full screen
  const start = anchor || { x: SW * 0.5 - 80, y: SH * 0.5 - 80, width: 160, height: 160 };
  const left = anim.interpolate({ inputRange: [0, 1], outputRange: [start.x, 0] });
  const top = anim.interpolate({ inputRange: [0, 1], outputRange: [start.y, 0] });
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: [start.width, SW] });
  const height = anim.interpolate({ inputRange: [0, 1], outputRange: [start.height, SH] });
  const radius = anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const dim = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const close = () => {
    Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: false }).start(() => onClose?.());
  };

  return (
    <Modal transparent visible>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.7)", opacity: dim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View style={[styles.box, { left, top, width, height, borderRadius: radius }]}>
        {type === "video" ? (
          <Video source={{ uri }} style={StyleSheet.absoluteFill} controls resizeMode="contain" />
        ) : (
          <FastImage source={{ uri }} style={StyleSheet.absoluteFill} resizeMode={FastImage.resizeMode.contain} />
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  box: { position: "absolute", overflow: "hidden", backgroundColor: "#000" },
});
