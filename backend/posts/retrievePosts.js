import readDoc from "../helper/firebase/readDoc";

export default async function retrievePosts(pids) {
    let posts = [];
    for (pid of pids) {
        let postData = await readDoc('posts', pid);
        posts.push(postData);
    }

    return posts;
}