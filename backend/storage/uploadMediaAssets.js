// backend/storage/uploadMediaAssets.js
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase.config";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

const GLOBAL_OBJ =
    typeof globalThis !== "undefined"
        ? globalThis
        : typeof global !== "undefined"
        ? global
        : typeof window !== "undefined"
        ? window
        : {};

const FETCHABLE_SCHEMES = ["file://", "content://", "http://", "https://"];
const DEFAULTS = {
    imageExt: "jpg",
    videoExt: "mp4",
    imageMime: "image/jpeg",
    videoMime: "video/mp4",
};
const LOSSY_IMAGE_EXTS = new Set(["heic", "heif", "heics", "heifs", "hevc"]);
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_COMPRESS_QUALITY = 0.82;

const sanitizeAssets = (assets) =>
    Array.isArray(assets) ? assets.filter((item) => item && (item.uri || item.assetId || item.id)) : [];

const isFetchableUri = (uri = "") => {
    if (typeof uri !== "string" || !uri) return false;
    return FETCHABLE_SCHEMES.some((scheme) => uri.startsWith(scheme));
};

const extFromUri = (uri = "") => {
    if (typeof uri !== "string" || !uri) return "";
    const q = uri.split("?")[0];
    const dot = q.lastIndexOf(".");
    return dot > -1 ? q.slice(dot + 1).toLowerCase() : "";
};

let mediaPermissionsEnsured = false;
async function ensureMediaPermissions() {
    if (mediaPermissionsEnsured) return;
    try {
        const current = await MediaLibrary.getPermissionsAsync();
        if (current.status !== "granted" && current.canAskAgain) {
            await MediaLibrary.requestPermissionsAsync();
        }
    } catch {
        // ignore permission failures; file reads might still succeed
    } finally {
        mediaPermissionsEnsured = true;
    }
}

const extractAssetIdFromUri = (uri = "") => {
    if (!uri || typeof uri !== "string") return null;
    if (uri.startsWith("ph://")) return uri.slice("ph://".length);
    if (uri.startsWith("assets-library://")) return uri;
    return null;
};

async function resolveAssetUri(asset) {
    const originalUri = typeof asset?.uri === "string" ? asset.uri : "";
    if (isFetchableUri(originalUri)) return originalUri;

    await ensureMediaPermissions();

    const candidates = [];
    if (typeof asset?.assetId === "string" && asset.assetId) candidates.push(asset.assetId);
    if (typeof asset?.id === "string" && asset.id) candidates.push(asset.id);
    const inferred = extractAssetIdFromUri(originalUri);
    if (inferred) candidates.push(inferred);

    for (const candidate of candidates) {
        try {
            const info = await MediaLibrary.getAssetInfoAsync(candidate, { shouldDownloadFromNetwork: true });
            const localUri = info?.localUri || info?.uri;
            if (isFetchableUri(localUri)) return localUri;
        } catch (error) {
            console.warn("uploadMediaAssets: failed to resolve asset", candidate, error?.message || error);
        }
    }

    const err = new Error("Unable to access selected media locally");
    err.code = "UNRESOLVED_ASSET_URI";
    throw err;
}

const guessExtension = (asset, resolvedUri) => {
    const fromName = extFromUri(asset?.fileName);
    const fromResolved = extFromUri(resolvedUri);
    const fromOriginal = extFromUri(asset?.uri);
    return fromName || fromResolved || fromOriginal || "";
};

const decodeBase64ToUint8 = (base64) => {
    if (typeof GLOBAL_OBJ.atob === "function") {
        const binary = GLOBAL_OBJ.atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    if (typeof Buffer !== "undefined") {
        const buf = Buffer.from(base64, "base64");
        return buf instanceof Uint8Array ? buf : Uint8Array.from(buf);
    }
    throw new Error("Base64 decode not available");
};

const needsJpegTranscode = (ext, mimeType = "") => {
    const loweredExt = typeof ext === "string" ? ext.toLowerCase() : "";
    const loweredMime = typeof mimeType === "string" ? mimeType.toLowerCase() : "";
    if (LOSSY_IMAGE_EXTS.has(loweredExt)) return true;
    return loweredMime.includes("image/heic") || loweredMime.includes("image/heif");
};

const shouldResizeImage = (width, height, maxDimension = MAX_IMAGE_DIMENSION) => {
    const w = Number(width);
    const h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h)) return false;
    return Math.max(w, h) > maxDimension;
};

const buildResizeAction = (width, height) => {
    if (!shouldResizeImage(width, height)) return null;
    const w = Number(width);
    const h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
    if (w >= h) {
        return { width: MAX_IMAGE_DIMENSION };
    }
    return { height: MAX_IMAGE_DIMENSION };
};

