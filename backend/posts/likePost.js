import incrementDocValue from "../helper/firebase/incrementDocValue";
import arrayAppend from "../helper/firebase/arrayAppend";

export async function likePost(pid, uid) {
    incrementDocValue('posts', pid, 'likeCount');
    arrayAppend('posts', pid, 'likes', uid);
}