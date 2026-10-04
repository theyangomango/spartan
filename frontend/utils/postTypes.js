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
