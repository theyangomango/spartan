import createDoc from '../helper/firebase/createDoc'
import makeID from '../helper/makeID'

export default async function createPost(uid, caption, images, id, wid = null) {
    console.log(uid, caption, images, wid);
    createDoc('posts', pid, {
        pid: id,
        uid: uid,
        created: Date.now(),
        caption: caption,
        wid: wid,
        images: images, // Todo - upload images to Firebase Storage
        likes: [],
        comments: [],
        tagged: [], // Todo
        tags: [], // Todo
        likeCount: 0,
        commentCount: 0
    });
}