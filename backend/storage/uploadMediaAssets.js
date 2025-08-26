// backend/storage/uploadMediaAssets.js
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase.config";

// util: extract filename ext from uri
const extFromUri = (uri = "") => {
    const q = uri.split("?")[0];
    const dot = q.lastIndexOf(".");
    return dot > -1 ? q.slice(dot + 1).toLowerCase() : "dat";
};

// convert asset to blob
async function uriToBlob(uri) {
    const res = await fetch(uri);
    return await res.blob();
}

/**
 * Upload an array of expo-image-picker assets to Firebase Storage.
 * Returns array of media objects:
 *  {
 *    url, storagePath, mimeType, width, height, duration?, type: 'image'|'video', thumbnailUrl?
 *  }
 */
export default async function uploadMediaAssets({ cid, uid, assets }) {
    const now = Date.now();

    const uploaded = await Promise.all(
        assets.map(async (asset, i) => {
            const { uri, type, mimeType, width, height, duration } = asset;
            const ext = extFromUri(uri);
            const kind = type === "video" ? "video" : "image";
            const path = `messages/${cid}/${uid}/${now}_${i}.${ext}`;

            const blob = await uriToBlob(uri);
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, blob, {
                contentType: mimeType || (kind === "video" ? `video/${ext}` : `image/${ext}`),
            });
            const url = await getDownloadURL(storageRef);

            return {
                url,
                storagePath: path,
                mimeType: mimeType || (kind === "video" ? `video/${ext}` : `image/${ext}`),
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
