// Resolves a picked video to a local file ready for upload: file URI, extension, mime type and size.
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import makeID from '../../../../backend/helper/makeID';

export async function ensureVideoAsset(entry) {
    if (!entry) return null;

    const ensureFileScheme = (uri) => (uri && uri.startsWith('file://') ? uri : null);
    let assetInfo = null;
    const loadAssetInfo = async () => {
        if (assetInfo || !entry.assetId) return assetInfo;
        try {
            assetInfo = await MediaLibrary.getAssetInfoAsync(entry.assetId);
        } catch (error) {
            console.warn('[PostUploadOptions] getAssetInfoAsync failed', error);
            assetInfo = null;
        }
        return assetInfo;
    };

    let sourceUri = entry.localUri || entry.uri || null;
    let fileUri = ensureFileScheme(sourceUri);

    if (!fileUri && entry.assetId) {
        const info = await loadAssetInfo();
        if (info?.localUri) {
            fileUri = ensureFileScheme(info.localUri);
            if (!fileUri) {
                sourceUri = info.localUri;
            }
        }
    }

    let fallbackUri = fileUri ? null : sourceUri;

    const withoutQuery = (sourceUri || '').split('?')[0];
    let ext = (withoutQuery.match(/\.([a-zA-Z0-9]+)$/)?.[1] || '').toLowerCase();
    if (!ext && entry.assetId) {
        const info = await loadAssetInfo();
        if (info?.filename) {
            const parts = info.filename.split('.');
            const candidate = parts[parts.length - 1];
            if (candidate) ext = candidate.toLowerCase();
        }
    }
    if (!ext) ext = 'mp4';
    const normalizedExt = ['mp4', 'mov', 'm4v'].includes(ext) ? ext : 'mp4';

    if (!fileUri && fallbackUri) {
        const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || FileSystem.temporaryDirectory;
        if (!cacheDir) throw new Error('No cache directory available for video upload');
        const tempTarget = `${cacheDir}upload-video-${makeID()}.${normalizedExt}`;
        const isRemote = /^https?:\/\//i.test(fallbackUri);
        try {
            if (isRemote) {
                const download = await FileSystem.downloadAsync(fallbackUri, tempTarget);
                fileUri = download?.uri || tempTarget;
            } else {
                await FileSystem.copyAsync({ from: fallbackUri, to: tempTarget });
                fileUri = tempTarget;
            }
        } catch (error) {
            console.warn('[PostUploadOptions] copyAsync failed for video', error);
            fileUri = ensureFileScheme(fallbackUri);
        }
    }

    if (!fileUri) {
        throw new Error('Unable to resolve local video path for upload');
    }

    const info = await FileSystem.getInfoAsync(fileUri).catch(() => null);
    const size = typeof info?.size === 'number' ? info.size : null;

    let mime = entry?.mime || entry?.mimeType || null;
    if (!mime) {
        if (normalizedExt === 'mov') mime = 'video/quicktime';
        else mime = `video/${normalizedExt === 'm4v' ? 'mp4' : normalizedExt}`;
    }

    return {
        fileUri,
        ext: normalizedExt,
        mime,
        size,
    };
}

// Two variants on purpose (composer, clip builder): log tags, error text, 0-byte size and mime rules differ.
export async function ensureClipVideoAsset(entry) {
    if (!entry) return null;

    const ensureFileScheme = (uri) => (uri && uri.startsWith('file://') ? uri : null);
    let assetInfo = null;
    const loadAssetInfo = async () => {
        if (assetInfo || !entry.assetId) return assetInfo;
        try {
            assetInfo = await MediaLibrary.getAssetInfoAsync(entry.assetId);
        } catch (error) {
            console.warn('[ClipBuilder] getAssetInfoAsync failed', error);
            assetInfo = null;
        }
        return assetInfo;
    };

    let sourceUri = entry.localUri || entry.uri || null;
    let fileUri = ensureFileScheme(sourceUri);

    if (!fileUri && entry.assetId) {
        const info = await loadAssetInfo();
        if (info?.localUri) {
            fileUri = ensureFileScheme(info.localUri);
            if (!fileUri) {
                sourceUri = info.localUri;
            }
        }
    }

    let fallbackUri = fileUri ? null : sourceUri;

    const withoutQuery = (sourceUri || '').split('?')[0];
    let ext = (withoutQuery.match(/\.([a-zA-Z0-9]+)$/)?.[1] || '').toLowerCase();
    if (!ext && entry.assetId) {
        const info = await loadAssetInfo();
        if (info?.filename) {
            const parts = info.filename.split('.');
            const candidate = parts[parts.length - 1];
            if (candidate) ext = candidate.toLowerCase();
        }
    }
    if (!ext) ext = 'mp4';
    const normalizedExt = ['mp4', 'mov', 'm4v'].includes(ext) ? ext : 'mp4';

    if (!fileUri && fallbackUri) {
        const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || FileSystem.temporaryDirectory;
        if (!cacheDir) throw new Error('No cache directory available for video upload');
        const tempTarget = `${cacheDir}upload-video-${makeID()}.${normalizedExt}`;
        const isRemote = /^https?:\/\//i.test(fallbackUri);
        try {
            if (isRemote) {
                const download = await FileSystem.downloadAsync(fallbackUri, tempTarget);
                fileUri = download?.uri || tempTarget;
            } else {
                await FileSystem.copyAsync({ from: fallbackUri, to: tempTarget });
                fileUri = tempTarget;
            }
        } catch (error) {
            console.warn('[ClipBuilder] copyAsync failed for video', error);
            fileUri = ensureFileScheme(fallbackUri);
        }
    }

    if (!fileUri) {
        throw new Error('Unable to resolve video file for upload');
    }

    const info = await FileSystem.getInfoAsync(fileUri).catch(() => null);
    const size = info?.size && Number.isFinite(info.size) ? info.size : null;
    const mime = normalizedExt === 'mov' ? 'video/quicktime' : 'video/mp4';

    return {
        fileUri,
        ext: normalizedExt,
        mime,
        size,
    };
}
