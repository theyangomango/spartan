import { incrementDocValue } from "../helper/incrementDocValue";
import { arrayAppend } from "../helper/arrayAppend";

export async function likeStory(sid, uid) {
    incrementDocValue('stories', sid, 'likeCount');
    arrayAppend('stories', sid, 'likes', {
        uid: uid,
    });
}