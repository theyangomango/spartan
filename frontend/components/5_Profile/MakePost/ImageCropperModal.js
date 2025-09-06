import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, StyleSheet, Dimensions, TouchableOpacity, Text, Image as RNImage } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function ImageCropperModal({
  visible,
  uri,
  aspectRatio = 0.8, // width / height, same as feed
  onCancel,
  onDone,
}) {
  const [imgSize, setImgSize] = useState(null); // { w, h }

  const cw = SCREEN_W; // crop box width
  const ch = Math.round(SCREEN_W / aspectRatio); // crop box height

  useEffect(() => {
    if (!visible || !uri) return;
    let mounted = true;
    RNImage.getSize(
      uri,
      (w, h) => { if (mounted) setImgSize({ w, h }); },
      () => { if (mounted) setImgSize(null); }
    );
    return () => { mounted = false; };
  }, [visible, uri]);

  // Scale to cover the crop box initially
  const cover = useMemo(() => {
    if (!imgSize) return { scale: 1, dw0: cw, dh0: ch };
    const { w, h } = imgSize;
    const scaleToCover = Math.max(cw / w, ch / h); // dp/px
    const dw0 = w * scaleToCover; // dp
    const dh0 = h * scaleToCover; // dp
    return { scale: scaleToCover, dw0, dh0 };
  }, [imgSize, cw, ch]);

  const zoom = useSharedValue(1); // additional zoom factor (>= 1)
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const baseDW = useSharedValue(0); // base displayed width (cover)
  const baseDH = useSharedValue(0); // base displayed height (cover)

  // Reset transforms when opening/uri changes
  useEffect(() => {
    if (visible) {
      zoom.value = 1;
      tx.value = 0;
      ty.value = 0;
    }
  }, [visible, uri]);

  // Sync base dimensions to shared values for use in worklets
  useEffect(() => {
    baseDW.value = cover.dw0 || 0;
    baseDH.value = cover.dh0 || 0;
  }, [cover.dw0, cover.dh0]);

  // Clamp translation so image always covers crop area
  const clampTranslate = (nextTx, nextTy, z) => {
    const dw = cover.dw0 * z;
    const dh = cover.dh0 * z;
    const maxTx = Math.max(0, (dw - cw) / 2);
    const maxTy = Math.max(0, (dh - ch) / 2);
    const clampedX = Math.min(maxTx, Math.max(-maxTx, nextTx));
    const clampedY = Math.min(maxTy, Math.max(-maxTy, nextTy));
    return [clampedX, clampedY];
  };

  const pan = useMemo(() => {
    return Gesture.Pan().onChange((e) => {
      // worklet
      const z = zoom.value;
      const dw = baseDW.value * z;
      const dh = baseDH.value * z;
      if (dw === 0 || dh === 0) return;
      const maxTx = Math.max(0, (dw - cw) / 2);
      const maxTy = Math.max(0, (dh - ch) / 2);
      let nx = tx.value + e.changeX;
      let ny = ty.value + e.changeY;
      nx = Math.min(maxTx, Math.max(-maxTx, nx));
      ny = Math.min(maxTy, Math.max(-maxTy, ny));
      tx.value = nx;
      ty.value = ny;
    });
  }, [cw, ch]);

  const pinch = useMemo(() => {
    let startZoom = 1;
    return Gesture.Pinch()
      .onBegin(() => { startZoom = zoom.value; })
      .onUpdate((e) => {
        // worklet
        const dw0 = baseDW.value;
        const dh0 = baseDH.value;
        if (dw0 === 0 || dh0 === 0) return;

        // Clamp zoom between 1x and 6x
        const nextZoom = Math.max(1, Math.min(6, startZoom * (e.scale || 1)));

        // Keep focal point under fingers relative to crop center
        const cx = cw / 2; const cy = ch / 2;
        const s0 = startZoom;
        const s1 = nextZoom;
        const dx = tx.value; const dy = ty.value;
        const fx = e.focalX; const fy = e.focalY;
        let nx = (dx - (fx - cx)) * (s1 / s0) + (fx - cx);
        let ny = (dy - (fy - cy)) * (s1 / s0) + (fy - cy);

        // Clamp translation with new scale
        const dw = dw0 * s1;
        const dh = dh0 * s1;
        const maxTx = Math.max(0, (dw - cw) / 2);
        const maxTy = Math.max(0, (dh - ch) / 2);
        nx = Math.min(maxTx, Math.max(-maxTx, nx));
        ny = Math.min(maxTy, Math.max(-maxTy, ny));

        zoom.value = nextZoom;
        tx.value = nx; ty.value = ny;
      });
  }, [cw, ch]);

  const composed = useMemo(() => Gesture.Simultaneous(pan, pinch), [pan, pinch]);

  const imageStyle = useAnimatedStyle(() => {
    return {
      width: baseDW.value,
      height: baseDH.value,
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { scale: zoom.value },
      ],
    };
  });

  const doCrop = async () => {
    if (!imgSize || !uri) { onCancel?.(); return; }
    // Current display dims
    const z = zoom.value;
    const dw = cover.dw0 * z;
    const dh = cover.dh0 * z;

    // Image top-left in crop-box coordinates
    const imgLeft = (cw / 2) + tx.value - (dw / 2);
    const imgTop = (ch / 2) + ty.value - (dh / 2);

    // Convert crop rectangle from dp to image px via (cover.scale * z)
    const s = cover.scale * z; // dp per px

    let originX = (-imgLeft) / s;
    let originY = (-imgTop) / s;
    let width = cw / s;
    let height = ch / s;

    // Clamp to image bounds
    originX = Math.max(0, Math.min(imgSize.w - 1, originX));
    originY = Math.max(0, Math.min(imgSize.h - 1, originY));
    width = Math.min(imgSize.w - originX, width);
    height = Math.min(imgSize.h - originY, height);

    // Round to integers as manipulator expects ints
    originX = Math.round(originX);
    originY = Math.round(originY);
    width = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));

    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX, originY, width, height } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      onDone?.(result?.uri || uri);
    } catch (e) {
      onDone?.(uri);
    }
  };

  return (
    <Modal visible={!!visible} animationType="slide" transparent onRequestClose={onCancel}>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.backdrop} />
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={22} color="#fff" />
            <Text style={styles.headerBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={doCrop} style={styles.headerBtn}>
            <Ionicons name="checkmark" size={22} color="#fff" />
            <Text style={styles.headerBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <View style={[styles.cropBox, { width: cw, height: ch }]}>
            {uri && imgSize && (
              <GestureDetector gesture={composed}>
                <Animated.Image
                  source={{ uri }}
                  style={[styles.image, imageStyle]}
                  resizeMode="cover"
                />
              </GestureDetector>
            )}
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)' },
  header: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  headerBtnText: { color: '#fff', marginLeft: 6, fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cropBox: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#000',
  },
  image: {
    // width/height are set dynamically via animated style
  },
});
