import { incrementDocValue } from "../helper/incrementDocValue";
import { arrayErase } from "../helper/arrayErase";

export async function unlikeStory(sid, uid) {
    incrementDocValue('stories', sid, 'likeCount', -1);
    arrayErase('stories', sid, 'likes', {
        uid: uid,
    });
}