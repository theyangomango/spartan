import arrayAppend from "../helper/firebase/arrayAppend";
import incrementDocValue from "../helper/firebase/incrementDocValue";

export async function appendComment(pid, uid, content) {
    incrementDocValue('posts', pid, 'commentCount');
    arrayAppend('posts', pid, 'comments', {
        uid: uid,
        content: content,
        timestamp: Date.now()
    });
}