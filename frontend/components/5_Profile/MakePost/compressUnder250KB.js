import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Image, Platform } from 'react-native';

// Smart compression that preserves visible quality while keeping size reasonable.
// Defaults: ~1.5MB target, max long-edge 2560px, quality 0.95→0.85.
export async function compressUnder250KB(uri, opts = {}) {
  const {
    targetKB = 1500,       // aim for ~1.5 MB by default
    maxDimension = 2560,   // cap the longest edge to avoid oversized uploads
    initialQuality = 0.95,
    minQuality = 0.85,
    qualityStep = 0.03,
  } = opts || {};

  // Do not early-return the original URI because it might be non-file (e.g., ph:// on iOS).
  // Always generate a writable file:// output via ImageManipulator.

  // 2) Determine original dimensions to avoid accidental upscaling
  let origW = null, origH = null;
  try {
    const size = await new Promise((resolve, reject) =>
      Image.getSize(uri, (w, h) => resolve({ w, h }), reject)
    );
    origW = size.w; origH = size.h;
  } catch {}

  // 3) Decide resize action: cap the long edge to `maxDimension` without upscaling
  let actions = [];
  if (origW && origH) {
    const longEdge = Math.max(origW, origH);
    if (longEdge > maxDimension) {
      if (origW >= origH) actions.push({ resize: { width: maxDimension } });
      else actions.push({ resize: { height: maxDimension } });
    }
  }

  // 4) Choose best available format: WEBP on Android, JPEG elsewhere
  const format = Platform.OS === 'android'
    ? ImageManipulator.SaveFormat.WEBP
    : ImageManipulator.SaveFormat.JPEG;

  // 5) Iteratively compress; prefer keeping resolution, gently drop quality
  let quality = initialQuality;
  let lastOut = uri;

  for (let pass = 0; pass < 5; pass++) {
    const { uri: out } = await ImageManipulator.manipulateAsync(
      lastOut,
      actions,
      { compress: quality, format }
    );
    lastOut = out;

    try {
      const info = await FileSystem.getInfoAsync(out);
      const kb = info?.size ? info.size / 1024 : null;
      if (!kb || kb <= targetKB) return out;
    } catch {
      // If we can't read size reliably, return best-effort result
      return out;
    }

    // Reduce quality first until minQuality; then slightly reduce dimensions
    if (quality > minQuality + 1e-6) {
      quality = Math.max(minQuality, quality - qualityStep);
    } else if (actions.length) {
      // Shrink current resize target by ~15% increments if still too large
      const r = actions[0].resize;
      if (r.width) r.width = Math.max(640, Math.round(r.width * 0.85));
      if (r.height) r.height = Math.max(640, Math.round(r.height * 0.85));
    } else if (origW && origH) {
      // Begin resizing if we didn't before
      const longEdge = Math.max(origW, origH);
      const next = Math.max(640, Math.round(longEdge * 0.9));
      if (origW >= origH) actions = [{ resize: { width: next } }];
      else actions = [{ resize: { height: next } }];
    } else {
      // Last resort: nudge quality a bit lower, but not below 0.7
      quality = Math.max(0.7, quality - qualityStep);
    }
  }

  return lastOut; // best-effort after passes
}
