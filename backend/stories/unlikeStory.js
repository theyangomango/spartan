import { incrementDocValue } from "../helper/firebase/incrementDocValue";
import { arrayErase } from "../helper/firebase/arrayErase";

export async function unlikeStory(sid, uid) {
    incrementDocValue('stories', sid, 'likeCount', -1);
    arrayErase('stories', sid, 'likes', {
        uid: uid,
    });
}