const processImageToStandardJpeg = async ({ uri, width, height, mimeType, ext }) => {
    const resize = buildResizeAction(width, height);
    const forceJpeg = needsJpegTranscode(ext, mimeType);
    if (!forceJpeg && !resize) return null;

    try {
        const actions = [];
        if (resize) actions.push({ resize });
        const result = await ImageManipulator.manipulateAsync(
            uri,
            actions,
            {
                compress: JPEG_COMPRESS_QUALITY,
                format: ImageManipulator.SaveFormat.JPEG,
                base64: true,
            }
        );
        if (!result?.base64) return null;
        return {
            uri: result.uri || uri,
            width: result.width || width || null,
            height: result.height || height || null,
            bytes: decodeBase64ToUint8(result.base64),
            mimeType: DEFAULTS.imageMime,
            ext: DEFAULTS.imageExt,
        };
    } catch (error) {
        console.warn("uploadMediaAssets: image processing failed", error?.message || error);
        return null;
    }
};

const readAssetBytes = async (uri) => {
    try {
        const res = await fetch(uri);
        if (!res.ok) {
            const err = new Error(`Failed to read asset (${res.status})`);
            err.code = "ASSET_READ_FAILED";
            throw err;
        }
        const buffer = await res.arrayBuffer();
        return new Uint8Array(buffer);
    } catch (error) {
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            return decodeBase64ToUint8(base64);
        } catch (fsError) {
            const err = new Error("Failed to load asset bytes");
            err.code = "ASSET_READ_FAILED";
            err.cause = fsError;
            throw err;
        }
    }
};

const safeContentType = (explicit, kind, fileExt) => {
    if (typeof explicit === "string" && explicit.trim()) return explicit;
    if (kind === "video") {
        return fileExt && fileExt !== "mp4" ? `video/${fileExt}` : DEFAULTS.videoMime;
    }
    return fileExt && fileExt !== "jpg" ? `image/${fileExt}` : DEFAULTS.imageMime;
};

const buildStoragePath = ({ cid, uid, timestamp, index, ext }) =>
    `messages/${cid}/${uid}/${timestamp}_${index}.${ext}`;

async function uploadSingleAsset({ asset, cid, uid, index, timestamp, allowVideos }) {
    const { type, mimeType, width, height, duration } = asset || {};
    const rawType = typeof type === "string" ? type.toLowerCase() : "";
    const rawMime = typeof mimeType === "string" ? mimeType.toLowerCase() : "";
    const isVideo = rawType.includes("video") || rawMime.startsWith("video/");
    const kind = isVideo ? "video" : "image";

    if (!allowVideos && kind === "video") {
        const err = new Error("Video attachments are not permitted in chat.");
        err.code = "VIDEO_NOT_ALLOWED";
        throw err;
    }

    const resolvedUri = await resolveAssetUri(asset);
    const extGuess = guessExtension(asset, resolvedUri);
    let fileExt = extGuess || (kind === "video" ? DEFAULTS.videoExt : DEFAULTS.imageExt);
    let contentType = safeContentType(mimeType, kind, fileExt);
    let finalWidth = Number(width) || null;
    let finalHeight = Number(height) || null;
    let payloadBytes = null;
    let uploadUri = resolvedUri;

    if (kind === "image") {
        const processed = await processImageToStandardJpeg({
            uri: resolvedUri,
            width,
            height,
            mimeType,
            ext: fileExt,
        });
        if (processed?.bytes?.length) {
            payloadBytes = processed.bytes;
            uploadUri = processed.uri || resolvedUri;
            fileExt = processed.ext || DEFAULTS.imageExt;
            contentType = processed.mimeType || DEFAULTS.imageMime;
            finalWidth = processed.width || finalWidth;
            finalHeight = processed.height || finalHeight;
        }
    }

    if (!payloadBytes) {
        payloadBytes = await readAssetBytes(uploadUri);
    }

    if (!payloadBytes || payloadBytes.length === 0) {
        const err = new Error("Asset payload is empty");
        err.code = "ASSET_EMPTY";
        throw err;
    }

    const storagePath = buildStoragePath({ cid, uid, timestamp, index, ext: fileExt });

    const storageRef = ref(storage, storagePath);
    await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, payloadBytes, { contentType });
        task.on("state_changed", undefined, (error) => reject(error), () => resolve(task.snapshot));
    });

    const url = await getDownloadURL(storageRef);
    return {
        url,
        storagePath,
        mimeType: contentType,
        width: finalWidth,
        height: finalHeight,
        duration: duration || null,
        type: kind,
    };
}

/**
 * Upload an array of expo-image-picker assets to Firebase Storage.
 * Returns array of media objects:
 *  {
 *    url, storagePath, mimeType, width, height, duration?, type: 'image'|'video', thumbnailUrl?
 *  }
 */
export default async function uploadMediaAssets({ cid, uid, assets, allowVideos = false }) {
    const list = sanitizeAssets(assets);
    if (!list.length) return [];

    const timestamp = Date.now();
    return Promise.all(
        list.map((asset, index) =>
            uploadSingleAsset({
                asset,
                cid,
                uid,
                index,
                timestamp,
                allowVideos,
            })
        )
    );
}
