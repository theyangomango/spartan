import React, { useMemo, forwardRef, useImperativeHandle } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

// Minimal, robust pinch + pan with focal anchoring.
// Transform pipeline matches react-native-awesome-gallery (translate = offset + translation; then scale).

const ZoomCropper = forwardRef(function ZoomCropper({ uri, width, height, baseWidth, baseHeight }, ref) {
  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0); // pan accumulation
  const offsetY = useSharedValue(0);
  const transX = useSharedValue(0);  // pinch translation (relative)
  const transY = useSharedValue(0);
  const scaleOffset = useSharedValue(1);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const adjFocalX = useSharedValue(0);
  const adjFocalY = useSharedValue(0);

  // Smoothing constants
  const SCALE_ALPHA = 0.22; // how fast scale follows the finger
  const FOCAL_ALPHA = 0.25; // smoothing for focal movement
  const TRANS_ALPHA = 0.28; // smoothing for pinch-derived translation

  // Utils inside worklets
  const setAdjustedFocal = (focalX, focalY) => {
    'worklet';
    // Convert to container-centered space and subtract current translation
    const targetX = (focalX || 0) - width / 2 - (offsetX.value + transX.value);
    const targetY = (focalY || 0) - height / 2 - (offsetY.value + transY.value);
    // Low-pass filter the focal point to avoid micro jitter
    adjFocalX.value = adjFocalX.value + FOCAL_ALPHA * (targetX - adjFocalX.value);
    adjFocalY.value = adjFocalY.value + FOCAL_ALPHA * (targetY - adjFocalY.value);
  };

  const clamp = (v, min, max) => {
    'worklet';
    return Math.min(max, Math.max(min, v));
  };

  const pan = useMemo(() => (
    Gesture.Pan()
      .maxPointers(1)
      .minDistance(1)
      .onChange((e) => {
        'worklet';
        if (scale.value <= 1) return; // disable pan at base scale
        if ((e.numberOfPointers || 0) !== 1) return; // only 1 finger pans
        const sc = scale.value;
        const newW = baseWidth * sc;
        const newH = baseHeight * sc;
        const eps = 0.5;
        const maxX = Math.max(0, (newW - width) / 2 - eps);
        const maxY = Math.max(0, (newH - height) / 2 - eps);
        const sx = offsetX.value + transX.value + (e.changeX || 0);
        const sy = offsetY.value + transY.value + (e.changeY || 0);
        const cx = clamp(sx, -maxX, maxX) - transX.value;
        const cy = clamp(sy, -maxY, maxY) - transY.value;
        offsetX.value = cx;
        offsetY.value = cy;
      })
      .onEnd(() => {
        'worklet';
        // ensure in-bounds after fling
        const sc = scale.value;
        const newW = baseWidth * sc;
        const newH = baseHeight * sc;
        const eps = 0.5;
        const maxX = Math.max(0, (newW - width) / 2 - eps);
        const maxY = Math.max(0, (newH - height) / 2 - eps);
        const sx = offsetX.value + transX.value;
        const sy = offsetY.value + transY.value;
        const cx = clamp(sx, -maxX, maxX) - transX.value;
        const cy = clamp(sy, -maxY, maxY) - transY.value;
        offsetX.value = cx;
        offsetY.value = cy;
      })
  ), [width, height, baseWidth, baseHeight]);

  const pinch = useMemo(() => (
    Gesture.Pinch()
      .onBegin((e) => {
        'worklet';
        scaleOffset.value = scale.value;
        // Initialize focal exactly on begin to avoid initial lag
        adjFocalX.value = (e.focalX || 0) - width / 2 - (offsetX.value + transX.value);
        adjFocalY.value = (e.focalY || 0) - height / 2 - (offsetY.value + transY.value);
        originX.value = adjFocalX.value;
        originY.value = adjFocalY.value;
      })
      .onUpdate((e) => {
        'worklet';
        if ((e.numberOfPointers || 0) < 2) return; // guard older RNGH without minPointers
        const raw = (e.scale || 1) * scaleOffset.value;
        const clamped = Math.max(1, Math.min(6, raw));
        // Low-pass filter scale for buttery feel
        const ns = scale.value + SCALE_ALPHA * (clamped - scale.value);
        scale.value = ns;
        setAdjustedFocal((e.focalX || 0), (e.focalY || 0));
        // Keep point under fingers stable; ease towards target translation
        const txTarget = adjFocalX.value + -1 * (ns / scaleOffset.value) * originX.value;
        const tyTarget = adjFocalY.value + -1 * (ns / scaleOffset.value) * originY.value;
        transX.value = transX.value + TRANS_ALPHA * (txTarget - transX.value);
        transY.value = transY.value + TRANS_ALPHA * (tyTarget - transY.value);

        // Clamp combined translation
        const newW = baseWidth * ns;
        const newH = baseHeight * ns;
        const eps = 0.5;
        const maxX = Math.max(0, (newW - width) / 2 - eps);
        const maxY = Math.max(0, (newH - height) / 2 - eps);
        const sx = offsetX.value + transX.value;
        const sy = offsetY.value + transY.value;
        if (sx < -maxX) transX.value = -maxX - offsetX.value;
        if (sx > maxX)  transX.value =  maxX - offsetX.value;
        if (sy < -maxY) transY.value = -maxY - offsetY.value;
        if (sy > maxY)  transY.value =  maxY - offsetY.value;
      })
  ), [width, height, baseWidth, baseHeight]);

  // Allow both; pointer gating ensures correct activation (1 vs 2 fingers)
  const composed = useMemo(() => Gesture.Simultaneous(pan, pinch), [pan, pinch]);

  const style = useAnimatedStyle(() => ({
    width: baseWidth,
    height: baseHeight,
    transform: [
      { translateX: offsetX.value + transX.value },
      { translateY: offsetY.value + transY.value },
      { scale: scale.value },
    ],
  }));

  useImperativeHandle(ref, () => ({
    getTransform: () => ({ x: offsetX.value + transX.value, y: offsetY.value + transY.value, scale: scale.value })
  }), []);

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={{ width, height, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Animated.Image source={{ uri }} style={style} resizeMode="cover" />
      </Animated.View>
    </GestureDetector>
  );
});

export default ZoomCropper;
