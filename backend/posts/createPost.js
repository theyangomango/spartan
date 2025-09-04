import createDoc from '../helper/firebase/createDoc'

// images: legacy array of URLs
// media: [{ uri, type: 'image' | 'video' }]
export default async function createPost(uid, handle, pfp, caption, media, pid, workout) {
    // Backwards compatibility: if caller passed plain URL array, convert to media objects
    const normalizedMedia = Array.isArray(media)
        ? (typeof media[0] === 'string'
            ? media.map((u) => ({ uri: u, type: 'image' }))
            : media)
        : [];

    await createDoc('posts', pid, {
        pid: pid,
        uid: uid,
        handle: handle,
        pfp: pfp,
        created: Date.now(),
        caption: caption,
        workout: workout,
        media: normalizedMedia,
        likes: [],
        comments: [
            {
                content: caption, 
                handle: handle,
                isCaption: true,
                pfp: pfp,
                timestamp: Date.now(),
                uid: uid
            }
        ],
        tagged: [], // Todo
        tags: [], // Todo
        likeCount: 0,
        commentCount: 0,
        shareCount: 0
    });
}
