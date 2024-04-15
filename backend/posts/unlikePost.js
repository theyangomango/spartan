import { incrementDocValue } from "../helper/firebase/incrementDocValue";
import { arrayErase } from "../helper/firebase/arrayErase";

export async function unlikePost(pid, uid) {
    incrementDocValue('posts', pid, 'likeCount', -1);
    arrayErase('posts', pid, 'likes', {
        uid: uid,
    });
}