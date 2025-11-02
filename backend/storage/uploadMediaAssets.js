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

const isFetchableUri = (uri = "") => {
    if (typeof uri !== "string" || !uri) return false;
    return FETCHABLE_SCHEMES.some((scheme) => uri.startsWith(scheme));
};

// util: extract filename ext from uri
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
            const info = await MediaLibrary.getAssetInfoAsync(candidate, {
                shouldDownloadFromNetwork: true,
            });
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
    return fromName || fromResolved || fromOriginal || "dat";
};

const base64ToUint8Array = (base64) => {
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
            return base64ToUint8Array(base64);
        } catch (fsError) {
            const err = new Error("Failed to load asset bytes");
            err.code = "ASSET_READ_FAILED";
            err.cause = fsError;
            throw err;
        }
    }
};

/**
 * Upload an array of expo-image-picker assets to Firebase Storage.
 * Returns array of media objects:
 *  {
 *    url, storagePath, mimeType, width, height, duration?, type: 'image'|'video', thumbnailUrl?
 *  }
 */
export default async function uploadMediaAssets({ cid, uid, assets }) {
    const now = Date.now();
    const list = Array.isArray(assets) ? assets.filter((a) => a && (a.uri || a.assetId || a.id)) : [];

    const uploaded = await Promise.all(
        list.map(async (asset, i) => {
            const { type, mimeType, width, height, duration } = asset || {};
            const resolvedUri = await resolveAssetUri(asset);
            const ext = guessExtension(asset, resolvedUri);
            const kind = type === "video" ? "video" : "image";
            const defaultExt = kind === "video" ? "mp4" : "jpg";
            const fileExt = ext && ext !== "dat" ? ext : defaultExt;
            const contentType =
                mimeType ||
                (kind === "video"
                    ? `video/${fileExt === "jpg" ? "mp4" : fileExt}`
                    : `image/${fileExt === "jpg" ? "jpeg" : fileExt}`);
            const path = `messages/${cid}/${uid}/${now}_${i}.${fileExt}`;

            const fallbackContentType = kind === "video" ? "video/mp4" : "image/jpeg";
            const safeContentType =
                typeof contentType === "string" && contentType.trim()
                    ? contentType
                    : fallbackContentType;
            let bytes;
            try {
                bytes = await readAssetBytes(resolvedUri);
            } catch (error) {
                const err = new Error("Unable to read media file");
                err.code = "ASSET_READ_FAILED";
                err.cause = error;
                throw err;
            }

            if (!bytes || bytes.length === 0) {
                const err = new Error("Asset payload is empty");
                err.code = "ASSET_EMPTY";
                throw err;
            }

            const metadata = { contentType: safeContentType };
            const storageRef = ref(storage, path);
            await new Promise((resolve, reject) => {
                const task = uploadBytesResumable(storageRef, bytes, metadata);
                task.on(
                    "state_changed",
                    undefined,
                    (error) => reject(error),
                    () => resolve(task.snapshot)
                );
            });
            bytes = null;
            const url = await getDownloadURL(storageRef);

            return {
                url,
                storagePath: path,
                mimeType: safeContentType,
                width: width || null,
                height: height || null,
                duration: duration || null,
                type: kind, // 'image' | 'video'
                // thumbnailUrl: ... // optional: generate via Cloud Function or client-side later
            };
        })
    );

    return uploaded;
}
