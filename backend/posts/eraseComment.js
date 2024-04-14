import { arrayErase } from "../helper/arrayErase";

export async function eraseComment(pid, commentObject) {
    arrayErase('posts', pid, 'comments', commentObject);
}