import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Modal, View, StyleSheet, Dimensions, TouchableOpacity, Text, Image as RNImage } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ImageZoom from 'react-native-image-pan-zoom';
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

  // Track transform from ImageZoom
  const posRef = useRef({ x: 0, y: 0, scale: 1 });

  // No reanimated math; ImageZoom handles gestures

  const doCrop = async () => {
    if (!imgSize || !uri) { onCancel?.(); return; }
    // Current display dims
    const z = posRef.current.scale || 1;
    const dw = cover.dw0 * z;
    const dh = cover.dh0 * z;

    // Image top-left in crop-box coordinates
    const sumX = posRef.current.x || 0;
    const sumY = posRef.current.y || 0;
    const imgLeft = (cw / 2) + sumX - (dw / 2);
    const imgTop = (ch / 2) + sumY - (dh / 2);

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
              <ImageZoom
                style={{ backgroundColor: 'black' }}
                cropWidth={cw}
                cropHeight={ch}
                imageWidth={cover.dw0}
                imageHeight={cover.dh0}
                enableDoubleClickZoom
                enableCenterFocus={false}
                useNativeDriver
                onMoveShouldSetPanResponder={(evt, gestureState) => {
                  const t = (gestureState && gestureState.numberActiveTouches) || (evt?.nativeEvent?.touches?.length) || (evt?.nativeEvent?.changedTouches?.length) || 0;
                  if (t >= 2) return true; // claim responder for pinch when two fingers present
                  // allow single-finger pan when already zoomed
                  const sc = posRef.current?.scale || 1;
                  return sc > 1 && (Math.abs(gestureState?.dx || 0) > 2 || Math.abs(gestureState?.dy || 0) > 2);
                }}
                onMove={({ positionX = 0, positionY = 0, scale = 1 }) => {
                  posRef.current = { x: positionX, y: positionY, scale };
                }}
                pinchToZoom
                minScale={1}
                maxScale={6}
              >
                <RNImage source={{ uri }} style={{ width: cover.dw0, height: cover.dh0 }} resizeMode="cover" />
              </ImageZoom>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    // width/height are set dynamically via animated style
  },
});
