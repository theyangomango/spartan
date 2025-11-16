export const isClipPost = (post) => {
    if (!post) return false;
    const postType = typeof post.type === 'string' ? post.type.toLowerCase() : '';
    if (postType === 'clip' || postType === 'reel') return true;
    const mediaList = Array.isArray(post?.media) ? post.media : [];
    return mediaList.some((entry) => {
        if (!entry) return false;
        if (entry.isClip) return true;
        const entryType = typeof entry.type === 'string' ? entry.type.toLowerCase() : '';
        return entryType === 'clip';
    });
};

export const getPrimaryVideoEntry = (post) => {
    if (!post) return null;
    const mediaList = Array.isArray(post?.media) ? post.media : [];
    if (!mediaList.length) return null;
    const entry = mediaList.find((item) => {
        if (!item) return false;
        const entryType = typeof item.type === 'string' ? item.type.toLowerCase() : '';
        return entryType === 'video' || entryType === 'clip' || item.isClip;
    });
    return entry || null;
};

export default {
    isClipPost,
    getPrimaryVideoEntry,
};
