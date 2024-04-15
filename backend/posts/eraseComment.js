import { arrayErase } from "../helper/firebase/arrayErase";

export async function eraseComment(pid, commentObject) {
    arrayErase('posts', pid, 'comments', commentObject);
}