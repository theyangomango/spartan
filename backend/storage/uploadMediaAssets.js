// backend/storage/uploadMediaAssets.js
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase.config";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";

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

async function uploadSingleAsset({ asset, cid, uid, index, timestamp }) {
    const { type, mimeType, width, height, duration } = asset || {};
    const resolvedUri = await resolveAssetUri(asset);
    const kind = type === "video" ? "video" : "image";
    const extGuess = guessExtension(asset, resolvedUri);
    const fileExt = extGuess || (kind === "video" ? DEFAULTS.videoExt : DEFAULTS.imageExt);
    const contentType = safeContentType(mimeType, kind, fileExt);
    const storagePath = buildStoragePath({ cid, uid, timestamp, index, ext: fileExt });

    const bytes = await readAssetBytes(resolvedUri);
    if (!bytes || bytes.length === 0) {
        const err = new Error("Asset payload is empty");
        err.code = "ASSET_EMPTY";
        throw err;
    }

    const storageRef = ref(storage, storagePath);
    await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, bytes, { contentType });
        task.on("state_changed", undefined, (error) => reject(error), () => resolve(task.snapshot));
    });

    const url = await getDownloadURL(storageRef);
    return {
        url,
        storagePath,
        mimeType: contentType,
        width: width || null,
        height: height || null,
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
export default async function uploadMediaAssets({ cid, uid, assets }) {
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
            })
        )
    );
}
