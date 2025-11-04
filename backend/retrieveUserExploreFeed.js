import readDoc from "./helper/firebase/readDoc";
import getReverse from "./helper/getReverse";
import retrievePosts from "./posts/retrievePosts";

export default async function retrieveUserExploreFeed(userData) {
    const explorePostsDoc = await readDoc('global', 'explorePosts').catch(() => null);
    const pids = Array.isArray(explorePostsDoc?.PIDs) ? explorePostsDoc.PIDs : [];
    if (!pids.length) {
        return [];
    }
    const db_posts = await retrievePosts(getReverse(pids));
    return db_posts;
}
