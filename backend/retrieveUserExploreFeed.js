import readDoc from "./helper/firebase/readDoc";
import getReverse from "./helper/getReverse";
import retrievePosts from "./posts/retrievePosts";

export default async function retrieveUserExploreFeed(userData) {
    let explorePostsDoc = await readDoc('global', 'explorePosts');
    let db_posts = await retrievePosts(getReverse(explorePostsDoc.PIDs));
    return db_posts;
}