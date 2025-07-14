import readDoc from "./helper/firebase/readDoc";
import getReverse from "./helper/getReverse";
import retrievePosts from "./posts/retrievePosts";

// 1. 🔹 Get all stories
export async function getUserStories(userData) {
    const db_stories = [];

    for (const user of userData.feedStories) {
        for (const sid of user.stories) {
            const storyData = await readDoc('stories', sid);
            db_stories.push(storyData);
        }
    }

    return {
        storiesData: db_stories,
        storiesUserList: userData.feedStories
    };
}

// 2. 🔹 Get posts from global.post list (reversed)
export async function getUserPosts() {
    const postsDoc = await readDoc('global', 'posts');
    const db_posts = await retrievePosts(getReverse(postsDoc.PIDs));
    return db_posts;
}

// 3. 🔹 Get user's message threads
export async function getUserMessages(userData) {
    const db_messages = [];

    for (const msg of userData.messages) {
        const messageData = await readDoc('messages', msg.mid);
        db_messages.push(messageData);
    }

    return db_messages;
}

// 🔄 Main orchestrator
export default async function getUserFeed(userData) {
    const stories = await getUserStories(userData);
    const posts = await getUserPosts();
    const messages = await getUserMessages(userData);

    return [stories, posts, messages];
}
