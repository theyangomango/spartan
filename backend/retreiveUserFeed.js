import readDoc from "./helper/firebase/readDoc";
import getReverse from "./helper/getReverse";
import retrievePosts from "./posts/retrievePosts";

export default async function retrieveUserFeed(userData) {
    let db_stories = [];
    for (user of userData.feedStories) {
        for (sid of user.stories) {
            let storyData = await readDoc('stories', sid);
            db_stories.push(storyData);
        }
    }

    let db_posts = await retrievePosts(getReverse(userData.feedPosts));
    
    // let db_posts = [];
    // for (pid of userData.feedPosts) {
    //     let postData = await readDoc('posts', pid);
    //     db_posts.push(postData);
    // }

    let db_messages = [];
    for (msg of userData.messages) {
        let messageData = await readDoc('messages', msg.mid);
        db_messages.push(messageData);
    }

    let feedData = [{storiesData: db_stories, storiesUserList: userData.feedStories}, db_posts, db_messages];
    return feedData;
}