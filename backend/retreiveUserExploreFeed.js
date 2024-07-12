import readDoc from "./helper/firebase/readDoc";
import retrievePosts from "./posts/retrievePosts";

export default async function retrieveUserExploreFeed(userData) {
    let db_posts = await retrievePosts(userData.exploreFeedPosts);
    return db_posts;
}