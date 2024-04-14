import { incrementDocValue } from "../helper/incrementDocValue";
import { arrayErase } from "../helper/arrayErase";

export async function unlikePost(pid, uid) {
    incrementDocValue('posts', pid, 'likeCount', -1);
    arrayErase('posts', pid, 'likes', {
        uid: uid,
    });
}