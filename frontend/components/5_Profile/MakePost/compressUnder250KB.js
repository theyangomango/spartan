import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Image, Platform } from 'react-native';

const getImageSize = async (uri) => {
  try {
    return await new Promise((resolve, reject) =>
      Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
    );
  } catch {
    return { width: null, height: null };
  }
};

const ensureFileUri = async (uri, format, quality) => {
  if (uri.startsWith('file://')) return uri;
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [],
      { compress: quality, format }
    );
    if (typeof result?.uri === 'string') {
      return result.uri;
    }
  } catch {}
  return uri;
};

// Fast, predictable two-pass compression to keep uploads tiny without clogging the JS thread.
export async function compressUnder250KB(uri, opts = {}) {
  if (!uri) return uri;

  const {
    targetKB = 800,          // aim for sub-megabyte payloads for quicker uploads
    maxDimension = 1440,     // primary long-edge cap for the first pass
    fallbackDimension = 960, // secondary cap if we still exceed target size
    primaryQuality = 0.82,
    fallbackQuality = 0.72,
    minEdge = 640,
  } = opts || {};

  const targetBytes = Math.max(1, Math.round(targetKB * 1024));
  const format = Platform.OS === 'android'
    ? ImageManipulator.SaveFormat.WEBP
    : ImageManipulator.SaveFormat.JPEG;

  // If we already have a small local asset, skip work altogether.
  if (uri.startsWith('file://')) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info?.exists && info.size && info.size <= targetBytes) {
        return uri;
      }
    } catch {}
  }

  const { width, height } = await getImageSize(uri);
  const longEdge = width && height ? Math.max(width, height) : null;

  const firstTarget = longEdge
    ? Math.max(minEdge, Math.min(longEdge, maxDimension))
    : maxDimension;
  const firstActions = [];
  if (width && height && longEdge > firstTarget + 1) {
    if (width >= height) firstActions.push({ resize: { width: firstTarget } });
    else firstActions.push({ resize: { height: firstTarget } });
  } else if (!uri.startsWith('file://')) {
    // Without dimensions we still trigger a pass to guarantee a writable asset.
    firstActions.push({ resize: { width: firstTarget } });
  }

  try {
    const primary = await ImageManipulator.manipulateAsync(
      uri,
      firstActions,
      { compress: primaryQuality, format }
    );
    if (primary?.uri) {
      const info = await FileSystem.getInfoAsync(primary.uri).catch(() => null);
      const smallEnough = info?.size && info.size <= targetBytes;
      if (smallEnough || info?.size === undefined) {
        return primary.uri;
      }

      // Second attempt: more aggressive resize & quality drop.
      const secondActions = [];
      const fallbackEdge = width && height
        ? Math.max(minEdge, Math.min(Math.max(width, height), fallbackDimension))
        : fallbackDimension;

      if (width && height && Math.max(width, height) > fallbackEdge + 1) {
        if (width >= height) secondActions.push({ resize: { width: fallbackEdge } });
        else secondActions.push({ resize: { height: fallbackEdge } });
      } else if (!primary.uri.startsWith('file://')) {
        secondActions.push({ resize: { width: fallbackEdge } });
      }

      try {
        const fallback = await ImageManipulator.manipulateAsync(
          primary.uri,
          secondActions,
          { compress: fallbackQuality, format }
        );
        if (fallback?.uri) {
          const fallbackInfo = await FileSystem.getInfoAsync(fallback.uri).catch(() => null);
          if (fallbackInfo?.size && fallbackInfo.size <= targetBytes) {
            return fallback.uri;
          }
          return fallback.uri;
        }
      } catch {
        return primary.uri;
      }

      return primary.uri;
    }
  } catch {
    // fall through to ensure file URI
  }

  return ensureFileUri(uri, format, fallbackQuality);
}
