import createDoc from '../helper/firebase/createDoc'

export default async function createPost(uid, handle, pfp, caption, images, pid, workout) {
    await createDoc('posts', pid, {
        pid: pid,
        uid: uid,
        handle: handle,
        pfp: pfp,
        created: Date.now(),
        caption: caption,
        workout: workout,
        images: images,
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