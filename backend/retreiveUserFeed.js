import readDoc from "./helper/firebase/readDoc";
import retrievePosts from "./posts/retrievePosts";

export default async function retrieveUserFeed(userData) {
    let db_stories = [];
    for (sid of userData.feedStories) {
        let storyData = await readDoc('stories', sid);
        db_stories.push(storyData);
    }

    let db_posts = await retrievePosts(userData.feedPosts);
    // let db_posts = [];
    // for (pid of userData.feedPosts) {
    //     let postData = await readDoc('posts', pid);
    //     db_posts.push(postData);
    // }

    let db_messages = [];
    for (mid of userData.messages) {
        let messageData = await readDoc('messages', mid);
        db_messages.push(messageData);
    }

    let feedData = [db_stories, db_posts, db_messages];
    return feedData;
}