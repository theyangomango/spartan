import createDoc from '../helper/firebase/createDoc'

// images: legacy array of URLs
// media: [{ uri, type: 'image' | 'video' }]
export default async function createPost(uid, handle, pfp, caption, media, pid, workout) {
    const now = Date.now();

    // Backwards compatibility: if caller passed plain URL array, convert to media objects
    const normalizedMedia = Array.isArray(media)
        ? (typeof media[0] === 'string'
            ? media.map((u) => ({ uri: u, type: 'image' }))
            : media)
        : [];

    const workoutPayload = workout && typeof workout === 'object'
        ? {
            ...workout,
            postPid: pid,
            pid: workout?.pid ?? pid,
        }
        : null;

    const comments = caption
        ? [
            {
                content: caption,
                handle,
                isCaption: true,
                pfp,
                timestamp: now,
                uid,
            },
        ]
        : [];

    const payload = {
        pid: pid,
        uid: uid,
        handle: handle,
        pfp: pfp,
        created: now,
        caption: caption,
        workout: workoutPayload,
        media: normalizedMedia,
        likes: [],
        comments: comments,
        tagged: [], // Todo
        tags: [], // Todo
        likeCount: 0,
        commentCount: comments.length,
        shareCount: 0,
    };

    const workoutWid = workoutPayload?.wid ?? workoutPayload?.id;
    if (workoutWid !== undefined && workoutWid !== null) {
        payload.workoutWid = String(workoutWid);
    }

    await createDoc('posts', pid, payload);
}
