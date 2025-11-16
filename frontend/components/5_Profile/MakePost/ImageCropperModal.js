import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Modal, View, StyleSheet, Dimensions, TouchableOpacity, Text, Image as RNImage } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ZoomCropper from './ZoomCropper';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import scaleSize from '../../../helper/scaleSize';
import { withStrongPress } from "../../../utils/haptics";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function ImageCropperModal({
  visible,
  uri,
  aspectRatio = 1, // width / height; default to square crop
  onCancel,
  onDone,
  anchorTop,
  headerOffset,
  mediaType = 'image',
}) {
  const [imgSize, setImgSize] = useState(null); // { w, h }
  const [roiTop, setRoiTop] = useState(0); // visual offset to place frame lower on screen

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

  const minScale = useMemo(() => {
    if (!cover || !cover.dw0 || !cover.dh0) return 1;
    const containScale = Math.min(cw / cover.dw0, ch / cover.dh0);
    return Math.min(1, containScale);
  }, [cover, cw, ch]);

  // Read transform from ZoomCropper
  const cropperRef = useRef(null);

  // ImageZoom handles gestures; we track its transform via onMove

  const doCrop = async () => {
    if (!imgSize || !uri) { onCancel?.(); return; }
    // Current display dims
    const tf = cropperRef.current?.getTransform?.() || { x: 0, y: 0, scale: 1 };
    const z = tf.scale || 1;
    const dw = cover.dw0 * z;
    const dh = cover.dh0 * z;

    // Image top-left in crop-box coordinates
    const sumX = tf.x || 0;
    const sumY = tf.y || 0;
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

    const normalizedRect = {
      x: originX / imgSize.w,
      y: originY / imgSize.h,
      width: width / imgSize.w,
      height: height / imgSize.h,
    };

    if (mediaType === 'video') {
      onDone?.({ cropRect: normalizedRect, mode: 'video' });
      return;
    }

    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX, originY, width, height } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      onDone?.({ uri: result?.uri || uri, cropRect: normalizedRect, mode: 'image' });
    } catch (e) {
      onDone?.({ uri, cropRect: normalizedRect, mode: 'image' });
    }
  };

  useEffect(() => {
    if (!visible) return;
    if (typeof anchorTop === 'number' && Number.isFinite(anchorTop)) {
      setRoiTop(anchorTop);
    }
  }, [visible, anchorTop]);

  const headerTop = useMemo(() => {
    if (typeof headerOffset === 'number' && Number.isFinite(headerOffset)) {
      return Math.max(0, headerOffset);
    }
    if (typeof anchorTop === 'number' && Number.isFinite(anchorTop)) {
      return Math.max(scaleSize(32), anchorTop - scaleSize(54));
    }
    return scaleSize(48);
  }, [headerOffset, anchorTop]);

  return (
    <Modal visible={!!visible} animationType="slide" transparent onRequestClose={onCancel}>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.backdrop} />
        <View
          style={[styles.header, { top: headerTop - scaleSize(6) }]}
          pointerEvents="box-none"
          onLayout={(e) => {
            const { y = 0, height = 0 } = e?.nativeEvent?.layout || {};
            // place ROI just below header
            if (typeof anchorTop === 'number' && Number.isFinite(anchorTop)) {
              setRoiTop(anchorTop);
              return;
            }
            const top = Math.max(0, y + height + scaleSize(18));
            setRoiTop(top);
          }}
        >
          <TouchableOpacity onPress={withStrongPress(onCancel)} style={styles.headerBtn}>
            <Ionicons name="close" size={22} color="#fff" />
            <Text style={styles.headerBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={withStrongPress(doCrop)} style={styles.headerBtn}>
            <Ionicons name="checkmark" size={22} color="#fff" />
            <Text style={styles.headerBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
        {/* Crop frame physically below header; ZoomCropper handles gestures locally */}
        <View style={[styles.cropBox, { width: cw, height: ch, left: 0, top: roiTop }]}>
          {uri && imgSize && (
            <ZoomCropper
              ref={cropperRef}
              uri={uri}
              width={cw}
              height={ch}
              baseWidth={cover.dw0}
              baseHeight={cover.dh0}
              minScale={minScale}
            />
          )}
        </View>

        {/* Mask out area above/below ROI so the frame appears lower while keeping math correct */}
        <View style={[styles.blockMask, { top: 0, height: scaleSize(Math.max(0, roiTop)) }]} />
        <View style={[styles.blockMask, { top: scaleSize(roiTop + ch), height: scaleSize(Math.max(0, SCREEN_H - (roiTop + ch))) }]} />
        <View pointerEvents="none" style={[styles.frameOutline, { top: roiTop, width: cw, height: ch }]} />
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)' },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: scaleSize(8),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: scaleSize(12),
    paddingVertical: scaleSize(8),
    borderRadius: scaleSize(12),
  },
  headerBtnText: { color: '#fff', marginLeft: scaleSize(6), fontSize: scaleSize(14) },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cropBox: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameOutline: {
    position: 'absolute',
    left: 0,
    borderColor: '#ffffff',
    borderWidth: scaleSize(1),
  },
  image: {
    // width/height are set dynamically via animated style
  },
});
