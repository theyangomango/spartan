import { incrementDocValue } from "../helper/incrementDocValue";
import { arrayAppend } from "../helper/arrayAppend";

export async function likePost(pid, uid) {
    incrementDocValue('posts', pid, 'likeCount');
    arrayAppend('posts', pid, 'likes', {
        uid: uid,
    });
}