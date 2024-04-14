import { createDoc } from "../helper/createDoc";
import makeID from "../helper/makeID";

export default async function createStory(uid, image) {
    let sid = makeID();
    createDoc('stories', sid, {
        sid: sid,
        uid: uid,
        created: Date.now(),
        image: image, // Todo - upload images to Firebase Storage
        likes: [],
        tagged: [], // Todo
        likeCount: 0
    });
}