// Pure helpers of the post composer: media entry normalisation, signature and remote-URL test.

export const mediaSignatureFor = (entry) => {
    if (!entry) return 'null';
    const type = entry.type || 'image';
    const uri = typeof entry.uri === 'string' ? entry.uri : JSON.stringify(entry.uri || '');
    const crop = entry?.cropRect;
    let cropKey = '';
    if (crop && typeof crop === 'object') {
        const { x = 0, y = 0, width = 1, height = 1 } = crop;
        cropKey = `:${Number(x).toFixed(4)}-${Number(y).toFixed(4)}-${Number(width).toFixed(4)}-${Number(height).toFixed(4)}`;
    }
    return `${type}:${uri}${cropKey}`;
};

export const normalizeMediaSelectionEntry = (entry) => {
    if (!entry) return null;
    if (typeof entry === 'string') {
        return {
            uri: entry,
            previewUri: entry,
            originalUri: entry,
            localUri: entry.startsWith('file://') ? entry : null,
            type: 'image',
            duration: 0,
            assetId: null,
            cropRect: null,
        };
    }
    if (typeof entry === 'object') {
        const uri = entry.uri || entry.url || entry.image || entry.path || null;
        if (!uri) return null;
        const typeSource = entry.type
            || entry.mediaType
            || entry.kind
            || entry.mime
            || entry.mimeType
            || entry.contentType
            || entry.fileType
            || 'image';
        const normalizedType = String(typeSource).toLowerCase().includes('video') ? 'video' : 'image';
        const previewUri = entry.previewUri || uri;
        const originalUri = entry.originalUri || uri;
        const localUri = entry.localUri || (uri.startsWith('file://') ? uri : null);
        const assetId = entry.assetId || entry.id || null;
        const width = typeof entry.width === 'number' ? entry.width : null;
        const height = typeof entry.height === 'number' ? entry.height : null;
        return {
            uri,
            previewUri,
            originalUri,
            localUri,
            type: normalizedType,
            duration: Number(entry.duration) || 0,
            assetId,
            cropRect: entry.cropRect || null,
            width,
            height,
            aspectRatio: typeof entry.aspectRatio === 'number'
                ? entry.aspectRatio
                : (width && height ? width / height : null),
            isClip: Boolean(entry.isClip),
        };
    }
    return null;
};

export const normalizeMediaList = (list) => {
    if (!Array.isArray(list)) return [];
    const normalized = [];
    list.forEach((entry) => {
        const item = normalizeMediaSelectionEntry(entry);
        if (!item) return;
        normalized.push(item);
    });
    return normalized;
};

export const isRemoteUri = (uri) => /^https?:\/\//i.test(String(uri || ''));
