import { incrementDocValue } from "../helper/firebase/incrementDocValue";
import { arrayAppend } from "../helper/firebase/arrayAppend";

export async function likeStory(sid, uid) {
    incrementDocValue('stories', sid, 'likeCount');
    arrayAppend('stories', sid, 'likes', {
        uid: uid,
    });
}