// Pure helpers of the media picker: normalise the selection handed in by the composer.

const normalizeSelectionEntry = (entry, index = 0) => {
    if (!entry) return null;
    if (typeof entry === 'string') {
        return {
            assetId: null,
            originalUri: entry,
            uri: entry,
            previewUri: entry,
            localUri: entry.startsWith('file://') ? entry : null,
            type: 'image',
            duration: 0,
            cropRect: null,
        };
    }
    if (typeof entry === 'object') {
        const uri = entry.uri || entry.url || entry.image || entry.path || null;
        if (!uri) return null;
        const type = entry.type === 'video' ? 'video' : 'image';
        const originalUri = entry.originalUri || uri;
        const previewUri = entry.previewUri || uri;
        const localUri = entry.localUri || (uri.startsWith('file://') ? uri : null);
        const assetId = entry.assetId || entry.id || `initial-${index}-${originalUri}`;
        return {
            assetId,
            originalUri,
            uri,
            previewUri,
            localUri,
            type,
            duration: Number(entry.duration) || 0,
            cropRect: entry.cropRect || null,
        };
    }
    return null;
};

export const normalizeInitialSelection = (list) => {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const normalized = [];
    list.forEach((entry, idx) => {
        const item = normalizeSelectionEntry(entry, idx);
        if (!item) return;
        const key = item.assetId || item.originalUri || item.uri || `index-${idx}`;
        if (seen.has(key)) return;
        seen.add(key);
        normalized.push(item);
    });
    return normalized;
};
